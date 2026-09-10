import type { ProfileSex, UUID } from "@/types";

export type JourneyEventType = "exercise_log" | "body_weight" | "body_measurement" | "personal_record";

export interface JourneyEvent {
  id: string;
  type: JourneyEventType;
  occurredAt: string;
  title: string;
  summary: string;
  sourceId: UUID;
  sessionId?: UUID;
  exerciseId?: UUID;
  editable: boolean;
  metadata: Record<string, number | string | null>;
}

export interface JourneyHistorySnapshot {
  sex: ProfileSex | null;
  firstEventAt: string | null;
  lastEventAt: string | null;
  workoutCount: number;
  weightEntryCount: number;
  measurementEntryCount: number;
  events: JourneyEvent[];
}
