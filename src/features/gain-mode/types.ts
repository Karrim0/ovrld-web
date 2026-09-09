import type { ISODateOnlyString, ISODateString, UUID } from "@/types";
import type { BodyProgressSnapshot } from "@/features/body-progress/types";

export type GainModeStatus = "active" | "paused" | "completed";
export type GainActivityLevel = "light" | "moderate" | "high";
export type GainAppetiteLevel = "low" | "average" | "good";
export type GainDietPattern = "mixed" | "vegetarian" | "vegan" | "other";
export type GainNutritionMode = "simple" | "precision";
export type GainEquationSex = "female" | "male";
export type GainPhysiqueFocus = "balanced" | "lower_body" | "glutes_legs";

export interface GainModeProfile {
  userId: UUID;
  status: GainModeStatus;
  ageYears: number;
  activityLevel: GainActivityLevel;
  appetiteLevel: GainAppetiteLevel;
  mealSizeDifficulty: boolean;
  dietPattern: GainDietPattern;
  nutritionMode: GainNutritionMode;
  equationSex: GainEquationSex;
  physiqueFocus: GainPhysiqueFocus;
  supportName: string | null;
  supportNote: string | null;
  calorieTargetKcal: number | null;
  proteinTargetGrams: number | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type GainNutritionEntrySource = "manual" | "ai" | "saved";

export interface GainNutritionEntry {
  id: UUID;
  userId: UUID;
  loggedOn: ISODateOnlyString;
  label: string;
  caloriesKcal: number;
  proteinGrams: number;
  source: GainNutritionEntrySource;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface GainSavedMeal {
  id: UUID;
  userId: UUID;
  label: string;
  caloriesKcal: number;
  proteinGrams: number;
  useCount: number;
  lastUsedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type GainAiFoodConfidence = "low" | "medium" | "high";

export interface GainAiFoodEstimateItem {
  name: string;
  quantityText: string;
  caloriesKcal: number;
  proteinGrams: number;
}

export interface GainAiFoodEstimate {
  recognized: boolean;
  label: string;
  caloriesKcal: number;
  proteinGrams: number;
  confidence: GainAiFoodConfidence;
  items: GainAiFoodEstimateItem[];
  assumptions: string[];
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


export type GainCalorieAdjustmentSource = "adaptive_review" | "manual";
export type GainAdaptiveDecisionState = "collect" | "hold" | "suggest" | "observe" | "on_track";

export interface GainCalorieAdjustment {
  id: UUID;
  userId: UUID;
  previousTargetKcal: number | null;
  newTargetKcal: number;
  reason: string;
  source: GainCalorieAdjustmentSource;
  reviewPeriodStart: ISODateOnlyString | null;
  reviewPeriodEnd: ISODateOnlyString | null;
  createdAt: ISODateString;
}

export interface GainNutritionWindowSummary {
  startDate: ISODateOnlyString;
  endDate: ISODateOnlyString;
  daysTotal: number;
  daysLogged: number;
  averageCaloriesKcal: number | null;
  averageProteinGrams: number | null;
  averageCalorieTargetRatio: number | null;
  averageProteinTargetRatio: number | null;
  calorieTargetHitDays: number;
  proteinTargetHitDays: number;
}

export interface GainReviewWindow {
  startDate: ISODateOnlyString;
  endDate: ISODateOnlyString;
  nutrition: GainNutritionWindowSummary;
  workoutsCompleted: number;
  workoutsScheduled: number | null;
  trainingAdherence: number | null;
  weightChangeKg: number | null;
  improvingExercises: number;
  trackedExercises: number;
}

export interface GainAdaptiveDecision {
  state: GainAdaptiveDecisionState;
  title: string;
  detail: string;
  reasonCode: string;
  suggestedCalorieTargetKcal: number | null;
  calorieDeltaKcal: number | null;
  canApply: boolean;
  observationDaysRemaining: number;
}

export interface GainReviewSnapshot {
  calorieTargetKcal: number | null;
  proteinTargetGrams: number | null;
  weekly: GainReviewWindow;
  month28: GainReviewWindow;
  decision: GainAdaptiveDecision;
  measurements: {
    waistDeltaCm: number | null;
    hipsDeltaCm: number | null;
    thighDeltaCm: number | null;
    comparedFrom: ISODateString | null;
    comparedTo: ISODateString | null;
  };
  adjustments: GainCalorieAdjustment[];
  planCompatibility: GainPlanCompatibility;
}



export type GainPlanCompatibilityState = "setup" | "good" | "partial" | "needs_work";

export interface GainPlanCompatibility {
  state: GainPlanCompatibilityState;
  score: number | null;
  focus: GainPhysiqueFocus;
  focusLabel: string;
  title: string;
  detail: string;
  lowerBodyShare: number | null;
  priorityLoads: Array<{ muscle: string; sets: number; exposureDays: number }>;
  maintenanceLoads: Array<{ muscle: string; sets: number; exposureDays: number }>;
  insights: string[];
}

export type GainTrainingState = "setup" | "collecting" | "on_track" | "attention";

export interface GainTrainingSummary {
  state: GainTrainingState;
  title: string;
  detail: string;
  href: string;
  cta: string;
  trainingDays: number;
  plannedSets: number;
  exerciseSlots: number;
  workoutsCompleted: number;
  workoutsScheduled: number;
  adherence: number | null;
  improvingExercises: number;
  plateauExercises: number;
  slippingExercises: number;
  trackedExercises: number;
  compatibility: GainPlanCompatibility;
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
  training: GainTrainingSummary;
}
