import { getArabicErrorMessage } from "@/lib/localization";
import { createClient } from "@/lib/supabase/client";
import type { OfflineMutation, SyncStatus, WorkoutExercise, WorkoutSession, WorkoutSet } from "@/types";
import { getCurrentNetworkStatus } from "./network-status";
import {
  getPendingSyncCount,
  getSyncQueueItems,
  markFailedItemsPending,
  recoverInterruptedSyncItems,
  removeSyncQueueItem,
  updateSyncQueueItem,
} from "./sync-queue";

export interface SyncResult {
  status: SyncStatus;
  syncedCount: number;
  failedCount: number;
  pendingCount: number;
  error?: string;
}

function sessionRow(session: WorkoutSession) {
  return {
    id: session.id,
    client_id: session.clientId,
    user_id: session.userId,
    group_id: session.groupId,
    split_day_id: session.splitDayId,
    scheduled_date: session.scheduledDate,
    status: session.status,
    notes: session.notes,
    duration_seconds: session.durationSeconds,
    started_at: session.startedAt,
    completed_at: session.completedAt,
    updated_at: session.updatedAt,
  };
}

function exerciseRow(exercise: WorkoutExercise) {
  return {
    id: exercise.id,
    workout_session_id: exercise.workoutSessionId,
    exercise_id: exercise.exerciseId,
    position: exercise.order,
    is_session_only_addition: exercise.isSessionOnlyAddition,
    target_reps_min: exercise.targetRepsMin,
    target_reps_max: exercise.targetRepsMax,
    notes: exercise.notes,
  };
}

function setRow(set: WorkoutSet) {
  return {
    id: set.id,
    workout_exercise_id: set.workoutExerciseId,
    set_number: set.setNumber,
    weight_kg: set.weightKg,
    reps: set.reps,
    is_warmup: set.isWarmup,
    is_completed: set.isCompleted,
    notes: set.notes,
    created_at: set.createdAt,
    updated_at: set.updatedAt,
  };
}

async function syncMutation(mutation: OfflineMutation): Promise<void> {
  const supabase = createClient();

  if (mutation.entity === "workoutSession") {
    const { error } = await supabase
      .from("workout_sessions")
      .upsert(sessionRow(mutation.payload), { onConflict: "id" });
    if (error) throw new Error(error.message);
    return;
  }

  if (mutation.entity === "workoutExercise") {
    if (mutation.operation === "delete") {
      const { error } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("id", mutation.payload.id);
      if (error) throw new Error(error.message);
      return;
    }
    const { error } = await supabase
      .from("workout_exercises")
      .upsert(exerciseRow(mutation.payload), { onConflict: "id" });
    if (error) throw new Error(error.message);
    return;
  }

  if (mutation.operation === "delete") {
    const { error } = await supabase.from("workout_sets").delete().eq("id", mutation.payload.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from("workout_sets")
    .upsert(setRow(mutation.payload), { onConflict: "id" });
  if (error) throw new Error(error.message);
}

let currentSync: Promise<SyncResult> | null = null;

export async function processSyncQueue(): Promise<SyncResult> {
  if (currentSync) return currentSync;

  currentSync = (async () => {
    if (!getCurrentNetworkStatus()) {
      return {
        status: "idle" as const,
        syncedCount: 0,
        failedCount: 0,
        pendingCount: await getPendingSyncCount(),
      };
    }

    await recoverInterruptedSyncItems();
    const queue = await getSyncQueueItems(["pending", "failed"]);
    if (queue.length === 0) {
      const pendingCount = await getPendingSyncCount();
      return {
        status: pendingCount > 0 ? "error" as const : "synced" as const,
        syncedCount: 0,
        failedCount: pendingCount,
        pendingCount,
        ...(pendingCount > 0 ? { error: "في تغييرات مستنية إعادة المحاولة." } : {}),
      };
    }

    let syncedCount = 0;
    let failedCount = 0;
    let errorMessage: string | undefined;

    for (const item of queue) {
      const attemptedAt = new Date().toISOString();
      await updateSyncQueueItem({
        ...item,
        status: "processing",
        attempts: item.attempts + 1,
        lastAttemptAt: attemptedAt,
        updatedAt: attemptedAt,
        lastError: null,
      });

      try {
        await syncMutation(item.mutation);
        await removeSyncQueueItem(item.id);
        syncedCount += 1;
      } catch (caught) {
        errorMessage = getArabicErrorMessage(caught, "معرفناش نزامن بيانات التمرين.");
        await updateSyncQueueItem({
          ...item,
          status: "failed",
          attempts: item.attempts + 1,
          lastAttemptAt: attemptedAt,
          updatedAt: new Date().toISOString(),
          lastError: errorMessage,
        });
        failedCount += 1;
        // Preserve dependency order: children should not be attempted before
        // their parent session/exercise is accepted by the server.
        break;
      }
    }

    const pendingCount = await getPendingSyncCount();
    return {
      status: failedCount > 0 ? "error" : "synced",
      syncedCount,
      failedCount,
      pendingCount,
      ...(errorMessage ? { error: errorMessage } : {}),
    };
  })();

  try {
    return await currentSync;
  } finally {
    currentSync = null;
  }
}

export async function retryFailedSyncItems(): Promise<SyncResult> {
  await markFailedItemsPending();
  return processSyncQueue();
}

export function requestSync(): void {
  if (typeof window === "undefined" || !getCurrentNetworkStatus()) return;
  void processSyncQueue();
}
