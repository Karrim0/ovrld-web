import { createClient } from "@/lib/supabase/client";
import { fetchBodyProgress } from "@/features/body-progress/services/body-progress.service";
import { fetchAdherenceSummary } from "@/features/progress/services/progress.service";
import { fetchProgressIntelligence } from "@/features/progress/services/progress-intelligence.service";
import type { UUID } from "@/types";
import { fetchGainNutritionDay, summarizeNutritionDay } from "./nutrition.service";
import { getTodayISODate } from "@/lib/dates";
import type {
  GainActivityLevel,
  GainAppetiteLevel,
  GainDietPattern,
  GainModeProfile,
  GainModeSnapshot,
  GainModeStatus,
  GainWeeklyReview,
  GainNutritionMode,
} from "../types";

type GainModeRow = {
  user_id: string;
  status: GainModeStatus;
  age_years: number;
  activity_level: GainActivityLevel;
  appetite_level: GainAppetiteLevel;
  meal_size_difficulty: boolean;
  diet_pattern: GainDietPattern;
  nutrition_mode: GainNutritionMode;
  calorie_target_kcal: number | null;
  protein_target_grams: number | string | null;
  created_at: string;
  updated_at: string;
};

function mapProfile(row: GainModeRow): GainModeProfile {
  return {
    userId: row.user_id,
    status: row.status,
    ageYears: row.age_years,
    activityLevel: row.activity_level,
    appetiteLevel: row.appetite_level,
    mealSizeDifficulty: row.meal_size_difficulty,
    dietPattern: row.diet_pattern,
    nutritionMode: row.nutrition_mode,
    calorieTargetKcal: row.calorie_target_kcal == null ? null : Number(row.calorie_target_kcal),
    proteinTargetGrams: row.protein_target_grams == null ? null : Number(row.protein_target_grams),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface SaveGainModeProfileInput {
  ageYears: number;
  activityLevel: GainActivityLevel;
  appetiteLevel: GainAppetiteLevel;
  mealSizeDifficulty: boolean;
  dietPattern: GainDietPattern;
  nutritionMode?: GainNutritionMode;
}

export async function saveGainModeProfile(userId: UUID, input: SaveGainModeProfileInput): Promise<GainModeProfile> {
  const supabase = createClient();
  const payload = {
    status: "active" as const,
    age_years: input.ageYears,
    activity_level: input.activityLevel,
    appetite_level: input.appetiteLevel,
    meal_size_difficulty: input.mealSizeDifficulty,
    diet_pattern: input.dietPattern,
    nutrition_mode: input.nutritionMode ?? "simple",
  };

  // Keep Phase 8 nutrition target overrides intact when the user edits the older Gain Mode settings.
  const { data: existing, error: lookupError } = await supabase
    .from("gain_mode_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  const query = existing
    ? supabase.from("gain_mode_profiles").update(payload).eq("user_id", userId)
    : supabase.from("gain_mode_profiles").insert({ user_id: userId, ...payload });
  const { data, error } = await query.select("*").single();

  if (error) throw new Error(error.message);
  return mapProfile(data as GainModeRow);
}

export async function fetchGainModeProfile(userId: UUID): Promise<GainModeProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gain_mode_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProfile(data as GainModeRow) : null;
}

export async function completeOnboarding(userId: UUID): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Protein reference target for resistance training. The 1.6 g/kg point is a practical
 * reference from a large meta-analysis, not a medical prescription.
 */
export function estimateProteinTarget(weightKg: number | null): number | null {
  if (!weightKg || weightKg <= 0) return null;
  return Math.round(weightKg * 1.6);
}

/**
 * Starting calorie estimate for adult women using Mifflin-St Jeor REE, a broad activity
 * multiplier, then a conservative +300 kcal starting surplus. It is intentionally labelled
 * as an estimate in the UI and can be overridden by the user.
 */
export function estimateCalorieTarget(input: {
  weightKg: number | null;
  heightCm: number | null;
  ageYears: number;
  activityLevel: GainActivityLevel;
}): number | null {
  const { weightKg, heightCm, ageYears, activityLevel } = input;
  if (!weightKg || !heightCm || !ageYears || weightKg <= 0 || heightCm <= 0 || ageYears <= 0) return null;
  const ree = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  const factor = activityLevel === "light" ? 1.35 : activityLevel === "high" ? 1.7 : 1.5;
  const target = ree * factor + 300;
  return Math.max(800, Math.min(6000, Math.round(target / 50) * 50));
}

function strategyFor(profile: GainModeProfile): Pick<GainModeSnapshot, "primaryNutritionAction" | "supportDetail"> {
  if (profile.appetiteLevel === "low" || profile.mealSizeDifficulty) {
    return {
      primaryNutritionAction: "قسّمي الأكل بدل ما تكبّري الوجبة",
      supportDetail: "وجبات أصغر وسناكس أكتر غالبًا أسهل من إجبار نفسك على وجبة ضخمة.",
    };
  }
  if (profile.activityLevel === "high") {
    return {
      primaryNutritionAction: "ثبّتي أكلك في الأيام النشيطة",
      supportDetail: "النشاط العالي ممكن يستهلك الزيادة بسهولة، فخلي التسجيل والوجبات ثابتين.",
    };
  }
  return {
    primaryNutritionAction: "ثبّتي الزيادة اليومية",
    supportDetail: "خلي الأرقام ثابتة الأول، وبعدها اتجاه الوزن هو اللي يحدد لو محتاجين تعديل.",
  };
}

function dietSupportFor(profile: GainModeProfile): string | null {
  if (profile.dietPattern === "vegan") {
    return "وزّعي مصادر البروتين والطاقة النباتية على اليوم: صويا/توفو، بقول، مكسرات وزبداتها، وحبوب أو بدائل مناسبة ليكي.";
  }
  if (profile.dietPattern === "vegetarian") {
    return "وزّعي مصادر البروتين المناسبة ليكي على اليوم؛ ألبان/بيض لو بتستخدميهم، ومعاهم بقول وصويا ومكسرات.";
  }
  return null;
}

export function estimateRecentWeeklyWeightChange(
  measurements: Array<{ measuredAt: string; weightKg: number }>,
): number | null {
  if (measurements.length < 3) return null;

  const chronological = [...measurements]
    .filter((item) => Number.isFinite(item.weightKg) && Number.isFinite(new Date(item.measuredAt).getTime()))
    .sort((left, right) => new Date(left.measuredAt).getTime() - new Date(right.measuredAt).getTime());
  if (chronological.length < 3) return null;

  const latestAt = new Date(chronological.at(-1)!.measuredAt).getTime();
  const recent = chronological.filter((item) => latestAt - new Date(item.measuredAt).getTime() <= 21 * 86_400_000);
  if (recent.length < 3) return null;

  const firstAt = new Date(recent[0].measuredAt).getTime();
  const lastAt = new Date(recent.at(-1)!.measuredAt).getTime();
  const spanDays = (lastAt - firstAt) / 86_400_000;
  if (spanDays < 14) return null;

  const xs = recent.map((item) => (new Date(item.measuredAt).getTime() - firstAt) / 86_400_000);
  const ys = recent.map((item) => item.weightKg);
  const xMean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const yMean = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const numerator = xs.reduce((sum, value, index) => sum + (value - xMean) * (ys[index] - yMean), 0);
  const denominator = xs.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
  if (denominator <= 0) return null;

  return (numerator / denominator) * 7;
}

function buildWeeklyReview(
  profile: GainModeProfile,
  body: Awaited<ReturnType<typeof fetchBodyProgress>>,
  adherence: Awaited<ReturnType<typeof fetchAdherenceSummary>>,
  intelligence: Awaited<ReturnType<typeof fetchProgressIntelligence>>,
): GainWeeklyReview {
  const latest = body.latest;
  if (!latest || (body.nextWeighInAt && new Date(body.nextWeighInAt).getTime() <= Date.now())) {
    return { tone: "collect", title: latest ? "معاد الوزن جه" : "سجّلي نقطة البداية", detail: "سجّلي الوزن في ظروف متشابهة قدر الإمكان.", cta: "سجّلي الوزن", href: "/progress/body", weeklyWeightChangeKg: null };
  }

  const targetWeight = body.goal?.targetWeightKg ?? null;
  if (targetWeight !== null && latest.weightKg >= targetWeight) {
    return { tone: "steady", title: "وصلتي للهدف المسجل 🎯", detail: "راجعي اتجاه الوزن والقوة قبل اختيار هدف جديد.", cta: "راجعي الوزن", href: "/progress/body", weeklyWeightChangeKg: null };
  }

  const weeklyWeightChangeKg = estimateRecentWeeklyWeightChange(body.measurements);
  if (weeklyWeightChangeKg === null) {
    return { tone: "collect", title: "بنبني اتجاه الوزن", detail: "3 قراءات عبر حوالي أسبوعين تدي إشارة أحسن من قراءة واحدة.", cta: "سجّلي الوزن", href: "/progress/body", weeklyWeightChangeKg: null };
  }

  if (weeklyWeightChangeKg <= 0.05) {
    const lowAdherence = adherence.weeklyScheduled > 0 && adherence.weekly !== null && adherence.weekly < 0.67;
    if (lowAdherence) {
      return { tone: "training", title: "ثبّتي الأسبوع الأول", detail: "ثبّتي التمرين والتسجيل قبل تغيير الهدف الغذائي.", cta: "افتحي التمرين", href: "/workout/today", weeklyWeightChangeKg };
    }
    if (profile.appetiteLevel === "low" || profile.mealSizeDifficulty) {
      return { tone: "adjust", title: "الوزن ثابت · إضافة سهلة", detail: "زودي سناك أو إضافة ثابتة بدل وجبة أكبر.", cta: "سجّلي أكلك", href: "/progress/gain#nutrition", weeklyWeightChangeKg };
    }
    return { tone: "adjust", title: "الوزن ثابت · راجعي الأكل", detail: "ثبّتي هدف السعرات كام يوم قبل أي قفزة كبيرة.", cta: "راجعي اليوم", href: "/progress/gain#nutrition", weeklyWeightChangeKg };
  }

  if (intelligence.improvingCount > 0) {
    return { tone: "steady", title: "الوزن والقوة بيتحسنوا", detail: "الاتجاه كويس؛ خليكِ ثابتة بدل تغيير الخطة بسرعة.", cta: "شوفي التقدم", href: "/progress", weeklyWeightChangeKg };
  }

  return { tone: "steady", title: "الوزن بيتحرك صح", detail: "كمّلي بنفس الإيقاع وراقبي القوة مع الوزن.", cta: "شوفي الوزن", href: "/progress/body", weeklyWeightChangeKg };
}

export function getDailyNutritionStatus(snapshot: Pick<GainModeSnapshot, "todayNutrition">): string {
  const day = snapshot.todayNutrition;
  const caloriesLeft = day.calorieTargetKcal === null ? null : Math.max(0, day.calorieTargetKcal - day.caloriesKcal);
  const proteinLeft = day.proteinTargetGrams === null ? null : Math.max(0, Math.round(day.proteinTargetGrams - day.proteinGrams));
  if (day.entries.length === 0) return "لسه مسجلتيش أكل النهارده";
  if ((day.calorieProgress ?? 0) >= 0.95 && (day.proteinProgress ?? 0) >= 0.9) return "يومك قريب جدًا من الخطة";
  if (caloriesLeft !== null && proteinLeft !== null) return `باقي ${caloriesLeft} kcal · ${proteinLeft}g بروتين`;
  if (caloriesLeft !== null) return `باقي ${caloriesLeft} kcal`;
  return "كمّلي تسجيل اليوم";
}

export async function fetchGainModeSnapshot(userId: UUID): Promise<GainModeSnapshot | null> {
  const profile = await fetchGainModeProfile(userId);
  if (!profile || profile.status !== "active") return null;

  const [body, adherence, intelligence] = await Promise.all([
    fetchBodyProgress(userId),
    fetchAdherenceSummary(userId),
    fetchProgressIntelligence(userId),
  ]);
  const weightKg = body.latest?.weightKg ?? body.start?.weightKg ?? null;
  const estimatedCalories = estimateCalorieTarget({
    weightKg,
    heightCm: body.goal?.heightCm ?? null,
    ageYears: profile.ageYears,
    activityLevel: profile.activityLevel,
  });
  const estimatedProtein = estimateProteinTarget(weightKg);
  const calorieTargetKcal = profile.calorieTargetKcal ?? estimatedCalories;
  const proteinTargetGrams = profile.proteinTargetGrams ?? estimatedProtein;
  let nutritionAvailable = true;
  const todayNutrition = await fetchGainNutritionDay(userId, undefined, calorieTargetKcal, proteinTargetGrams).catch(() => {
    nutritionAvailable = false;
    return summarizeNutritionDay(getTodayISODate(), [], calorieTargetKcal, proteinTargetGrams);
  });
  const strategy = strategyFor(profile);

  return {
    profile,
    body,
    calorieTargetKcal,
    calorieTargetIsEstimate: profile.calorieTargetKcal === null,
    proteinTargetGrams,
    proteinTargetIsEstimate: profile.proteinTargetGrams === null,
    todayNutrition,
    nutritionAvailable,
    ...strategy,
    dietSupportDetail: dietSupportFor(profile),
    review: buildWeeklyReview(profile, body, adherence, intelligence),
  };
}
