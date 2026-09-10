/**
 * Centralized application-facing domain types.
 *
 * Database rows use snake_case and are generated into
 * `src/lib/supabase/types.ts` after the Supabase migration is applied.
 * Feature services are responsible for mapping database rows to these
 * camelCase types.
 */

export type UUID = string;
export type ISODateString = string;
export type ISODateOnlyString = string;
export type TrainingLevel = "beginner" | "intermediate" | "advanced";
export type ProfileSex = "female" | "male";

// ---------------------------------------------------------------------------
// User & group
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: UUID;
  displayName: string;
  avatarUrl: string | null;
  ageYears: number | null;
  sex: ProfileSex | null;
  trainingLevel: TrainingLevel | null;
  weeklyTrainingDays: number | null;
  /** Legacy compatibility only. Rest days are defined by split_days.workoutType. */
  additionalRestDays: Weekday[];
  shareWorkoutSummary: boolean;
  sharePersonalRecords: boolean;
  shareWeights: boolean;
  createdAt: ISODateString;
  splitSetupMethod: SplitSetupMethod | null;
  splitSetupCompletedAt: ISODateString | null;
  updatedAt: ISODateString;
}

export interface WorkoutGroup {
  id: UUID;
  name: string;
  inviteCode: string;
  createdBy: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** True when this is a private one-person training workspace. */
  isPersonal: boolean;
  splitVersion: number;
  splitUpdatedAt: ISODateString;
}

export type GroupRole = "owner" | "admin" | "member";

export interface GroupMember {
  id: UUID;
  groupId: UUID;
  userId: UUID;
  role: GroupRole;
  joinedAt: ISODateString;
  seenSplitVersion: number;
}

// ---------------------------------------------------------------------------
// Split & schedule
// ---------------------------------------------------------------------------

export type Weekday =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export type WorkoutType = "push" | "pull" | "legs" | "rest" | "custom";
export type SplitSetupMethod = "manual" | "starter" | "imported";
export type SplitDayIconKey = "dumbbell" | "zap" | "target" | "flame" | "shield" | "heart" | "moon" | "activity";
export type SplitDayColorKey = "indigo" | "blue" | "emerald" | "amber" | "rose" | "violet";

export interface SplitExercise {
  id: UUID;
  splitDayId: UUID;
  exerciseId: UUID;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  isPersonalAddition: boolean;
}

export interface SplitDay {
  id: UUID;
  /** Null means the shared group split; otherwise this is a personal copy. */
  ownerUserId: UUID | null;
  groupId: UUID;
  weekday: Weekday;
  workoutType: WorkoutType;
  displayName: string | null;
  focusLabel: string | null;
  iconKey: SplitDayIconKey;
  colorKey: SplitDayColorKey;
  dayNotes: string;
  exercises: SplitExercise[];
}

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export interface Exercise {
  id: UUID;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  workoutType: Exclude<WorkoutType, "rest">;
  isCustom: boolean;
  createdBy: UUID | null;
}

// ---------------------------------------------------------------------------
// Workout sessions
// ---------------------------------------------------------------------------

/** A planned-but-not-started workout is derived from the schedule, not stored. */
export type WorkoutSessionStatus = "in_progress" | "completed" | "missed" | "cancelled";

export interface WorkoutSet {
  /** Generated on the client so retries can safely upsert the same record. */
  id: UUID;
  workoutExerciseId: UUID;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
  isPersonalRecord: boolean;
  notes: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface WorkoutExercise {
  /** Generated on the client so retries can safely upsert the same record. */
  id: UUID;
  workoutSessionId: UUID;
  exerciseId: UUID;
  order: number;
  isSessionOnlyAddition: boolean;
  targetRepsMin: number;
  targetRepsMax: number;
  notes: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: UUID;
  /** Separate idempotency key used by the sync API. */
  clientId: UUID;
  userId: UUID;
  groupId: UUID;
  splitDayId: UUID | null;
  scheduledDate: ISODateOnlyString;
  status: WorkoutSessionStatus;
  notes: string;
  durationSeconds: number;
  startedAt: ISODateString;
  completedAt: ISODateString | null;
  updatedAt: ISODateString;
  exercises: WorkoutExercise[];
}

// ---------------------------------------------------------------------------
// Personal records
// ---------------------------------------------------------------------------

export type PersonalRecordType = "max_weight" | "max_reps" | "max_volume";

export interface PersonalRecord {
  id: UUID;
  userId: UUID;
  exerciseId: UUID;
  type: PersonalRecordType;
  value: number;
  achievedAt: ISODateString;
  workoutSetId: UUID;
  /** Load and reps that produced the record, kept as useful context. */
  weightKg: number | null;
  reps: number | null;
}

// ---------------------------------------------------------------------------
// Group activity
// ---------------------------------------------------------------------------

export type GroupActivityType =
  | "workout_completed"
  | "personal_record"
  | "joined_group"
  | "streak_milestone";

export interface GroupActivity {
  id: UUID;
  groupId: UUID;
  userId: UUID;
  type: GroupActivityType;
  /** Temporary display snapshot; structured metadata supports future i18n. */
  message: string;
  metadata: Record<string, unknown>;
  createdAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Offline sync
// ---------------------------------------------------------------------------

export type SyncStatus = "idle" | "syncing" | "synced" | "error";
export type SyncQueueItemStatus = "pending" | "processing" | "failed";

export type OfflineMutation =
  | { entity: "workoutSession"; operation: "create" | "update"; payload: WorkoutSession }
  | { entity: "workoutExercise"; operation: "create" | "update" | "delete"; payload: WorkoutExercise }
  | { entity: "workoutSet"; operation: "create" | "update" | "delete"; payload: WorkoutSet };

export interface SyncQueueItem {
  id: UUID;
  idempotencyKey: UUID;
  mutation: OfflineMutation;
  status: SyncQueueItemStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  attempts: number;
  lastAttemptAt: ISODateString | null;
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Stopwatch
// ---------------------------------------------------------------------------

export interface StopwatchState {
  isRunning: boolean;
  startedAt: ISODateString | null;
  elapsedSeconds: number;
}
