import { createClient } from "@/lib/supabase/client";
import type { UUID } from "@/types";
import type { BodyGoal, BodyGoalType, BodyMeasurement, BodyProgressSnapshot } from "../types";

type GoalRow = {
  user_id: string;
  goal_type: BodyGoalType;
  target_weight_kg: number | string | null;
  height_cm: number | string | null;
  target_date: string | null;
  weigh_in_interval_days: number;
  created_at: string;
  updated_at: string;
};

type MeasurementRow = {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | string;
  body_fat_percentage: number | string | null;
  waist_cm: number | string | null;
  note: string;
  created_at: string;
};

function numeric(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapGoal(row: GoalRow): BodyGoal {
  return {
    userId: row.user_id,
    goalType: row.goal_type,
    targetWeightKg: numeric(row.target_weight_kg),
    heightCm: numeric(row.height_cm),
    targetDate: row.target_date,
    weighInIntervalDays: row.weigh_in_interval_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMeasurement(row: MeasurementRow): BodyMeasurement {
  return {
    id: row.id,
    userId: row.user_id,
    measuredAt: row.measured_at,
    weightKg: Number(row.weight_kg),
    bodyFatPercentage: numeric(row.body_fat_percentage),
    waistCm: numeric(row.waist_cm),
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function fetchBodyProgress(userId: UUID): Promise<BodyProgressSnapshot> {
  const supabase = createClient();
  const [
    { data: goalData, error: goalError },
    { data: measurementData, error: measurementError },
    { data: startData, error: startError },
  ] = await Promise.all([
    supabase.from("user_body_goals").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("body_measurements").select("*").eq("user_id", userId).order("measured_at", { ascending: false }).limit(24),
    supabase.from("body_measurements").select("*").eq("user_id", userId).order("measured_at", { ascending: true }).limit(1).maybeSingle(),
  ]);

  if (goalError) throw new Error(goalError.message);
  if (measurementError) throw new Error(measurementError.message);
  if (startError) throw new Error(startError.message);

  const goal = goalData ? mapGoal(goalData as GoalRow) : null;
  const measurements = (measurementData ?? []).map((row) => mapMeasurement(row as MeasurementRow));
  const latest = measurements[0] ?? null;
  const previous = measurements[1] ?? null;
  // Keep the true first measurement even after the chart window exceeds 24 readings.
  const start = startData ? mapMeasurement(startData as MeasurementRow) : null;
  const nextWeighInAt = latest && goal
    ? new Date(new Date(latest.measuredAt).getTime() + goal.weighInIntervalDays * 86_400_000).toISOString()
    : null;

  return { goal, measurements, latest, previous, start, nextWeighInAt };
}

export interface SaveBodyGoalInput {
  goalType: BodyGoalType;
  targetWeightKg: number | null;
  heightCm: number | null;
  targetDate: string | null;
  weighInIntervalDays: number;
}

export async function saveBodyGoal(userId: UUID, input: SaveBodyGoalInput): Promise<BodyGoal> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_body_goals")
    .upsert({
      user_id: userId,
      goal_type: input.goalType,
      target_weight_kg: input.targetWeightKg,
      height_cm: input.heightCm,
      target_date: input.targetDate,
      weigh_in_interval_days: input.weighInIntervalDays,
    }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapGoal(data as GoalRow);
}

export interface AddBodyMeasurementInput {
  weightKg: number;
  bodyFatPercentage?: number | null;
  waistCm?: number | null;
  note?: string;
  measuredAt?: string;
}

export async function addBodyMeasurement(userId: UUID, input: AddBodyMeasurementInput): Promise<BodyMeasurement> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("body_measurements")
    .insert({
      user_id: userId,
      weight_kg: input.weightKg,
      body_fat_percentage: input.bodyFatPercentage ?? null,
      waist_cm: input.waistCm ?? null,
      note: input.note?.trim() ?? "",
      measured_at: input.measuredAt ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapMeasurement(data as MeasurementRow);
}
