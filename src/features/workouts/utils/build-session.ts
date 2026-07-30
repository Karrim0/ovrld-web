import { generateClientId } from "@/lib/utils/id";
import { getTodayISODate } from "@/lib/dates";
import type { SplitDay, WorkoutSession, UUID } from "@/types";

/**
 * Builds an active local session from an effective split day.
 * All record IDs are generated client-side so an offline retry can upsert
 * instead of creating duplicate rows.
 */
export function buildWorkoutSessionFromSplitDay(
  userId: UUID,
  groupId: UUID,
  splitDay: SplitDay
): WorkoutSession {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    id: sessionId,
    clientId: generateClientId(),
    userId,
    groupId,
    splitDayId: splitDay.id,
    scheduledDate: getTodayISODate(),
    status: "in_progress",
    notes: "",
    durationSeconds: 0,
    startedAt: now,
    completedAt: null,
    updatedAt: now,
    exercises: splitDay.exercises.map((splitExercise) => ({
      id: crypto.randomUUID(),
      workoutSessionId: sessionId,
      exerciseId: splitExercise.exerciseId,
      order: splitExercise.order,
      isSessionOnlyAddition: false,
      targetRepsMin: splitExercise.targetRepsMin,
      targetRepsMax: splitExercise.targetRepsMax,
      notes: "",
      sets: [],
    })),
  };
}
