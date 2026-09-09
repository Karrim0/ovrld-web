import type {
  Exercise,
  ISODateOnlyString,
  SplitDay,
  SplitDayColorKey,
  SplitDayIconKey,
  SplitExercise,
  UUID,
  WorkoutType,
} from "@/types";

export interface SplitExerciseWithDetails extends SplitExercise {
  exercise: Exercise;
}

export interface SplitDayWithDetails extends Omit<SplitDay, "exercises"> {
  exercises: SplitExerciseWithDetails[];
}

export interface WeeklyScheduleDayWithDetails {
  id: UUID;
  userId: UUID;
  groupId: UUID;
  scheduleDate: ISODateOnlyString;
  sourceSplitDayId: UUID | null;
  workoutType: WorkoutType;
  displayName: string;
  focusLabel: string;
  iconKey: SplitDayIconKey;
  colorKey: SplitDayColorKey;
  dayNotes: string;
  isCustomized: boolean;
  sourceDay: SplitDayWithDetails | null;
  exercises: SplitExerciseWithDetails[];
}

export interface SplitDaySettingsInput {
  splitDayId: UUID;
  workoutType: WorkoutType;
  displayName: string;
  focusLabel: string;
  iconKey: SplitDayIconKey;
  colorKey: SplitDayColorKey;
  dayNotes: string;
}

export interface WeeklyScheduleDayInput {
  scheduleDate: ISODateOnlyString;
  sourceSplitDayId: UUID;
  workoutType: WorkoutType;
  displayName: string;
  focusLabel: string;
  iconKey: SplitDayIconKey;
  colorKey: SplitDayColorKey;
  dayNotes: string;
}

export type StarterPlanKey = "manual" | "gain_glutes_4" | "full_body_3" | "upper_lower_4" | "ppl_ul_5" | "ppl_6";

export interface ImportedPlanExercise {
  name: string;
  primaryMuscle: Exercise["primaryMuscle"];
  sets: number;
  repsMin: number;
  repsMax: number;
  notes?: string;
  confidence?: number;
}

export interface ImportedPlanDay {
  weekday: SplitDay["weekday"];
  workoutType: WorkoutType;
  title: string;
  focus: string;
  iconKey: SplitDayIconKey;
  colorKey: SplitDayColorKey;
  notes: string;
  exercises: ImportedPlanExercise[];
}

export interface ImportedPlan {
  title: string;
  days: ImportedPlanDay[];
  warnings: string[];
}

export interface ReorderExercisesInput {
  splitDayId: SplitDay["id"];
  orderedExerciseIds: SplitExercise["id"][];
}

export interface EditSplitDayInput {
  splitDayId: SplitDay["id"];
  exercises: Pick<SplitExercise, "id" | "targetSets" | "targetRepsMin" | "targetRepsMax">[];
}
