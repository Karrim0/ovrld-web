import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BodyGoalType } from "@/features/body-progress/types";
import type { TrainingLevel, UUID } from "@/types";
import { calculateProfileCompleteness } from "./profile-completeness";
import type { ProfileCompletenessSnapshot } from "../types";

type MeasurementRow = {
  measured_at: string;
  body_fat_percentage: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
  thigh_cm: number | null;
  upper_arm_cm: number | null;
  calf_cm: number | null;
  neck_cm: number | null;
};

export async function getProfileCompleteness(userId: UUID): Promise<ProfileCompletenessSnapshot> {
  const supabase = await createClient();
  const [
    profileResult,
    goalResult,
    measurementResult,
    gainResult,
    splitDaysResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("age_years, training_level, weekly_training_days")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_body_goals")
      .select("goal_type, height_cm, weigh_in_interval_days")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("body_measurements")
      .select("measured_at, body_fat_percentage, waist_cm, chest_cm, hips_cm, thigh_cm, upper_arm_cm, calf_cm, neck_cm")
      .eq("user_id", userId)
      .order("measured_at", { ascending: false })
      .limit(80),
    supabase
      .from("gain_mode_profiles")
      .select("status, calorie_target_kcal, protein_target_grams")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("split_days")
      .select("id, workout_type")
      .eq("owner_user_id", userId),
  ]);

  for (const result of [profileResult, goalResult, measurementResult, gainResult, splitDaysResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const workoutDayIds = (splitDaysResult.data ?? [])
    .filter((day) => day.workout_type !== "rest")
    .map((day) => day.id);
  let hasActiveSplit = false;
  if (workoutDayIds.length > 0) {
    const { data, error } = await supabase
      .from("split_exercises")
      .select("id")
      .in("split_day_id", workoutDayIds)
      .limit(1);
    if (error) throw new Error(error.message);
    hasActiveSplit = Boolean(data?.length);
  }

  const measurements = (measurementResult.data ?? []) as MeasurementRow[];
  const latest = measurements[0] ?? null;
  const hasBodyMeasurements = measurements.some((measurement) => [
    measurement.body_fat_percentage,
    measurement.waist_cm,
    measurement.chest_cm,
    measurement.hips_cm,
    measurement.thigh_cm,
    measurement.upper_arm_cm,
    measurement.calf_cm,
    measurement.neck_cm,
  ].some((value) => value !== null));

  const gain = gainResult.data;
  const gainModeActive = gain?.status === "active";
  const hasNutritionTarget = Boolean(
    gain?.calorie_target_kcal != null && Number(gain.calorie_target_kcal) > 0
    && gain?.protein_target_grams != null && Number(gain.protein_target_grams) > 0,
  );

  return calculateProfileCompleteness({
    ageYears: profileResult.data?.age_years ?? null,
    heightCm: goalResult.data?.height_cm == null ? null : Number(goalResult.data.height_cm),
    goalType: (goalResult.data?.goal_type as BodyGoalType | undefined) ?? null,
    trainingLevel: (profileResult.data?.training_level as TrainingLevel | undefined) ?? null,
    weeklyTrainingDays: profileResult.data?.weekly_training_days ?? null,
    latestWeightAt: latest?.measured_at ?? null,
    weighInIntervalDays: goalResult.data?.weigh_in_interval_days ?? null,
    hasActiveSplit,
    hasBodyMeasurements,
    gainModeActive,
    hasNutritionTarget,
  });
}
