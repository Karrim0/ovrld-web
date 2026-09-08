import { createClient } from "@/lib/supabase/client";
import type { Json, Tables } from "@/lib/supabase/types";
import type { Exercise, ISODateOnlyString, SplitExercise, UUID } from "@/types";
import { cachePersonalSplit, getCachedPersonalSplit } from "@/lib/offline";
import { addDaysToDate, getTrainingWeekStart, parseISODateOnly, toISODateOnly } from "@/lib/dates";
import { mapExercise } from "@/features/exercises/services/exercise.service";
import type {
  ImportedPlan,
  SplitDaySettingsInput,
  SplitDayWithDetails,
  SplitExerciseWithDetails,
  StarterPlanKey,
  WeeklyScheduleDayInput,
  WeeklyScheduleDayWithDetails,
} from "../types";

type SplitDayRow = Tables<"split_days">;
type SplitExerciseRow = Tables<"split_exercises">;
type ExerciseRow = Tables<"exercises">;
type WeeklyScheduleRow = Tables<"weekly_schedule_days">;

type SplitExerciseQueryRow = SplitExerciseRow & { exercises: ExerciseRow };
type SplitDayQueryRow = SplitDayRow & { split_exercises: SplitExerciseQueryRow[] };
type WeeklyScheduleQueryRow = WeeklyScheduleRow & { split_days: SplitDayQueryRow | null };

function mapSplitExercise(row: SplitExerciseQueryRow): SplitExerciseWithDetails {
  return {
    id: row.id,
    splitDayId: row.split_day_id,
    exerciseId: row.exercise_id,
    order: row.position,
    targetSets: row.target_sets,
    targetRepsMin: row.target_reps_min,
    targetRepsMax: row.target_reps_max,
    isPersonalAddition: row.is_personal_addition,
    exercise: mapExercise(row.exercises),
  };
}

function mapSplitDay(row: SplitDayQueryRow): SplitDayWithDetails {
  return {
    id: row.id,
    groupId: row.group_id,
    ownerUserId: row.owner_user_id,
    weekday: row.weekday,
    workoutType: row.workout_type,
    displayName: row.display_name,
    focusLabel: row.focus_label,
    iconKey: row.icon_key as SplitDayWithDetails["iconKey"],
    colorKey: row.color_key as SplitDayWithDetails["colorKey"],
    dayNotes: row.day_notes,
    exercises: [...row.split_exercises]
      .sort((a, b) => a.position - b.position)
      .map(mapSplitExercise),
  };
}

function mapWeeklyScheduleDay(row: WeeklyScheduleQueryRow): WeeklyScheduleDayWithDetails {
  const sourceDay = row.split_days ? mapSplitDay(row.split_days) : null;
  return {
    id: row.id,
    userId: row.user_id,
    groupId: row.group_id,
    scheduleDate: row.schedule_date,
    sourceSplitDayId: row.source_split_day_id,
    workoutType: row.workout_type,
    displayName: row.display_name,
    focusLabel: row.focus_label,
    iconKey: row.icon_key as WeeklyScheduleDayWithDetails["iconKey"],
    colorKey: row.color_key as WeeklyScheduleDayWithDetails["colorKey"],
    dayNotes: row.day_notes,
    isCustomized: row.is_customized,
    sourceDay,
    exercises: sourceDay?.exercises ?? [],
  };
}

async function fetchSplitRows(
  mode: "group" | "personal",
  identifier: UUID,
): Promise<SplitDayWithDetails[]> {
  const supabase = createClient();
  let query = supabase
    .from("split_days")
    .select("*, split_exercises(*, exercises(*))")
    .order("created_at", { ascending: true });

  query = mode === "group"
    ? query.eq("group_id", identifier).is("owner_user_id", null)
    : query.eq("owner_user_id", identifier);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as SplitDayQueryRow[]).map(mapSplitDay);
}

export async function fetchGroupSplit(groupId: UUID): Promise<SplitDayWithDetails[]> {
  return fetchSplitRows("group", groupId);
}

export async function fetchPersonalSplit(userId: UUID): Promise<SplitDayWithDetails[]> {
  const supabase = createClient();
  try {
    const { error } = await supabase.rpc("ensure_personal_split");
    if (error) throw new Error(error.message);
    const days = await fetchSplitRows("personal", userId);
    await cachePersonalSplit(days);
    return days;
  } catch (caught) {
    const cached = await getCachedPersonalSplit(userId);
    if (cached.length > 0) return cached;
    throw caught;
  }
}

