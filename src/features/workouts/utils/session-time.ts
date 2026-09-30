export const MAX_REASONABLE_ACTIVE_WORKOUT_SECONDS = 18 * 60 * 60;

function toLocalISODate(value: number | string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

export function isHistoricalWorkoutDate(
  scheduledDate: string,
  now: number | string | Date = Date.now(),
): boolean {
  const today = toLocalISODate(now);
  return today !== null && scheduledDate < today;
}

/**
 * A previous-day workout needs an explicit resume when its timer still points
 * at an earlier day. After resume, `startedAt` moves to now while
 * `scheduledDate` deliberately stays on the workout's original historical day.
 */
export function isStaleWorkoutSession(
  startedAt: string,
  scheduledDate: string,
  now: number | string | Date = Date.now(),
): boolean {
  const today = toLocalISODate(now);
  const startedDate = toLocalISODate(startedAt);
  const historicalSessionNeedsResume = Boolean(
    today &&
    startedDate &&
    scheduledDate < today &&
    startedDate < today
  );

  return historicalSessionNeedsResume || isStaleActiveWorkout(
    startedAt,
    now instanceof Date ? now.getTime() : typeof now === "string" ? new Date(now).getTime() : now,
  );
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
