import { createClient } from "@/lib/supabase/client";
import { addDaysToDate, enumerateDateRange, getTodayISODate, getWeekdayFromDate, parseISODateOnly, toISODateOnly } from "@/lib/dates";
import { fetchPersonalSplit } from "@/features/splits/services/split.service";
import { fetchPlanAudit } from "@/features/splits/services/plan-audit.service";
import { fetchProgressIntelligence } from "@/features/progress/services/progress-intelligence.service";
import { fetchWorkoutHistory } from "@/features/workouts/services/workout-session.service";
import { hasCircumference, fetchBodyProgress } from "@/features/body-progress/services/body-progress.service";
import type { BodyMeasurement } from "@/features/body-progress/types";
import type { ISODateOnlyString, UUID, WorkoutType } from "@/types";
import { buildGainPlanCompatibility, estimateRecentWeeklyWeightChange, fetchGainModeProfile, estimateCalorieTarget } from "./gain-mode.service";
import { fetchGainNutritionRange, summarizeNutritionDay } from "./nutrition.service";
import type {
  GainAdaptiveDecision,
  GainCalorieAdjustment,
  GainCalorieAdjustmentSource,
  GainNutritionWindowSummary,
  GainReviewSnapshot,
  GainReviewWindow,
} from "../types";

type AdjustmentRow = {
  id: string;
  user_id: string;
  previous_target_kcal: number | null;
  new_target_kcal: number;
  reason: string;
  source: GainCalorieAdjustmentSource;
  review_period_start: string | null;
  review_period_end: string | null;
  created_at: string;
};

