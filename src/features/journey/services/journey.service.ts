import { createClient } from "@/lib/supabase/client";
import type { UUID } from "@/types";
import type { JourneyEvent, JourneyHistorySnapshot } from "../types";

type BodyRow = {
  id: string;
  measured_at: string;
  weight_kg: number | string;
  body_fat_percentage: number | string | null;
  waist_cm: number | string | null;
  chest_cm: number | string | null;
  hips_cm: number | string | null;
  thigh_cm: number | string | null;
  upper_arm_cm: number | string | null;
  calf_cm: number | string | null;
  neck_cm: number | string | null;
};

type SetRow = { weight_kg: number | string | null; reps: number | null; is_warmup: boolean; is_completed: boolean };
type ExerciseRow = { exercise_id: string; exercises: { name: string } | null; workout_sets: SetRow[] };
type SessionRow = { id: string; completed_at: string | null; scheduled_date: string; workout_exercises: ExerciseRow[] };
type RecordRow = { id: string; exercise_id: string; record_type: string; value: number | string; achieved_at: string; exercises: { name: string } | null };

function n(value: number | string | null | undefined) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compactNumber(value: number | null, unit = "") {
  if (value == null) return "—";
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit ? `${text} ${unit}` : text;
}

function bestSet(sets: SetRow[]) {
  return sets
    .filter((set) => set.is_completed && !set.is_warmup && (set.reps ?? 0) > 0)
    .map((set) => ({ weight: n(set.weight_kg), reps: set.reps ?? 0 }))
    .sort((a, b) => ((b.weight ?? 0) * (1 + b.reps / 30)) - ((a.weight ?? 0) * (1 + a.reps / 30)))[0] ?? null;
}

export async function fetchJourneyHistory(userId: UUID): Promise<JourneyHistorySnapshot> {
  const supabase = createClient();
  const [profileResult, bodyResult, sessionsResult, recordsResult] = await Promise.all([
    supabase.from("profiles").select("sex").eq("id", userId).maybeSingle(),
    supabase.from("body_measurements").select("id, measured_at, weight_kg, body_fat_percentage, waist_cm, chest_cm, hips_cm, thigh_cm, upper_arm_cm, calf_cm, neck_cm").eq("user_id", userId).order("measured_at", { ascending: false }).limit(250),
    supabase.from("workout_sessions").select("id, completed_at, scheduled_date, workout_exercises(exercise_id, exercises(name), workout_sets(weight_kg, reps, is_warmup, is_completed))").eq("user_id", userId).eq("status", "completed").order("completed_at", { ascending: false }).limit(150),
    supabase.from("personal_records").select("id, exercise_id, record_type, value, achieved_at, exercises(name)").eq("user_id", userId).order("achieved_at", { ascending: false }).limit(100),
  ]);

  for (const result of [profileResult, bodyResult, sessionsResult, recordsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const bodies = (bodyResult.data ?? []) as unknown as BodyRow[];
  const sessions = (sessionsResult.data ?? []) as unknown as SessionRow[];
  const records = (recordsResult.data ?? []) as unknown as RecordRow[];
  const events: JourneyEvent[] = [];

  for (const row of bodies) {
    const weight = n(row.weight_kg);
    const measurementValues = {
      bodyFatPercentage: n(row.body_fat_percentage), waistCm: n(row.waist_cm), chestCm: n(row.chest_cm), hipsCm: n(row.hips_cm),
      thighCm: n(row.thigh_cm), upperArmCm: n(row.upper_arm_cm), calfCm: n(row.calf_cm), neckCm: n(row.neck_cm),
    };
    events.push({
      id: `weight:${row.id}`,
      type: "body_weight",
      occurredAt: row.measured_at,
      title: "Body weight",
      summary: compactNumber(weight, "kg"),
      sourceId: row.id,
      editable: true,
      metadata: { weightKg: weight, ...measurementValues },
    });
    const populated = Object.entries(measurementValues).filter(([, value]) => value != null);
    if (populated.length > 0) {
      events.push({
        id: `measurement:${row.id}`,
        type: "body_measurement",
        occurredAt: row.measured_at,
        title: "Body measurements",
        summary: `${populated.length} measurements updated`,
        sourceId: row.id,
        editable: true,
        metadata: measurementValues,
      });
    }
  }

  for (const session of sessions) {
    const at = session.completed_at ?? `${session.scheduled_date}T12:00:00`;
    for (const exercise of session.workout_exercises ?? []) {
      const best = bestSet(exercise.workout_sets ?? []);
      if (!best) continue;
      events.push({
        id: `exercise:${session.id}:${exercise.exercise_id}`,
        type: "exercise_log",
        occurredAt: at,
        title: exercise.exercises?.name ?? "Exercise",
        summary: `${compactNumber(best.weight, "kg")} × ${best.reps}`,
        sourceId: session.id,
        sessionId: session.id,
        exerciseId: exercise.exercise_id,
        editable: true,
        metadata: { weightKg: best.weight, reps: best.reps, scheduledDate: session.scheduled_date },
      });
    }
  }

  for (const record of records) {
    events.push({
      id: `pr:${record.id}`,
      type: "personal_record",
      occurredAt: record.achieved_at,
      title: record.exercises?.name ?? "Personal record",
      summary: `PR · ${compactNumber(n(record.value), record.record_type === "max_reps" ? "reps" : "kg")}`,
      sourceId: record.id,
      exerciseId: record.exercise_id,
      editable: false,
      metadata: { recordType: record.record_type, recordValue: n(record.value) },
    });
  }

  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return {
    sex: profileResult.data?.sex === "male" ? "male" : profileResult.data?.sex === "female" ? "female" : null,
    firstEventAt: events.length ? events[events.length - 1].occurredAt : null,
    lastEventAt: events[0]?.occurredAt ?? null,
    workoutCount: sessions.length,
    weightEntryCount: bodies.length,
    measurementEntryCount: bodies.filter((row) => [row.body_fat_percentage, row.waist_cm, row.chest_cm, row.hips_cm, row.thigh_cm, row.upper_arm_cm, row.calf_cm, row.neck_cm].some((value) => value != null)).length,
    events,
  };
}
