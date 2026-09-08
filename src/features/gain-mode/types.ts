import type { ISODateOnlyString, ISODateString, UUID } from "@/types";
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
  calorieTargetKcal: number | null;
  proteinTargetGrams: number | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface GainNutritionEntry {
  id: UUID;
  userId: UUID;
  loggedOn: ISODateOnlyString;
  label: string;
  caloriesKcal: number;
  proteinGrams: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface GainNutritionDaySummary {
  date: ISODateOnlyString;
  caloriesKcal: number;
  proteinGrams: number;
  calorieTargetKcal: number | null;
  proteinTargetGrams: number | null;
  calorieProgress: number | null;
  proteinProgress: number | null;
  entries: GainNutritionEntry[];
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
  calorieTargetKcal: number | null;
  calorieTargetIsEstimate: boolean;
  proteinTargetGrams: number | null;
  proteinTargetIsEstimate: boolean;
  todayNutrition: GainNutritionDaySummary;
  nutritionAvailable: boolean;
  primaryNutritionAction: string;
  supportDetail: string;
  dietSupportDetail: string | null;
  review: GainWeeklyReview;
}