export async function fetchEffectiveWeekSchedule(
  userId: UUID,
  anchorDate: ISODateOnlyString = toISODateOnly(new Date()),
): Promise<WeeklyScheduleDayWithDetails[]> {
  const supabase = createClient();
  const { error: ensureError } = await supabase.rpc("ensure_week_schedule", {
    target_anchor_date: anchorDate,
  });
  if (ensureError) throw new Error(ensureError.message);

  const weekStart = getTrainingWeekStart(parseISODateOnly(anchorDate));
  const weekEnd = addDaysToDate(weekStart, 6);
  const { data, error } = await supabase
    .from("weekly_schedule_days")
    .select("*, split_days:source_split_day_id(*, split_exercises(*, exercises(*)))")
    .eq("user_id", userId)
    .gte("schedule_date", toISODateOnly(weekStart))
    .lte("schedule_date", toISODateOnly(weekEnd))
    .order("schedule_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as WeeklyScheduleQueryRow[]).map(mapWeeklyScheduleDay);
}

export async function resetPersonalSplitToGroup(userId: UUID): Promise<SplitDayWithDetails[]> {
  const supabase = createClient();
  const { error } = await supabase.rpc("reset_personal_split_to_group");
  if (error) throw new Error(error.message);
  const days = await fetchSplitRows("personal", userId);
  await cachePersonalSplit(days);
  return days;
}

export async function updateSplitDaySettings(input: SplitDaySettingsInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_split_day_settings", {
    target_split_day_id: input.splitDayId,
    target_workout_type: input.workoutType,
    target_display_name: input.displayName.trim(),
    target_focus_label: input.focusLabel.trim(),
    target_icon_key: input.iconKey,
    target_color_key: input.colorKey,
    target_day_notes: input.dayNotes.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function updateWeeklyScheduleDay(input: WeeklyScheduleDayInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_week_schedule_day", {
    target_schedule_date: input.scheduleDate,
    target_source_split_day_id: input.sourceSplitDayId,
    target_workout_type: input.workoutType,
    target_display_name: input.displayName.trim(),
    target_focus_label: input.focusLabel.trim(),
    target_icon_key: input.iconKey,
    target_color_key: input.colorKey,
    target_day_notes: input.dayNotes.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function resetWeekSchedule(anchorDate: ISODateOnlyString): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("reset_week_schedule", { target_anchor_date: anchorDate });
  if (error) throw new Error(error.message);
}

export async function swapWeeklyScheduleDays(
  firstScheduleDate: ISODateOnlyString,
  secondScheduleDate: ISODateOnlyString,
): Promise<void> {
  if (firstScheduleDate === secondScheduleDate) return;
  const supabase = createClient();
  const { error } = await supabase.rpc("swap_week_schedule_days", {
    first_schedule_date: firstScheduleDate,
    second_schedule_date: secondScheduleDate,
  });
  if (error) throw new Error(error.message);
}

export async function applySplitTemplate(templateKey: StarterPlanKey): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("apply_split_template", { target_template_key: templateKey });
  if (error) throw new Error(error.message);
}

export async function applyImportedSplit(plan: ImportedPlan): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("apply_imported_split", {
    target_plan: plan as unknown as Json,
  });
  if (error) throw new Error(error.message);
}

export async function clearSplitDay(splitDayId: UUID): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("split_exercises").delete().eq("split_day_id", splitDayId);
  if (error) throw new Error(error.message);
}

export interface AddSplitExerciseInput {
  splitDayId: UUID;
  exercise: Exercise;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  isPersonalAddition?: boolean;
}

export async function addSplitExercise({
  splitDayId,
  exercise,
  targetSets = 2,
  targetRepsMin = 8,
  targetRepsMax = 12,
  isPersonalAddition = false,
}: AddSplitExerciseInput): Promise<SplitExercise> {
  const supabase = createClient();
  const { data: existingRows, error: positionError } = await supabase
    .from("split_exercises")
    .select("position")
    .eq("split_day_id", splitDayId)
    .order("position", { ascending: false })
    .limit(1);

  if (positionError) throw new Error(positionError.message);
  const position = (existingRows[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("split_exercises")
    .insert({
      split_day_id: splitDayId,
      exercise_id: exercise.id,
      position,
      target_sets: targetSets,
      target_reps_min: targetRepsMin,
      target_reps_max: targetRepsMax,
      is_personal_addition: isPersonalAddition,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("التمرين ده موجود في اليوم بالفعل.");
    throw new Error(error.message);
  }

  return {
    id: data.id,
    splitDayId: data.split_day_id,
    exerciseId: data.exercise_id,
    order: data.position,
    targetSets: data.target_sets,
    targetRepsMin: data.target_reps_min,
    targetRepsMax: data.target_reps_max,
    isPersonalAddition: data.is_personal_addition,
  };
}

export async function updateSplitExerciseTargets(
  splitExerciseId: UUID,
  values: { targetSets: number; targetRepsMin: number; targetRepsMax: number },
): Promise<void> {
  if (values.targetSets < 1 || values.targetSets > 20) throw new Error("عدد السِتات لازم يبقى من 1 لـ20.");
  if (values.targetRepsMin < 1 || values.targetRepsMax < values.targetRepsMin) {
    throw new Error("راجع نطاق العدات المستهدف.");
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("split_exercises")
    .update({
      target_sets: values.targetSets,
      target_reps_min: values.targetRepsMin,
      target_reps_max: values.targetRepsMax,
    })
    .eq("id", splitExerciseId);

  if (error) throw new Error(error.message);
}

export async function removeSplitExercise(splitExerciseId: UUID): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("split_exercises").delete().eq("id", splitExerciseId);
  if (error) throw new Error(error.message);
}

export async function moveSplitExercise(splitExerciseId: UUID, direction: -1 | 1): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("move_split_exercise", {
    target_split_exercise_id: splitExerciseId,
    direction,
  });
  if (error) throw new Error(error.message);
}