function mapAdjustment(row: AdjustmentRow): GainCalorieAdjustment {
  return {
    id: row.id,
    userId: row.user_id,
    previousTargetKcal: row.previous_target_kcal == null ? null : Number(row.previous_target_kcal),
    newTargetKcal: Number(row.new_target_kcal),
    reason: row.reason,
    source: row.source,
    reviewPeriodStart: row.review_period_start,
    reviewPeriodEnd: row.review_period_end,
    createdAt: row.created_at,
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildDateRange(startDate: ISODateOnlyString, endDate: ISODateOnlyString): ISODateOnlyString[] {
  const start = parseISODateOnly(startDate);
  const end = parseISODateOnly(endDate);
  const dates: ISODateOnlyString[] = [];
  for (let current = start; current <= end; current = addDaysToDate(current, 1)) dates.push(toISODateOnly(current));
  return dates;
}

async function fetchTrainingWindow(
  userId: UUID,
  startDate: ISODateOnlyString,
  endDate: ISODateOnlyString,
  history: Awaited<ReturnType<typeof fetchWorkoutHistory>>,
): Promise<{ completed: number; scheduled: number; adherence: number | null }> {
  const [split, overridesResult] = await Promise.all([
    fetchPersonalSplit(userId),
    createClient()
      .from("weekly_schedule_days")
      .select("schedule_date, workout_type")
      .eq("user_id", userId)
      .gte("schedule_date", startDate)
      .lte("schedule_date", endDate),
  ]);
  if (overridesResult.error) throw new Error(overridesResult.error.message);

  const baseTypes = new Map(split.map((day) => [day.weekday, day.workoutType]));
  const overrideTypes = new Map((overridesResult.data ?? []).map((day) => [day.schedule_date, day.workout_type as WorkoutType]));
  const scheduledDates = enumerateDateRange(parseISODateOnly(startDate), parseISODateOnly(endDate))
    .filter((date) => {
      const iso = toISODateOnly(date);
      return (overrideTypes.get(iso) ?? baseTypes.get(getWeekdayFromDate(date)) ?? "rest") !== "rest";
    })
    .map(toISODateOnly);
  const completedDates = new Set(history
    .filter((session) => session.scheduledDate >= startDate && session.scheduledDate <= endDate)
    .map((session) => session.scheduledDate));
  const completed = scheduledDates.filter((date) => completedDates.has(date)).length;
  return { completed, scheduled: scheduledDates.length, adherence: scheduledDates.length > 0 ? completed / scheduledDates.length : null };
}

async function fetchNutritionWindow(
  userId: UUID,
  startDate: ISODateOnlyString,
  endDate: ISODateOnlyString,
  calorieTargetKcal: number | null,
  proteinTargetGrams: number | null,
): Promise<GainNutritionWindowSummary> {
  const entries = await fetchGainNutritionRange(userId, startDate, endDate);
  const days = buildDateRange(startDate, endDate).map((date) => summarizeNutritionDay(
    date,
    entries.filter((entry) => entry.loggedOn === date),
    calorieTargetKcal,
    proteinTargetGrams,
  ));
  const logged = days.filter((day) => day.entries.length > 0);
  const calorieRatios = logged.flatMap((day) => day.calorieProgress === null ? [] : [day.calorieProgress]);
  const proteinRatios = logged.flatMap((day) => day.proteinProgress === null ? [] : [day.proteinProgress]);

  return {
    startDate,
    endDate,
    daysTotal: days.length,
    daysLogged: logged.length,
    averageCaloriesKcal: average(logged.map((day) => day.caloriesKcal)),
    averageProteinGrams: average(logged.map((day) => day.proteinGrams)),
    averageCalorieTargetRatio: average(calorieRatios),
    averageProteinTargetRatio: average(proteinRatios),
    calorieTargetHitDays: logged.filter((day) => day.calorieProgress !== null && day.calorieProgress >= 0.9).length,
    proteinTargetHitDays: logged.filter((day) => day.proteinProgress !== null && day.proteinProgress >= 0.85).length,
  };
}

function measurementSpanDays(measurements: BodyMeasurement[]): number {
  if (measurements.length < 2) return 0;
  const ordered = [...measurements].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  return Math.max(0, (new Date(ordered.at(-1)!.measuredAt).getTime() - new Date(ordered[0].measuredAt).getTime()) / 86_400_000);
}

function circumferenceDelta(
  latest: BodyMeasurement | null,
  baseline: BodyMeasurement | null,
  key: "waistCm" | "hipsCm" | "thighCm",
): number | null {
  const current = latest?.[key];
  const start = baseline?.[key];
  if (current == null || start == null) return null;
  return Math.round((current - start) * 10) / 10;
}

function chooseCircumferenceBaseline(measurements: BodyMeasurement[], latest: BodyMeasurement | null): BodyMeasurement | null {
  if (!latest) return null;
  const candidates = measurements
    .filter((item) => hasCircumference(item) && item.id !== latest.id)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  return candidates[0] ?? null;
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function buildDecision(input: {
  calorieTargetKcal: number | null;
  currentWeightKg: number | null;
  weeklyWeightChangeKg: number | null;
  nutrition: GainNutritionWindowSummary;
  trainingAdherence: number | null;
  workoutsScheduled: number;
  plan: Awaited<ReturnType<typeof fetchPlanAudit>>;
  lastAdjustment: GainCalorieAdjustment | null;
  weightReadingCount: number;
  weightSpanDays: number;
  periodStart: ISODateOnlyString;
  periodEnd: ISODateOnlyString;
}): GainAdaptiveDecision {
  const { calorieTargetKcal, currentWeightKg, weeklyWeightChangeKg, nutrition, trainingAdherence, workoutsScheduled, plan, lastAdjustment } = input;
  const observationDaysRemaining = lastAdjustment ? Math.max(0, 14 - daysSince(lastAdjustment.createdAt)) : 0;

  if (observationDaysRemaining > 0) {
    return {
      state: "observe",
      title: "لسه بنراقب آخر تعديل",
      detail: `فاضل ${observationDaysRemaining} يوم قبل ما نحكم على تعديل السعرات الأخير.`,
      reasonCode: "cooldown",
      suggestedCalorieTargetKcal: null,
      calorieDeltaKcal: null,
      canApply: false,
      observationDaysRemaining,
    };
  }

  if (!calorieTargetKcal || !currentWeightKg || input.weightReadingCount < 3 || input.weightSpanDays < 14 || weeklyWeightChangeKg === null) {
    return {
      state: "collect",
      title: "محتاجين داتا أكتر",
      detail: "كمّل الوزن والتسجيل حوالي أسبوعين قبل أي تعديل في السعرات.",
      reasonCode: "weight_data",
      suggestedCalorieTargetKcal: null,
      calorieDeltaKcal: null,
      canApply: false,
      observationDaysRemaining: 0,
    };
  }

  if (plan.trainingDays === 0 || plan.exerciseSlots === 0) {
    return {
      state: "hold",
      title: "ظبّط جدول التمرين الأول",
      detail: "Gain Mode محتاج جدول فعلي عشان يربط زيادة الوزن بالقوة والالتزام، مش بالأكل والميزان بس.",
      reasonCode: "training_plan_missing",
      suggestedCalorieTargetKcal: null,
      calorieDeltaKcal: null,
      canApply: false,
      observationDaysRemaining: 0,
    };
  }

  if (nutrition.daysLogged < 5) {
    return {
      state: "collect",
      title: "ثبّت تسجيل الأكل",
      detail: `مسجل ${nutrition.daysLogged} من 7 أيام. محتاجين 5 أيام على الأقل عشان القرار يبقى له معنى.`,
      reasonCode: "nutrition_logging",
      suggestedCalorieTargetKcal: null,
      calorieDeltaKcal: null,
      canApply: false,
      observationDaysRemaining: 0,
    };
  }

  if (workoutsScheduled > 0 && trainingAdherence !== null && trainingAdherence < 0.67) {
    return {
      state: "hold",
      title: "ثبّت التمرين الأول",
      detail: "التمرين الأسبوعي لسه مش ثابت كفاية. خلّيه منتظم قبل تعديل الخطة الغذائية.",
      reasonCode: "training_consistency",
      suggestedCalorieTargetKcal: null,
      calorieDeltaKcal: null,
      canApply: false,
      observationDaysRemaining: 0,
    };
  }

  if (nutrition.averageCalorieTargetRatio !== null && nutrition.averageCalorieTargetRatio < 0.9) {
    return {
      state: "hold",
      title: "وصّل للهدف الحالي الأول",
      detail: "متوسط أكلك أقل من هدف السعرات الحالي؛ زيادة الهدف دلوقتي مش هتحل المشكلة.",
      reasonCode: "current_target_not_met",
      suggestedCalorieTargetKcal: null,
      calorieDeltaKcal: null,
      canApply: false,
      observationDaysRemaining: 0,
    };
  }

  const weeklyRatePercent = (weeklyWeightChangeKg / currentWeightKg) * 100;
  if (weeklyRatePercent > 0.75) {
    return {
      state: "hold",
      title: "الوزن بيتحرك بسرعة",
      detail: "ثبّت السعرات دلوقتي وراجع اتجاه الوزن والقياسات بدل ما نزود أكتر.",
      reasonCode: "fast_gain",
      suggestedCalorieTargetKcal: null,
      calorieDeltaKcal: null,
      canApply: false,
      observationDaysRemaining: 0,
    };
  }

  if (weeklyRatePercent <= 0.1) {
    const nextTarget = Math.min(6000, calorieTargetKcal + 100);
    return {
      state: "suggest",
      title: "اقتراح: +100 kcal",
      detail: "الوزن شبه ثابت رغم إن التسجيل قريب من الهدف. تعديل صغير أحسن من قفزة كبيرة.",
      reasonCode: "flat_with_adherence",
      suggestedCalorieTargetKcal: nextTarget,
      calorieDeltaKcal: nextTarget - calorieTargetKcal,
      canApply: nextTarget > calorieTargetKcal,
      observationDaysRemaining: 0,
    };
  }

  return {
    state: "on_track",
    title: "كمّل بنفس الخطة",
    detail: "الوزن بيتحرك والتسجيل كفاية للحكم. مفيش داعي نغيّر السعرات دلوقتي.",
    reasonCode: "on_track",
    suggestedCalorieTargetKcal: null,
    calorieDeltaKcal: null,
    canApply: false,
    observationDaysRemaining: 0,
  };
}

export async function fetchGainCalorieAdjustments(userId: UUID, limit = 12): Promise<GainCalorieAdjustment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gain_calorie_adjustments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: unknown) => mapAdjustment(row as AdjustmentRow));
}

