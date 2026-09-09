import { addDaysToDate, getTodayISODate, toISODateOnly } from "@/lib/dates";
import { fetchBodyProgress, hasCircumference } from "@/features/body-progress/services/body-progress.service";
import { fetchWorkoutHistory } from "@/features/workouts/services/workout-session.service";
import type { ISODateOnlyString, ISODateString, UUID } from "@/types";
import { fetchGainModeProfile } from "./gain-mode.service";
import { fetchGainNutritionRange, summarizeNutritionDay } from "./nutrition.service";

export type GainHistoryEventType = "nutrition" | "weight" | "measurements" | "workout";

export interface GainHistoryEvent {
  id: string;
  type: GainHistoryEventType;
  date: ISODateOnlyString;
  timestamp: ISODateString;
  title: string;
  primary: string;
  secondary: string;
  meta: string[];
}

export interface GainHistorySnapshot {
  startDate: ISODateOnlyString;
  endDate: ISODateOnlyString;
  events: GainHistoryEvent[];
}

function numberText(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export async function fetchGainHistory(userId: UUID, days = 90): Promise<GainHistorySnapshot> {
  const endDate = getTodayISODate();
  const startDate = toISODateOnly(addDaysToDate(new Date(), -(Math.max(7, Math.min(days, 365)) - 1)));

  const [profile, body, nutritionEntries, workouts] = await Promise.all([
    fetchGainModeProfile(userId),
    fetchBodyProgress(userId),
    fetchGainNutritionRange(userId, startDate, endDate).catch(() => []),
    fetchWorkoutHistory(userId),
  ]);

  const events: GainHistoryEvent[] = [];
  const targetCalories = profile?.calorieTargetKcal ?? null;
  const targetProtein = profile?.proteinTargetGrams ?? null;

  const nutritionDates = [...new Set(nutritionEntries.map((entry) => entry.loggedOn))];
  for (const date of nutritionDates) {
    const entries = nutritionEntries.filter((entry) => entry.loggedOn === date);
    const summary = summarizeNutritionDay(date, entries, targetCalories, targetProtein);
    const timestamp = entries.map((entry) => entry.createdAt).sort().at(-1) ?? `${date}T12:00:00.000Z`;
    events.push({
      id: `nutrition:${date}`,
      type: "nutrition",
      date,
      timestamp,
      title: "تسجيل الأكل",
      primary: `${summary.caloriesKcal.toLocaleString("en-US")} kcal`,
      secondary: `${numberText(summary.proteinGrams)}g بروتين`,
      meta: [`${entries.length} تسجيل${entries.length === 1 ? "" : "ات"}`],
    });
  }

  for (const measurement of body.measurements) {
    const date = measurement.measuredAt.slice(0, 10);
    if (date < startDate || date > endDate) continue;
    const circumference = hasCircumference(measurement);
    const circumferenceMeta = [
      measurement.waistCm == null ? null : `وسط ${numberText(measurement.waistCm)} سم`,
      measurement.hipsCm == null ? null : `أرداف ${numberText(measurement.hipsCm)} سم`,
      measurement.chestCm == null ? null : `صدر ${numberText(measurement.chestCm)} سم`,
      measurement.thighCm == null ? null : `فخذ ${numberText(measurement.thighCm)} سم`,
    ].filter((value): value is string => Boolean(value));
    events.push({
      id: `body:${measurement.id}`,
      type: circumference ? "measurements" : "weight",
      date,
      timestamp: measurement.measuredAt,
      title: circumference ? "قياسات الجسم" : "الوزن",
      primary: `${numberText(measurement.weightKg)} كجم`,
      secondary: circumference ? "تحديث الوزن والقياسات" : "قراءة وزن",
      meta: circumferenceMeta,
    });
  }

  for (const session of workouts) {
    const date = session.scheduledDate;
    if (date < startDate || date > endDate) continue;
    const completedSets = session.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length, 0);
    const volume = session.exercises.reduce((sum, exercise) => sum + exercise.sets.reduce((inner, set) => inner + ((set.weightKg ?? 0) * (set.reps ?? 0)), 0), 0);
    events.push({
      id: `workout:${session.id}`,
      type: "workout",
      date,
      timestamp: session.completedAt ?? session.updatedAt,
      title: "تمرين مكتمل",
      primary: `${session.exercises.length} تمارين · ${completedSets} سِت`,
      secondary: session.durationSeconds > 0 ? `${Math.round(session.durationSeconds / 60)} دقيقة` : "اتسجل في Gym Mode",
      meta: volume > 0 ? [`${Math.round(volume).toLocaleString("en-US")} كجم volume`] : [],
    });
  }

  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { startDate, endDate, events };
}
