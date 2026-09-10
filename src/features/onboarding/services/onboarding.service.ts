import type { UUID } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentGroupMembership } from "@/features/groups/services/group.service";
import { addBodyMeasurement, fetchBodyProgress, saveBodyGoal } from "@/features/body-progress/services/body-progress.service";
import { updateTrainingProfileBasics } from "@/features/profile/services/profile.service";
import { applySplitTemplate } from "@/features/splits/services/split.service";
import type { OnboardingSetupInput } from "../types";

export type PostAuthDestination = "/dashboard" | "/onboarding";

export async function resolvePostAuthDestination(userId: UUID): Promise<PostAuthDestination> {
  const membership = await fetchCurrentGroupMembership(userId);
  if (!membership) return "/onboarding";

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.onboarding_completed_at ? "/dashboard" : "/onboarding";
}

function validateSetup(input: OnboardingSetupInput) {
  if (!Number.isFinite(input.ageYears) || input.ageYears < 13 || input.ageYears > 100) throw new Error("راجع السن.");
  if (!Number.isFinite(input.heightCm) || input.heightCm < 120 || input.heightCm > 230) throw new Error("راجع الطول.");
  if (!Number.isFinite(input.currentWeightKg) || input.currentWeightKg < 20 || input.currentWeightKg > 500) throw new Error("راجع الوزن الحالي.");
  if (!Number.isInteger(input.weeklyTrainingDays) || input.weeklyTrainingDays < 1 || input.weeklyTrainingDays > 7) throw new Error("راجع عدد أيام التمرين.");
  if (input.trainingSetupPath === "ready_plan" && !input.readyPlanKey) throw new Error("اختار خطة جاهزة.");
}

export async function saveOnboardingSetup(userId: UUID, input: OnboardingSetupInput): Promise<void> {
  validateSetup(input);

  const membership = await fetchCurrentGroupMembership(userId);
  if (!membership) throw new Error("جهّز مساحة التدريب الأول.");

  const existingBody = await fetchBodyProgress(userId);

  await updateTrainingProfileBasics(userId, {
    ageYears: Math.round(input.ageYears),
    sex: input.sex,
    trainingLevel: input.trainingLevel,
    weeklyTrainingDays: input.weeklyTrainingDays,
  });

  await saveBodyGoal(userId, {
    goalType: input.goal,
    targetWeightKg: existingBody.goal?.targetWeightKg ?? null,
    heightCm: input.heightCm,
    targetDate: existingBody.goal?.targetDate ?? null,
    weighInIntervalDays: existingBody.goal?.weighInIntervalDays ?? 7,
    bodyMeasurementIntervalDays: existingBody.goal?.bodyMeasurementIntervalDays ?? 28,
  });

  if (!existingBody.latest || Math.abs(existingBody.latest.weightKg - input.currentWeightKg) >= 0.05) {
    await addBodyMeasurement(userId, { weightKg: input.currentWeightKg });
  }

  await applySplitTemplate(input.trainingSetupPath === "ready_plan" ? input.readyPlanKey! : "manual");
}

export async function completeOnboarding(userId: UUID): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}
