import type { TrainingLevel } from "@/types";
import type { BodyGoalType } from "@/features/body-progress/types";

export type ProfileCompletenessItemKey =
  | "basic_info"
  | "current_weight"
  | "height"
  | "goal"
  | "training_level"
  | "weekly_availability"
  | "active_split"
  | "body_measurements"
  | "nutrition_target";

export interface ProfileCompletenessItem {
  key: ProfileCompletenessItemKey;
  complete: boolean;
  href: string;
}

export interface ProfileCompletenessSnapshot {
  score: number;
  completeCount: number;
  totalCount: number;
  items: ProfileCompletenessItem[];
  nextAction: ProfileCompletenessItem | null;
  weightStale: boolean;
  gainModeActive: boolean;
}

export interface ProfileCompletenessSource {
  ageYears: number | null;
  heightCm: number | null;
  goalType: BodyGoalType | null;
  trainingLevel: TrainingLevel | null;
  weeklyTrainingDays: number | null;
  latestWeightAt: string | null;
  weighInIntervalDays: number | null;
  hasActiveSplit: boolean;
  hasBodyMeasurements: boolean;
  gainModeActive: boolean;
  hasNutritionTarget: boolean;
}
