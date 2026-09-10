import type {
  Exercise,
  SplitDay,
  SplitExercise,
  UUID,
  WorkoutExercise,
  WorkoutSession,
  UserProfile,
} from "@/types";
import { getOfflineDatabase } from "./database";
import { clearOvrldClientStorage } from "@/config/storage";
import type { CachedExerciseRow, CachedSplitRow } from "./schema";

export interface HydratedLocalWorkoutExercise extends WorkoutExercise {
  exercise: Exercise;
}

export interface HydratedLocalWorkoutSession extends Omit<WorkoutSession, "exercises"> {
  exercises: HydratedLocalWorkoutExercise[];
}

export interface HydratedCachedSplitExercise extends SplitExercise {
  exercise: Exercise;
}

export interface HydratedCachedSplitDay extends Omit<SplitDay, "exercises"> {
  exercises: HydratedCachedSplitExercise[];
}

const FALLBACK_EXERCISE: Exercise = {
  id: "unknown",
  name: "التمرين",
  primaryMuscle: "core",
  secondaryMuscles: [],
  workoutType: "custom",
  isCustom: true,
  createdBy: null,
};

function hasExerciseDetails(
  value: WorkoutExercise,
): value is WorkoutExercise & { exercise: Exercise } {
  return "exercise" in value && typeof value.exercise === "object" && value.exercise !== null;
}

export async function saveWorkoutLocally<T extends WorkoutSession>(session: T): Promise<T> {
  const db = getOfflineDatabase();
  const { exercises, ...sessionRow } = session;
  const now = new Date().toISOString();

  await db.transaction(
    "rw",
    [db.workoutSessions, db.workoutExercises, db.workoutSets, db.cachedExercises],
    async () => {
      await db.workoutSessions.put(sessionRow);

      const existingExercises = await db.workoutExercises
        .where("workoutSessionId")
        .equals(session.id)
        .toArray();
      const incomingExerciseIds = new Set(exercises.map((item) => item.id));
      const removedExercises = existingExercises.filter((item) => !incomingExerciseIds.has(item.id));

      for (const removed of removedExercises) {
        await db.workoutSets.where("workoutExerciseId").equals(removed.id).delete();
        await db.workoutExercises.delete(removed.id);
      }

      for (const workoutExercise of exercises) {
        const { sets } = workoutExercise;
        const exerciseRow = {
          id: workoutExercise.id,
          workoutSessionId: workoutExercise.workoutSessionId,
          exerciseId: workoutExercise.exerciseId,
          order: workoutExercise.order,
          isSessionOnlyAddition: workoutExercise.isSessionOnlyAddition,
          targetRepsMin: workoutExercise.targetRepsMin,
          targetRepsMax: workoutExercise.targetRepsMax,
          notes: workoutExercise.notes,
        };
        await db.workoutExercises.put(exerciseRow);

        const existingSets = await db.workoutSets
          .where("workoutExerciseId")
          .equals(workoutExercise.id)
          .toArray();
        const incomingSetIds = new Set(sets.map((set) => set.id));
        const staleSetIds = existingSets
          .filter((set) => !incomingSetIds.has(set.id))
          .map((set) => set.id);
        if (staleSetIds.length > 0) await db.workoutSets.bulkDelete(staleSetIds);
        if (sets.length > 0) await db.workoutSets.bulkPut(sets);

        if (hasExerciseDetails(workoutExercise)) {
          await db.cachedExercises.put({ ...workoutExercise.exercise, cachedAt: now });
        }
      }
    },
  );

  return session;
}

export async function getLocalWorkoutSession(
  sessionId: UUID,
): Promise<HydratedLocalWorkoutSession | null> {
  const db = getOfflineDatabase();
  const session = await db.workoutSessions.get(sessionId);
  if (!session) return null;

  const exerciseRows = await db.workoutExercises
    .where("workoutSessionId")
    .equals(sessionId)
    .sortBy("order");

  const exercises: HydratedLocalWorkoutExercise[] = [];
  for (const row of exerciseRows) {
    const [sets, exercise] = await Promise.all([
      db.workoutSets.where("workoutExerciseId").equals(row.id).sortBy("setNumber"),
      db.cachedExercises.get(row.exerciseId),
    ]);
    exercises.push({
      ...row,
      targetRepsMin: row.targetRepsMin ?? 1,
      targetRepsMax: row.targetRepsMax ?? 12,
      sets: sets.map((set) => ({ ...set, notes: set.notes ?? "" })),
      exercise: exercise ? stripCachedAt(exercise) : { ...FALLBACK_EXERCISE, id: row.exerciseId },
    });
  }

  return { ...session, exercises };
}

