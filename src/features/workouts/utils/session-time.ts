export const MAX_REASONABLE_ACTIVE_WORKOUT_SECONDS = 18 * 60 * 60;

export function getSessionElapsedSeconds(
  startedAt: string,
  endAt: number | string | Date = Date.now(),
): number {
  const startMs = new Date(startedAt).getTime();
  const endMs = endAt instanceof Date
    ? endAt.getTime()
    : typeof endAt === "string"
      ? new Date(endAt).getTime()
      : endAt;

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

export function isStaleActiveWorkout(startedAt: string, now = Date.now()): boolean {
  return getSessionElapsedSeconds(startedAt, now) > MAX_REASONABLE_ACTIVE_WORKOUT_SECONDS;
}

export function getSafeWorkoutDurationSeconds(
  startedAt: string,
  endAt: number | string | Date = Date.now(),
  fallbackSeconds = 0,
): number {
  const elapsed = getSessionElapsedSeconds(startedAt, endAt);
  if (elapsed > MAX_REASONABLE_ACTIVE_WORKOUT_SECONDS) {
    return Math.max(0, Math.floor(fallbackSeconds));
  }
  return elapsed;
}
