import type { SyncQueueItem } from "@/types";

export const SYNC_RETRY_BASE_MS = 2_000;
export const SYNC_RETRY_MAX_MS = 5 * 60_000;
export const SYNC_PROCESSING_STALE_MS = 2 * 60_000;
export const MAX_AUTOMATIC_SYNC_ATTEMPTS = 8;

export function getSyncRetryDelayMs(attempts: number): number {
  const exponent = Math.max(0, Math.min(12, attempts - 1));
  return Math.min(SYNC_RETRY_MAX_MS, SYNC_RETRY_BASE_MS * 2 ** exponent);
}

export function isSyncRetryDue(
  item: SyncQueueItem,
  nowMs = Date.now(),
): boolean {
  if (item.status === "pending") return true;
  if (item.status === "processing") return false;
  if (item.attempts >= MAX_AUTOMATIC_SYNC_ATTEMPTS) return false;
  if (!item.lastAttemptAt) return true;

  const lastAttemptMs = Date.parse(item.lastAttemptAt);
  if (!Number.isFinite(lastAttemptMs)) return true;
  return nowMs - lastAttemptMs >= getSyncRetryDelayMs(item.attempts);
}

export function isInterruptedProcessingItem(
  item: SyncQueueItem,
  nowMs = Date.now(),
): boolean {
  if (item.status !== "processing") return false;
  const reference = item.lastAttemptAt ?? item.updatedAt;
  const referenceMs = Date.parse(reference);
  if (!Number.isFinite(referenceMs)) return true;
  return nowMs - referenceMs >= SYNC_PROCESSING_STALE_MS;
}