export async function getLocalActiveWorkout(
  userId?: UUID,
): Promise<HydratedLocalWorkoutSession | null> {
  const db = getOfflineDatabase();
  const candidates = await db.workoutSessions
    .where("status")
    .equals("in_progress")
    .toArray();
  candidates.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const session = candidates.find((item) => !userId || item.userId === userId);
  return session ? getLocalWorkoutSession(session.id) : null;
}

export async function getLocalWorkoutHistory(
  userId: UUID,
  limit = 100,
): Promise<HydratedLocalWorkoutSession[]> {
  const db = getOfflineDatabase();
  const rows = await db.workoutSessions
    .where("userId")
    .equals(userId)
    .filter((session) => session.status === "completed")
    .toArray();
  rows.sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
  const hydrated = await Promise.all(rows.slice(0, limit).map((row) => getLocalWorkoutSession(row.id)));
  return hydrated.filter((item): item is HydratedLocalWorkoutSession => item !== null);
}

export async function cacheExercises(exercises: Exercise[]): Promise<void> {
  if (exercises.length === 0) return;
  const db = getOfflineDatabase();
  const cachedAt = new Date().toISOString();
  await db.cachedExercises.bulkPut(exercises.map((exercise) => ({ ...exercise, cachedAt })));
}

export async function getCachedExercises(): Promise<Exercise[]> {
  const db = getOfflineDatabase();
  const rows = await db.cachedExercises.toArray();
  return rows.map(stripCachedAt);
}

export async function cachePersonalSplit(
  days: Array<Omit<SplitDay, "exercises"> & {
    exercises: Array<SplitExercise & { exercise?: Exercise }>;
  }>,
): Promise<void> {
  if (days.length === 0) return;
  const db = getOfflineDatabase();
  const cachedAt = new Date().toISOString();
  const ownerUserId = days[0]?.ownerUserId;

  await db.transaction("rw", [db.cachedSplits, db.cachedExercises], async () => {
    if (ownerUserId) {
      await db.cachedSplits.where("ownerUserId").equals(ownerUserId).delete();
    }

    const rows: CachedSplitRow[] = days.map((day) => ({
      ...day,
      exercises: day.exercises.map((item) => ({
        id: item.id,
        splitDayId: item.splitDayId,
        exerciseId: item.exerciseId,
        order: item.order,
        targetSets: item.targetSets,
        targetRepsMin: item.targetRepsMin,
        targetRepsMax: item.targetRepsMax,
        isPersonalAddition: item.isPersonalAddition,
      })),
      cachedAt,
    }));
    await db.cachedSplits.bulkPut(rows);

    const exerciseMap = new Map<string, Exercise>();
    for (const day of days) {
      for (const item of day.exercises) {
        if (item.exercise) exerciseMap.set(item.exercise.id, item.exercise);
      }
    }
    const exerciseRows: CachedExerciseRow[] = [...exerciseMap.values()].map((exercise) => ({
      ...exercise,
      cachedAt,
    }));
    if (exerciseRows.length > 0) await db.cachedExercises.bulkPut(exerciseRows);
  });
}

export async function getCachedPersonalSplit(
  userId: UUID,
): Promise<HydratedCachedSplitDay[]> {
  const db = getOfflineDatabase();
  const days = await db.cachedSplits.where("ownerUserId").equals(userId).toArray();
  const exercises = await db.cachedExercises.toArray();
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, stripCachedAt(exercise)]));

  return days.map((row) => ({
    id: row.id,
    ownerUserId: row.ownerUserId,
    groupId: row.groupId,
    weekday: row.weekday,
    workoutType: row.workoutType,
    displayName: row.displayName ?? null,
    focusLabel: row.focusLabel ?? (row.workoutType === "rest" ? "راحة" : "مخصص"),
    iconKey: row.iconKey ?? (row.workoutType === "rest" ? "moon" : "dumbbell"),
    colorKey: row.colorKey ?? (row.workoutType === "rest" ? "blue" : "indigo"),
    dayNotes: row.dayNotes ?? "",
    exercises: row.exercises.map((item) => ({
      ...item,
      exercise: exerciseMap.get(item.exerciseId) ?? { ...FALLBACK_EXERCISE, id: item.exerciseId },
    })),
  }));
}

