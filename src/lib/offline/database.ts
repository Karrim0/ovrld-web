import Dexie, { type EntityTable } from "dexie";
import { OFFLINE_DATABASE_NAME } from "@/lib/constants";
import { OFFLINE_TABLE_NAMES } from "./schema";
import type {
  CachedExerciseRow,
  CachedSplitRow,
  CachedProfileRow,
  SyncQueueRow,
  WorkoutExerciseRow,
  WorkoutSessionRow,
  WorkoutSetRow,
} from "./schema";

class OvrldDatabase extends Dexie {
  workoutSessions!: EntityTable<WorkoutSessionRow, "id">;
  workoutExercises!: EntityTable<WorkoutExerciseRow, "id">;
  workoutSets!: EntityTable<WorkoutSetRow, "id">;
  syncQueue!: EntityTable<SyncQueueRow, "id">;
  cachedSplits!: EntityTable<CachedSplitRow, "id">;
  cachedExercises!: EntityTable<CachedExerciseRow, "id">;
  cachedProfiles!: EntityTable<CachedProfileRow, "id">;

  constructor() {
    super(OFFLINE_DATABASE_NAME);

    this.version(1).stores({
      [OFFLINE_TABLE_NAMES.workoutSessions]: "id, userId, groupId, scheduledDate, status, clientId, updatedAt",
      [OFFLINE_TABLE_NAMES.workoutExercises]: "id, workoutSessionId, exerciseId, order",
      [OFFLINE_TABLE_NAMES.workoutSets]: "id, workoutExerciseId, setNumber, updatedAt",
      [OFFLINE_TABLE_NAMES.syncQueue]: "id, idempotencyKey, status, createdAt, updatedAt",
      [OFFLINE_TABLE_NAMES.cachedSplits]: "id, groupId, ownerUserId, weekday",
      [OFFLINE_TABLE_NAMES.cachedExercises]: "id, workoutType",
    });

    // Version 2 keeps the same keys while allowing cached split rows to hold
    // their exercise templates. Dexie stores additional object fields without
    // requiring an index migration.
    this.version(2).stores({
      [OFFLINE_TABLE_NAMES.workoutSessions]: "id, userId, groupId, scheduledDate, status, clientId, updatedAt",
      [OFFLINE_TABLE_NAMES.workoutExercises]: "id, workoutSessionId, exerciseId, order",
      [OFFLINE_TABLE_NAMES.workoutSets]: "id, workoutExerciseId, setNumber, updatedAt",
      [OFFLINE_TABLE_NAMES.syncQueue]: "id, idempotencyKey, status, createdAt, updatedAt",
      [OFFLINE_TABLE_NAMES.cachedSplits]: "id, groupId, ownerUserId, weekday, cachedAt",
      [OFFLINE_TABLE_NAMES.cachedExercises]: "id, workoutType, cachedAt",
    });

    this.version(3).stores({
      [OFFLINE_TABLE_NAMES.workoutSessions]: "id, userId, groupId, scheduledDate, status, clientId, updatedAt",
      [OFFLINE_TABLE_NAMES.workoutExercises]: "id, workoutSessionId, exerciseId, order",
      [OFFLINE_TABLE_NAMES.workoutSets]: "id, workoutExerciseId, setNumber, updatedAt",
      [OFFLINE_TABLE_NAMES.syncQueue]: "id, idempotencyKey, status, createdAt, updatedAt",
      [OFFLINE_TABLE_NAMES.cachedSplits]: "id, groupId, ownerUserId, weekday, cachedAt",
      [OFFLINE_TABLE_NAMES.cachedExercises]: "id, workoutType, cachedAt",
      [OFFLINE_TABLE_NAMES.cachedProfiles]: "id, updatedAt, cachedAt",
    });
  }
}

let dbInstance: OvrldDatabase | null = null;

export function getOfflineDatabase(): OvrldDatabase {
  if (typeof window === "undefined") {
    throw new Error("getOfflineDatabase() can only be called in the browser.");
  }
  if (!dbInstance) {
    dbInstance = new OvrldDatabase();
  }
  return dbInstance;
}
