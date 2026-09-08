import type { ISODateString, UUID } from "@/types";

export type BodyGoalType =
  | "track_only"
  | "gain_weight"
  | "lose_weight"
  | "maintain_weight"
  | "muscle_gain"
  | "recomposition";

export interface BodyGoal {
  userId: UUID;
  goalType: BodyGoalType;
  targetWeightKg: number | null;
  heightCm: number | null;
  targetDate: string | null;
  weighInIntervalDays: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface BodyMeasurement {
  id: UUID;
  userId: UUID;
  measuredAt: ISODateString;
  weightKg: number;
  bodyFatPercentage: number | null;
  waistCm: number | null;
  note: string;
  createdAt: ISODateString;
}

export interface BodyProgressSnapshot {
  goal: BodyGoal | null;
  measurements: BodyMeasurement[];
  latest: BodyMeasurement | null;
  previous: BodyMeasurement | null;
  start: BodyMeasurement | null;
  nextWeighInAt: ISODateString | null;
}
