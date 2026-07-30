import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import {
  cacheExercises,
  enqueueOfflineMutation,
  getLocalActiveWorkout,
  getLocalWorkoutHistory,
  getLocalWorkoutSession,
  getOfflineDatabase,
  getCurrentNetworkStatus,
  hasPendingMutationsForWorkoutSession,
  requestSync,
  removeLocalWorkoutSession,
  saveWorkoutLocally,
  workoutExerciseMutation,
  workoutSessionMutation,
  workoutSetMutation,
} from "@/lib/offline";
import { generateClientId } from "@/lib/utils/id";
import type { UUID, WorkoutExercise, WorkoutSession, WorkoutSet } from "@/types";
import { fetchExerciseById, mapExercise } from "@/features/exercises/services/exercise.service";
import type { SplitDayWithDetails } from "@/features/splits/types";
import type { PreviousExercisePerformance, PreviousPerformanceMap, WorkoutSessionWithDetails } from "../types";

type SessionRow = Tables<"workout_sessions">;
type WorkoutExerciseRow = Tables<"workout_exercises">;
type WorkoutSetRow = Tables<"workout_sets">;
type ExerciseRow = Tables<"exercises">;

type WorkoutExerciseQueryRow = WorkoutExerciseRow & {
  exercises: ExerciseRow;
  workout_sets: WorkoutSetRow[];
};

type WorkoutSessionQueryRow = SessionRow & {
  workout_exercises: WorkoutExerciseQueryRow[];
};

function mapSet(row: WorkoutSetRow, recordSetIds = new Set<string>()): WorkoutSet {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id,
    setNumber: row.set_number,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    reps: row.reps,
    isWarmup: row.is_warmup,
    isCompleted: row.is_completed,
    isPersonalRecord: recordSetIds.has(row.id),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWorkoutExercise(row: WorkoutExerciseQueryRow, recordSetIds = new Set<string>()) {
  return {
    id: row.id,
    workoutSessionId: row.workout_session_id,
    exerciseId: row.exercise_id,
    order: row.position,
    isSessionOnlyAddition: row.is_session_only_addition,
    targetRepsMin: row.target_reps_min,
    targetRepsMax: row.target_reps_max,
    notes: row.notes,
    exercise: mapExercise(row.exercises),
    sets: [...row.workout_sets]
      .sort((a, b) => a.set_number - b.set_number)
      .map((set) => mapSet(set, recordSetIds)),
  };
}

function mapSession(
  row: WorkoutSessionQueryRow,
  recordSetIds = new Set<string>(),
): WorkoutSessionWithDetails {
  return {
    id: row.id,
    clientId: row.client_id,
    userId: row.user_id,
    groupId: row.group_id,
    splitDayId: row.split_day_id,
    scheduledDate: row.scheduled_date,
    status: row.status,
    notes: row.notes,
    durationSeconds: row.duration_seconds,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    exercises: [...row.workout_exercises]
      .sort((a, b) => a.position - b.position)
      .map((exercise) => mapWorkoutExercise(exercise, recordSetIds)),
  };
}

const SESSION_SELECT = "*, workout_exercises(*, exercises(*), workout_sets(*))";

async function loadRecordSetIds(session: WorkoutSessionWithDetails): Promise<Set<string>> {
  const setIds = session.exercises.flatMap((exercise) => exercise.sets.map((set) => set.id));
  if (setIds.length === 0) return new Set();
  const supabase = createClient();
  const { data } = await supabase
    .from("personal_records")
    .select("workout_set_id")
    .in("workout_set_id", setIds);
  return new Set((data ?? []).map((record) => record.workout_set_id));
}

async function fetchRemoteSessionById(sessionId: UUID): Promise<WorkoutSessionWithDetails | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const base = mapSession(data as unknown as WorkoutSessionQueryRow);
  const recordSetIds = await loadRecordSetIds(base);
  const session = mapSession(data as unknown as WorkoutSessionQueryRow, recordSetIds);
  await cacheExercises(session.exercises.map((exercise) => exercise.exercise));
  await saveWorkoutLocally(session);
  return session;
}

export async function fetchWorkoutSessionById(
  sessionId: UUID,
): Promise<WorkoutSessionWithDetails | null> {
  const local = await getLocalWorkoutSession(sessionId);
  if (!getCurrentNetworkStatus()) return local;

  const hasPendingLocalChanges = await hasPendingMutationsForWorkoutSession(sessionId);
  if (local && hasPendingLocalChanges) return local;

  try {
    const remote = await fetchRemoteSessionById(sessionId);
    if (!remote && local) await removeLocalWorkoutSession(sessionId);
    return remote;
  } catch (error) {
    if (local) return local;
    throw error;
  }
}