export async function applyGainCalorieAdjustment(
  userId: UUID,
  input: { targetCalorieKcal: number; reason: string; periodStart: ISODateOnlyString; periodEnd: ISODateOnlyString },
): Promise<number> {
  const supabase = createClient();
  // userId remains part of the public service contract; the RPC authorizes with auth.uid().
  void userId;
  const { data, error } = await supabase.rpc("apply_gain_calorie_adjustment", {
    target_calorie_kcal: Math.round(input.targetCalorieKcal),
    adjustment_reason: input.reason.slice(0, 240),
    adjustment_source: "adaptive_review",
    period_start: input.periodStart,
    period_end: input.periodEnd,
  });
  if (error) throw new Error(error.message);
  return Number(data);
}

export async function fetchGainReviewSnapshot(userId: UUID): Promise<GainReviewSnapshot | null> {
  const profile = await fetchGainModeProfile(userId);
  if (!profile || profile.status !== "active") return null;

  const [body, intelligence, history, adjustments, plan] = await Promise.all([
    fetchBodyProgress(userId),
    fetchProgressIntelligence(userId),
    fetchWorkoutHistory(userId),
    fetchGainCalorieAdjustments(userId).catch(() => []),
    fetchPlanAudit(userId),
  ]);

  const currentWeightKg = body.latest?.weightKg ?? body.start?.weightKg ?? null;
  const estimatedCalories = estimateCalorieTarget({
    weightKg: currentWeightKg,
    heightCm: body.goal?.heightCm ?? null,
    ageYears: profile.ageYears,
    activityLevel: profile.activityLevel,
    equationSex: profile.equationSex,
  });
  const calorieTargetKcal = profile.calorieTargetKcal ?? estimatedCalories;
  const proteinTargetGrams = profile.proteinTargetGrams ?? (currentWeightKg ? Math.round(currentWeightKg * 1.6) : null);

  const today = parseISODateOnly(getTodayISODate());
  const weekEnd = addDaysToDate(today, -1);
  const weekStart = addDaysToDate(weekEnd, -6);
  const monthEnd = weekEnd;
  const monthStart = addDaysToDate(monthEnd, -27);
  const weekStartISO = toISODateOnly(weekStart);
  const weekEndISO = toISODateOnly(weekEnd);
  const monthStartISO = toISODateOnly(monthStart);
  const monthEndISO = toISODateOnly(monthEnd);

  const [weekNutrition, monthNutrition, weekTraining, monthTraining] = await Promise.all([
    fetchNutritionWindow(userId, weekStartISO, weekEndISO, calorieTargetKcal, proteinTargetGrams),
    fetchNutritionWindow(userId, monthStartISO, monthEndISO, calorieTargetKcal, proteinTargetGrams),
    fetchTrainingWindow(userId, weekStartISO, weekEndISO, history),
    fetchTrainingWindow(userId, monthStartISO, monthEndISO, history),
  ]);

  const weeklyWeightChangeKg = estimateRecentWeeklyWeightChange(body.measurements);
  const validWeights = body.measurements.filter((item) => Number.isFinite(item.weightKg));
  const weightSpanDays = measurementSpanDays(validWeights);
  const lastAdjustment = adjustments[0] ?? null;
  const planCompatibility = buildGainPlanCompatibility(profile.physiqueFocus, plan);
  const decision = buildDecision({
    calorieTargetKcal,
    currentWeightKg,
    weeklyWeightChangeKg,
    nutrition: weekNutrition,
    trainingAdherence: weekTraining.adherence,
    workoutsScheduled: weekTraining.scheduled,
    plan,
    lastAdjustment,
    weightReadingCount: validWeights.length,
    weightSpanDays,
    periodStart: weekStartISO,
    periodEnd: weekEndISO,
  });

  const monthlyWeights = [...body.measurements]
    .filter((item) => item.measuredAt.slice(0, 10) >= monthStartISO && item.measuredAt.slice(0, 10) <= monthEndISO)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const monthWeightDeltaKg = monthlyWeights.length >= 2
    ? Math.round((monthlyWeights.at(-1)!.weightKg - monthlyWeights[0].weightKg) * 100) / 100
    : null;

  const latestCircumference = body.latestCircumference;
  const circumferenceBaseline = chooseCircumferenceBaseline(body.measurements, latestCircumference);
  const weekly: GainReviewWindow = {
    startDate: weekStartISO,
    endDate: weekEndISO,
    nutrition: weekNutrition,
    workoutsCompleted: weekTraining.completed,
    workoutsScheduled: weekTraining.scheduled,
    trainingAdherence: weekTraining.adherence,
    weightChangeKg: weeklyWeightChangeKg,
    improvingExercises: intelligence.improvingCount,
    trackedExercises: intelligence.trackedExercises,
  };
  const month28: GainReviewWindow = {
    startDate: monthStartISO,
    endDate: monthEndISO,
    nutrition: monthNutrition,
    workoutsCompleted: monthTraining.completed,
    workoutsScheduled: monthTraining.scheduled,
    trainingAdherence: monthTraining.adherence,
    weightChangeKg: monthWeightDeltaKg,
    improvingExercises: intelligence.improvingCount,
    trackedExercises: intelligence.trackedExercises,
  };

  return {
    calorieTargetKcal,
    proteinTargetGrams,
    weekly,
    month28,
    decision,
    measurements: {
      waistDeltaCm: circumferenceDelta(latestCircumference, circumferenceBaseline, "waistCm"),
      hipsDeltaCm: circumferenceDelta(latestCircumference, circumferenceBaseline, "hipsCm"),
      thighDeltaCm: circumferenceDelta(latestCircumference, circumferenceBaseline, "thighCm"),
      comparedFrom: circumferenceBaseline?.measuredAt ?? null,
      comparedTo: latestCircumference?.measuredAt ?? null,
    },
    adjustments,
    planCompatibility,
  };
}
