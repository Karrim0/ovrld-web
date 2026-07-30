import { generateClientId } from "@/lib/utils/id";
import type {
  OfflineMutation,
  SyncQueueItem,
  SyncQueueItemStatus,
  UUID,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from "@/types";
import { getOfflineDatabase } from "./database";
import { STORAGE_KEYS } from "@/config/storage";
import { isInterruptedProcessingItem, isSyncRetryDue } from "./sync-policy";

export const SYNC_QUEUE_CHANGED_EVENT = STORAGE_KEYS.syncQueueChangedEvent;

function getMutationEntityId(mutation: OfflineMutation): UUID {
  return mutation.payload.id;
}

function notifyQueueChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_QUEUE_CHANGED_EVENT));
    window.dispatchEvent(new CustomEvent(STORAGE_KEYS.legacySyncQueueChangedEvent));
  }
}

export function subscribeToSyncQueueChanges(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SYNC_QUEUE_CHANGED_EVENT, listener);
  return () => window.removeEventListener(SYNC_QUEUE_CHANGED_EVENT, listener);
}

function mergeMutation(existing: OfflineMutation, next: OfflineMutation): OfflineMutation {
  if (existing.entity !== next.entity) return next;
  if (existing.operation === "create" && next.operation === "update") {
    return { ...existing, payload: next.payload } as OfflineMutation;
  }
  return next;
}

async function removeRelatedPendingCreates(mutation: OfflineMutation): Promise<boolean> {
  if (mutation.operation !== "delete") return false;
  const db = getOfflineDatabase();
  const entityId = getMutationEntityId(mutation);
  const rows = await db.syncQueue.toArray();
  const existingCreate = rows.find(
    (row) =>
      row.mutation.entity === mutation.entity &&
      row.mutation.operation === "create" &&
      getMutationEntityId(row.mutation) === entityId,
  );

  if (!existingCreate) return false;

  const idsToDelete = new Set<UUID>([existingCreate.id]);
  if (mutation.entity === "workoutExercise") {
    const exercise = mutation.payload as WorkoutExercise;
    const setIds = new Set(exercise.sets.map((set) => set.id));
    for (const row of rows) {
      if (row.mutation.entity === "workoutSet" && setIds.has(getMutationEntityId(row.mutation))) {
        idsToDelete.add(row.id);
      }
    }
  }

  await db.syncQueue.bulkDelete([...idsToDelete]);
  notifyQueueChanged();
  return true;
}

export async function enqueueOfflineMutation(mutation: OfflineMutation): Promise<void> {
  const db = getOfflineDatabase();
  if (await removeRelatedPendingCreates(mutation)) return;

  const entityId = getMutationEntityId(mutation);
  const existingRows = await db.syncQueue
    .filter(
      (row) =>
        row.mutation.entity === mutation.entity &&
        getMutationEntityId(row.mutation) === entityId &&
        row.status !== "processing",
    )
    .toArray();

  const now = new Date().toISOString();

  // A locally-created session must reach the server as `in_progress` before
  // its later completion update. Keeping these as two ordered queue items
  // also guarantees workout exercises and sets exist before PR triggers run.
  if (mutation.entity === "workoutSession" && mutation.operation === "update") {
    const pendingCreate = existingRows.find((row) => row.mutation.operation === "create");
    if (pendingCreate) {
      const existingUpdate = existingRows.find((row) => row.mutation.operation === "update");
      if (existingUpdate) {
        await db.syncQueue.put({
          ...existingUpdate,
          mutation,
          status: "pending",
          updatedAt: now,
          lastError: null,
        });
        const duplicateUpdates = existingRows
          .filter((row) => row.mutation.operation === "update" && row.id !== existingUpdate.id)
          .map((row) => row.id);
        if (duplicateUpdates.length > 0) await db.syncQueue.bulkDelete(duplicateUpdates);
      } else {
        await db.syncQueue.add({
          id: generateClientId(),
          idempotencyKey: entityId,
          mutation,
          status: "pending",
          createdAt: now,
          updatedAt: now,
          attempts: 0,
          lastAttemptAt: null,
          lastError: null,
        });
      }
      notifyQueueChanged();
      return;
    }
  }

  const existing = existingRows[0];

  if (existing) {
    const nextRow: SyncQueueItem = {
      ...existing,
      mutation: mergeMutation(existing.mutation, mutation),
      status: "pending",
      updatedAt: now,
      lastError: null,
    };
    await db.syncQueue.put(nextRow);
    if (existingRows.length > 1) {
      await db.syncQueue.bulkDelete(existingRows.slice(1).map((row) => row.id));
    }
  } else {
    const item: SyncQueueItem = {
      id: generateClientId(),
      idempotencyKey: entityId,
      mutation,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      attempts: 0,
      lastAttemptAt: null,
      lastError: null,
    };
    await db.syncQueue.add(item);
  }

  notifyQueueChanged();
}