export async function fetchActiveWorkoutSession(): Promise<WorkoutSessionWithDetails | null> {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const currentUser = userData.user;
  if (userError || !currentUser) throw new Error("لازم تسجّل دخول الأول.");

  const local = await getLocalActiveWorkout(currentUser.id);
  if (!getCurrentNetworkStatus()) return local;

  if (local && await hasPendingMutationsForWorkoutSession(local.id)) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select(SESSION_SELECT)
      .eq("user_id", currentUser.id)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) {
      const session = mapSession(data as unknown as WorkoutSessionQueryRow);
      if (local && local.id !== session.id) await removeLocalWorkoutSession(local.id);
      await cacheExercises(session.exercises.map((exercise) => exercise.exercise));
      await saveWorkoutLocally(session);
      return session;
    }

    if (local) {
      // Another client may have finished/cancelled the session. Refresh its
      // final state, which removes it from the local active-workout query.
      const remoteLocalSession = await fetchRemoteSessionById(local.id);
      if (!remoteLocalSession) await removeLocalWorkoutSession(local.id);
    }
    return null;
  } catch (error) {
    if (local) return local;
    throw error;
  }
}

export async function fetchWorkoutHistory(userId: UUID): Promise<WorkoutSessionWithDetails[]> {
  const localHistory = await getLocalWorkoutHistory(userId, 100);
  const merged = new Map(localHistory.map((session) => [session.id, session]));

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("workout_sessions")
      .select(SESSION_SELECT)
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    for (const row of data as unknown as WorkoutSessionQueryRow[]) {
      const session = mapSession(row);
      const local = merged.get(session.id);
      if (!local || session.updatedAt > local.updatedAt) {
        merged.set(session.id, session);
        await saveWorkoutLocally(session);
      }
    }
  } catch {
    // Local history is the source of truth while offline.
  }

  return [...merged.values()].sort((a, b) =>
    (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt),
  );
}

export async function startWorkoutSession(
  userId: UUID,
  splitDay: SplitDayWithDetails,
  scheduledDate = new Date().toISOString().slice(0, 10),
): Promise<WorkoutSessionWithDetails> {
  const existing = await fetchActiveWorkoutSession().catch(() => getLocalActiveWorkout(userId));
  if (existing) return existing;

  const now = new Date().toISOString();
  const sessionId = generateClientId();
  const session: WorkoutSessionWithDetails = {
    id: sessionId,
    clientId: generateClientId(),
    userId,
    groupId: splitDay.groupId,
    splitDayId: splitDay.id,
    scheduledDate,
    status: "in_progress",
    notes: "",
    durationSeconds: 0,
    startedAt: now,
    completedAt: null,
    updatedAt: now,
    exercises: splitDay.exercises.map((template, exerciseIndex) => {
      const workoutExerciseId = generateClientId();
      return {
        id: workoutExerciseId,
        workoutSessionId: sessionId,
        exerciseId: template.exerciseId,
        order: exerciseIndex,
        isSessionOnlyAddition: false,
        targetRepsMin: template.targetRepsMin,
        targetRepsMax: template.targetRepsMax,
        notes: "",
        exercise: template.exercise,
        sets: Array.from({ length: template.targetSets }, (_, setIndex) => ({
          id: generateClientId(),
          workoutExerciseId,
          setNumber: setIndex + 1,
          weightKg: null,
          reps: null,
          isWarmup: false,
          isCompleted: false,
          isPersonalRecord: false,
          notes: "",
          createdAt: now,
          updatedAt: now,
        })),
      };
    }),
  };

  await saveWorkoutLocally(session);
  await enqueueOfflineMutation(workoutSessionMutation("create", session));
  for (const exercise of session.exercises) {
    await enqueueOfflineMutation(workoutExerciseMutation("create", exercise));
    for (const set of exercise.sets) {
      await enqueueOfflineMutation(workoutSetMutation("create", set));
    }
  }
  requestSync();
  return session;
}

export async function updateWorkoutSet(
  setId: UUID,
  values: { weightKg: number | null; reps: number | null; isCompleted: boolean; isWarmup?: boolean },
): Promise<WorkoutSet> {
  if (values.weightKg !== null && (!Number.isFinite(values.weightKg) || values.weightKg < 0 || values.weightKg > 5000)) {
    throw new Error("اكتب وزن صحيح.");
  }
  if (values.reps !== null && (!Number.isInteger(values.reps) || values.reps < 0 || values.reps > 1000)) {
    throw new Error("اكتب عدد عدات صحيح.");
  }
  if (values.isCompleted && (values.reps === null || values.reps <= 0)) {
    throw new Error("سجّل عدة واحدة على الأقل قبل ما تخلّص السِت.");
  }
  const db = getOfflineDatabase();
  const existing = await db.workoutSets.get(setId);
  if (!existing) throw new Error("السِت دي مش موجودة على الجهاز.");
  const updated: WorkoutSet = {
    ...existing,
    weightKg: values.weightKg,
    reps: values.reps,
    isCompleted: values.isCompleted,
    ...(values.isWarmup !== undefined ? { isWarmup: values.isWarmup } : {}),
    updatedAt: new Date().toISOString(),
  };
  await db.workoutSets.put(updated);
  await enqueueOfflineMutation(workoutSetMutation("update", updated));
  requestSync();
  return updated;
}

