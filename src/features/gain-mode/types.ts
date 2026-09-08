import type { ISODateString, UUID } from "@/types";
import type { BodyProgressSnapshot } from "@/features/body-progress/types";

export type GainModeStatus = "active" | "paused" | "completed";
export type GainActivityLevel = "light" | "moderate" | "high";
export type GainAppetiteLevel = "low" | "average" | "good";
export type GainDietPattern = "mixed" | "vegetarian" | "vegan" | "other";
export type GainNutritionMode = "simple" | "precision";

export interface GainModeProfile {
  userId: UUID;
  status: GainModeStatus;
  ageYears: number;
  activityLevel: GainActivityLevel;
  appetiteLevel: GainAppetiteLevel;
  mealSizeDifficulty: boolean;
  dietPattern: GainDietPattern;
  nutritionMode: GainNutritionMode;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type GainReviewTone = "collect" | "steady" | "adjust" | "training";

export interface GainWeeklyReview {
  tone: GainReviewTone;
  title: string;
  detail: string;
  cta: string;
  href: string;
  weeklyWeightChangeKg: number | null;
}

export interface GainModeSnapshot {
  profile: GainModeProfile;
  body: BodyProgressSnapshot;
  proteinTargetGrams: number | null;
  primaryNutritionAction: string;
  supportDetail: string;
  dietSupportDetail: string | null;
  review: GainWeeklyReview;
}
