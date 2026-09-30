import type { WorkoutSession, WorkoutSessionStatus } from "@/types";

const TERMINAL_WORKOUT_STATUSES = new Set<WorkoutSessionStatus>([
  "completed",
  "cancelled",
  "missed",
]);

export function isTerminalWorkoutStatus(status: WorkoutSessionStatus): boolean {
  return TERMINAL_WORKOUT_STATUSES.has(status);
}

/**
 * Local terminal state wins while its mutation is still pending. This keeps a
 * stale remote `in_progress` row from resurrecting a workout after Finish or
 * Discard but before the terminal mutation reaches Supabase.
 */
export function shouldProtectLocalTerminalWorkout(
  local: Pick<WorkoutSession, "id" | "status"> | null,
  remoteSessionId: string,
  hasPendingLocalChanges: boolean,
): boolean {
  return Boolean(
    local &&
    local.id === remoteSessionId &&
    isTerminalWorkoutStatus(local.status) &&
    hasPendingLocalChanges
  );
}