export async function removeLocalWorkoutSession(sessionId: UUID): Promise<void> {
  const db = getOfflineDatabase();
  await db.transaction("rw", [db.workoutSessions, db.workoutExercises, db.workoutSets], async () => {
    const exercises = await db.workoutExercises.where("workoutSessionId").equals(sessionId).toArray();
    for (const exercise of exercises) {
      await db.workoutSets.where("workoutExerciseId").equals(exercise.id).delete();
    }
    await db.workoutExercises.where("workoutSessionId").equals(sessionId).delete();
    await db.workoutSessions.delete(sessionId);
  });
}

function stripCachedAt<T extends { cachedAt: string }>(row: T): Omit<T, "cachedAt"> {
  const { cachedAt, ...value } = row;
  void cachedAt;
  return value;
}

export async function cacheProfile(profile: UserProfile): Promise<void> {
  const db = getOfflineDatabase();
  await db.cachedProfiles.put({ ...profile, cachedAt: new Date().toISOString() });
}

export async function getCachedProfile(userId: UUID): Promise<UserProfile | null> {
  const db = getOfflineDatabase();
  const row = await db.cachedProfiles.get(userId);
  return row ? stripCachedAt(row) : null;
}

/**
 * Clears product data for one user without touching device preferences such as
 * language/theme. This is safe to run when that user is back in onboarding
 * after an intentional server-side reset.
 */
export async function clearLocalUserProductData(userId: UUID): Promise<void> {
  const db = getOfflineDatabase();
  const sessions = await db.workoutSessions.where("userId").equals(userId).toArray();
  const sessionIds = new Set(sessions.map((session) => session.id));
  const exercises = sessionIds.size > 0
    ? (await Promise.all([...sessionIds].map((sessionId) => db.workoutExercises.where("workoutSessionId").equals(sessionId).toArray()))).flat()
    : [];
  const exerciseIds = new Set(exercises.map((exercise) => exercise.id));

  await db.transaction(
    "rw",
    [db.workoutSessions, db.workoutExercises, db.workoutSets, db.syncQueue, db.cachedSplits, db.cachedProfiles],
    async () => {
      const queued = await db.syncQueue.toArray();
      const queueIds = queued
        .filter((row) => {
          const mutation = row.mutation;
          if (mutation.entity === "workoutSession") return mutation.payload.userId === userId;
          if (mutation.entity === "workoutExercise") return sessionIds.has(mutation.payload.workoutSessionId);
          return exerciseIds.has(mutation.payload.workoutExerciseId);
        })
        .map((row) => row.id);
      if (queueIds.length > 0) await db.syncQueue.bulkDelete(queueIds);

      for (const exercise of exercises) {
        await db.workoutSets.where("workoutExerciseId").equals(exercise.id).delete();
      }
      for (const sessionId of sessionIds) {
        await db.workoutExercises.where("workoutSessionId").equals(sessionId).delete();
      }
      if (sessionIds.size > 0) await db.workoutSessions.bulkDelete([...sessionIds]);
      await db.cachedSplits.where("ownerUserId").equals(userId).delete();
      await db.cachedProfiles.delete(userId);
    },
  );
}

/** Clears all user-scoped offline data on this device. Call after sign-out. */
export async function clearAllLocalPrivateData(): Promise<void> {
  const db = getOfflineDatabase();
  await db.transaction(
    "rw",
    [
      db.workoutSessions,
      db.workoutExercises,
      db.workoutSets,
      db.syncQueue,
      db.cachedSplits,
      db.cachedExercises,
      db.cachedProfiles,
    ],
    async () => {
      await Promise.all([
        db.workoutSessions.clear(),
        db.workoutExercises.clear(),
        db.workoutSets.clear(),
        db.syncQueue.clear(),
        db.cachedSplits.clear(),
        db.cachedExercises.clear(),
        db.cachedProfiles.clear(),
      ]);
    },
  );

  clearOvrldClientStorage();
}