export async function addWorkoutSet(workoutExerciseId: UUID): Promise<WorkoutSet> {
  const db = getOfflineDatabase();
  const sets = await db.workoutSets.where("workoutExerciseId").equals(workoutExerciseId).toArray();
  const now = new Date().toISOString();
  const set: WorkoutSet = {
    id: generateClientId(),
    workoutExerciseId,
    setNumber: Math.max(0, ...sets.map((item) => item.setNumber)) + 1,
    weightKg: null,
    reps: null,
    isWarmup: false,
    isCompleted: false,
    isPersonalRecord: false,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
  await db.workoutSets.add(set);
  await enqueueOfflineMutation(workoutSetMutation("create", set));
  requestSync();
  return set;
}

export async function deleteWorkoutSet(setId: UUID): Promise<void> {
  const db = getOfflineDatabase();
  const set = await db.workoutSets.get(setId);
  if (!set) return;
  await enqueueOfflineMutation(workoutSetMutation("delete", set));
  await db.workoutSets.delete(setId);
  requestSync();
}

export async function updateWorkoutExerciseNotes(
  workoutExerciseId: UUID,
  notes: string,
): Promise<void> {
  const db = getOfflineDatabase();
  const exercise = await db.workoutExercises.get(workoutExerciseId);
  if (!exercise) throw new Error("التمرين مش موجود على الجهاز.");
  const updated = { ...exercise, notes };
  await db.workoutExercises.put(updated);
  await enqueueOfflineMutation(workoutExerciseMutation("update", { ...updated, sets: [] }));
  requestSync();
}

export async function updateWorkoutSessionNotes(sessionId: UUID, notes: string): Promise<void> {
  const session = await getLocalWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة مش موجودة على الجهاز.");
  const updated = { ...session, notes, updatedAt: new Date().toISOString() };
  await saveWorkoutLocally(updated);
  await enqueueOfflineMutation(workoutSessionMutation("update", updated));
  requestSync();
}

export async function addExerciseToWorkout(
  sessionId: UUID,
  exerciseId: UUID,
  setCount = 2,
  sessionOnly = true,
): Promise<UUID> {
  const session = await getLocalWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة الشغالة مش موجودة على الجهاز.");
  const exercise = await fetchExerciseById(exerciseId);
  if (!exercise) throw new Error("التمرين مش موجود.");

  const now = new Date().toISOString();
  const workoutExerciseId = generateClientId();
  const workoutExercise = {
    id: workoutExerciseId,
    workoutSessionId: sessionId,
    exerciseId,
    order: Math.max(-1, ...session.exercises.map((item) => item.order)) + 1,
    isSessionOnlyAddition: sessionOnly,
    targetRepsMin: 1,
    targetRepsMax: 12,
    notes: "",
    exercise,
    sets: Array.from({ length: setCount }, (_, index) => ({
      id: generateClientId(),
      workoutExerciseId,
      setNumber: index + 1,
      weightKg: null,
      reps: null,
      isWarmup: false,
      isCompleted: false,
      isPersonalRecord: false,
      notes: "",
      createdAt: now,
      updatedAt: now,
    })),
  };

  const updatedSession = {
    ...session,
    updatedAt: now,
    exercises: [...session.exercises, workoutExercise],
  };
  await saveWorkoutLocally(updatedSession);
  await enqueueOfflineMutation(workoutExerciseMutation("create", workoutExercise));
  for (const set of workoutExercise.sets) {
    await enqueueOfflineMutation(workoutSetMutation("create", set));
  }
  requestSync();
  return workoutExerciseId;
}

export async function reorderWorkoutExercises(
  sessionId: UUID,
  orderedExerciseIds: UUID[],
): Promise<void> {
  const session = await getLocalWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة الشغالة مش موجودة على الجهاز.");

  const currentIds = new Set(session.exercises.map((exercise) => exercise.id));
  if (
    orderedExerciseIds.length !== session.exercises.length ||
    orderedExerciseIds.some((id) => !currentIds.has(id))
  ) {
    throw new Error("ترتيب التمارين اتغيّر. حدّث الصفحة وجرّب تاني.");
  }

  const db = getOfflineDatabase();
  const updates = orderedExerciseIds.map((id, order) => {
    const exercise = session.exercises.find((item) => item.id === id);
    if (!exercise) throw new Error("التمرين مش موجود.");
    return { ...exercise, order };
  });

  await db.transaction("rw", db.workoutExercises, async () => {
    await db.workoutExercises.bulkPut(
      updates.map((item) => ({
        id: item.id,
        workoutSessionId: item.workoutSessionId,
        exerciseId: item.exerciseId,
        order: item.order,
        isSessionOnlyAddition: item.isSessionOnlyAddition,
        targetRepsMin: item.targetRepsMin,
        targetRepsMax: item.targetRepsMax,
        notes: item.notes,
      })),
    );
  });

  for (const exercise of updates) {
    await enqueueOfflineMutation(workoutExerciseMutation("update", exercise));
  }
  requestSync();
}

export async function deleteWorkoutExercise(workoutExerciseId: UUID): Promise<void> {
  const db = getOfflineDatabase();
  const exerciseRow = await db.workoutExercises.get(workoutExerciseId);
  if (!exerciseRow) return;
  const sets = await db.workoutSets.where("workoutExerciseId").equals(workoutExerciseId).toArray();
  const payload: WorkoutExercise = { ...exerciseRow, sets };
  await enqueueOfflineMutation(workoutExerciseMutation("delete", payload));
  await db.transaction("rw", [db.workoutExercises, db.workoutSets], async () => {
    await db.workoutSets.where("workoutExerciseId").equals(workoutExerciseId).delete();
    await db.workoutExercises.delete(workoutExerciseId);
  });
  requestSync();
}

export async function fetchPreviousPerformances(
  exerciseIds: UUID[],
  options: { excludeSessionId?: UUID } = {},
): Promise<PreviousPerformanceMap> {
  const uniqueExerciseIds = [...new Set(exerciseIds.filter(Boolean))];
  if (uniqueExerciseIds.length === 0) return {};

  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUser = sessionData.session?.user;
  if (!currentUser) return {};

  const remaining = new Set(uniqueExerciseIds);
  const result: PreviousPerformanceMap = {};
  const history = await fetchWorkoutHistory(currentUser.id);

  for (const session of history) {
    if (session.id === options.excludeSessionId) continue;

    for (const exercise of session.exercises) {
      if (!remaining.has(exercise.exerciseId)) continue;
      const completedSets = exercise.sets
        .filter((set) => set.isCompleted)
        .sort((a, b) => a.setNumber - b.setNumber);
      if (completedSets.length === 0) continue;

      const performance: PreviousExercisePerformance = {
        sessionId: session.id,
        scheduledDate: session.scheduledDate,
        completedAt: session.completedAt,
        exerciseNotes: exercise.notes,
        sets: completedSets,
      };
      result[exercise.exerciseId] = performance;
      remaining.delete(exercise.exerciseId);
    }

    if (remaining.size === 0) break;
  }

  return result;
}

export async function fetchPreviousPerformance(
  exerciseId: UUID,
  options: { excludeSessionId?: UUID } = {},
): Promise<PreviousExercisePerformance | null> {
  const performances = await fetchPreviousPerformances([exerciseId], options);
  return performances[exerciseId] ?? null;
}


export async function cancelWorkoutSession(sessionId: UUID): Promise<void> {
  const session = await getLocalWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة مش متاحة على الجهاز.");
  const now = new Date().toISOString();
  const cancelled: WorkoutSessionWithDetails = {
    ...session,
    status: "cancelled",
    completedAt: null,
    updatedAt: now,
  };
  await saveWorkoutLocally(cancelled);
  await enqueueOfflineMutation(workoutSessionMutation("update", cancelled));
  requestSync();
}

export async function finishWorkoutSession(
  sessionId: UUID,
  durationSeconds = 0,
  notes?: string,
): Promise<WorkoutSessionWithDetails> {
  const session = await getLocalWorkoutSession(sessionId);
  if (!session) throw new Error("التمرينة مش متاحة على الجهاز.");
  const now = new Date().toISOString();
  const completed: WorkoutSessionWithDetails = {
    ...session,
    status: "completed",
    completedAt: now,
    durationSeconds: Math.max(0, Math.floor(durationSeconds)),
    notes: notes ?? session.notes,
    updatedAt: now,
  };
  await saveWorkoutLocally(completed);
  await enqueueOfflineMutation(workoutSessionMutation("update", completed));
  requestSync();
  return completed;
}


export async function deleteCompletedWorkoutSession(sessionId: UUID): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("وصّل النت قبل ما تمسح تمرينة مكتملة.");
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("delete_own_workout_session", {
    target_session_id: sessionId,
  });

  if (error) throw new Error(error.message);
  await removeLocalWorkoutSession(sessionId);
}

export type { WorkoutSession, WorkoutExercise };
