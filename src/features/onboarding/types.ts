import type { BodyGoalType } from "@/features/body-progress/types";
import type { StarterPlanKey } from "@/features/splits/types";
import type { TrainingLevel } from "@/types";

export type OnboardingGoal = Extract<
  BodyGoalType,
  "muscle_gain" | "lose_weight" | "recomposition" | "maintain_weight" | "track_only"
>;

export type TrainingSetupPath = "ready_plan" | "own_split";

export interface OnboardingSetupInput {
  ageYears: number;
  heightCm: number;
  currentWeightKg: number;
  goal: OnboardingGoal;
  trainingLevel: TrainingLevel;
  weeklyTrainingDays: number;
  trainingSetupPath: TrainingSetupPath;
  readyPlanKey: Exclude<StarterPlanKey, "manual"> | null;
}