export async function getPendingSyncCount(): Promise<number> {
  const db = getOfflineDatabase();
  return db.syncQueue.where("status").anyOf(["pending", "processing", "failed"]).count();
}

export async function getSyncQueueItems(
  statuses: SyncQueueItemStatus[] = ["pending", "failed"],
): Promise<SyncQueueItem[]> {
  const db = getOfflineDatabase();
  const rows = await db.syncQueue.where("status").anyOf(statuses).toArray();
  return rows
    .filter((item) => item.status !== "failed" || isSyncRetryDue(item))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Restores queue rows left in `processing` after a crashed/closed tab. */
export async function recoverInterruptedSyncItems(now = new Date()): Promise<number> {
  const db = getOfflineDatabase();
  const processing = await db.syncQueue.where("status").equals("processing").toArray();
  const interrupted = processing.filter((item) => isInterruptedProcessingItem(item, now.getTime()));
  if (interrupted.length === 0) return 0;

  const updatedAt = now.toISOString();
  await db.syncQueue.bulkPut(
    interrupted.map((item) => ({
      ...item,
      status: "pending" as const,
      updatedAt,
      lastError: item.lastError ?? "Interrupted sync recovered after the previous tab closed.",
    })),
  );
  notifyQueueChanged();
  return interrupted.length;
}

/** Prevents a remote refresh from overwriting workout changes that still live only locally. */
export async function hasPendingMutationsForWorkoutSession(sessionId: UUID): Promise<boolean> {
  const db = getOfflineDatabase();
  const rows = await db.syncQueue
    .where("status")
    .anyOf(["pending", "processing", "failed"])
    .toArray();

  const pendingExerciseSessions = new Map<UUID, UUID>();
  const pendingSetExerciseIds = new Set<UUID>();

  for (const row of rows) {
    const mutation = row.mutation;
    if (mutation.entity === "workoutSession") {
      if (mutation.payload.id === sessionId) return true;
      continue;
    }
    if (mutation.entity === "workoutExercise") {
      if (mutation.payload.workoutSessionId === sessionId) return true;
      pendingExerciseSessions.set(mutation.payload.id, mutation.payload.workoutSessionId);
      continue;
    }
    pendingSetExerciseIds.add(mutation.payload.workoutExerciseId);
  }

  if (pendingSetExerciseIds.size === 0) return false;
  for (const exerciseId of pendingSetExerciseIds) {
    if (pendingExerciseSessions.get(exerciseId) === sessionId) return true;
    const exercise = await db.workoutExercises.get(exerciseId);
    if (exercise?.workoutSessionId === sessionId) return true;
  }
  return false;
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  const db = getOfflineDatabase();
  await db.syncQueue.put(item);
  notifyQueueChanged();
}

export async function removeSyncQueueItem(id: UUID): Promise<void> {
  const db = getOfflineDatabase();
  await db.syncQueue.delete(id);
  notifyQueueChanged();
}

export async function markFailedItemsPending(): Promise<void> {
  const db = getOfflineDatabase();
  const failed = await db.syncQueue.where("status").equals("failed").toArray();
  const now = new Date().toISOString();
  await db.syncQueue.bulkPut(
    failed.map((item) => ({ ...item, status: "pending" as const, updatedAt: now, lastError: null })),
  );
  notifyQueueChanged();
}

export function workoutSessionMutation(
  operation: "create" | "update",
  payload: WorkoutSession,
): OfflineMutation {
  return { entity: "workoutSession", operation, payload };
}

export function workoutExerciseMutation(
  operation: "create" | "update" | "delete",
  payload: WorkoutExercise,
): OfflineMutation {
  return { entity: "workoutExercise", operation, payload };
}

export function workoutSetMutation(
  operation: "create" | "update" | "delete",
  payload: WorkoutSet,
): OfflineMutation {
  return { entity: "workoutSet", operation, payload };
}
