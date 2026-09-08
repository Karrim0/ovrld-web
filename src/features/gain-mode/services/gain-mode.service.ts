import { createClient } from "@/lib/supabase/client";
import { fetchBodyProgress } from "@/features/body-progress/services/body-progress.service";
import { fetchAdherenceSummary } from "@/features/progress/services/progress.service";
import { fetchProgressIntelligence } from "@/features/progress/services/progress-intelligence.service";
import type { UUID } from "@/types";
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
  const { data, error } = await supabase
    .from("gain_mode_profiles")
    .upsert({
      user_id: userId,
      status: "active",
      age_years: input.ageYears,
      activity_level: input.activityLevel,
      appetite_level: input.appetiteLevel,
      meal_size_difficulty: input.mealSizeDifficulty,
      diet_pattern: input.dietPattern,
      nutrition_mode: input.nutritionMode ?? "simple",
    }, { onConflict: "user_id" })
    .select("*")
    .single();

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

export function estimateProteinTarget(weightKg: number | null): number | null {
  if (!weightKg || weightKg <= 0) return null;
  return Math.round(weightKg * 1.6);
}

function strategyFor(profile: GainModeProfile): Pick<GainModeSnapshot, "primaryNutritionAction" | "supportDetail"> {
  if (profile.appetiteLevel === "low" || profile.mealSizeDifficulty) {
    return {
      primaryNutritionAction: "قسّمي الأكل بدل ما تكبّري الوجبة",
      supportDetail: "ابدئي بوجبات أصغر وسناكس أكتر، وزوّدي سعرات للأكل اللي أصلًا بتحبيه. المشروبات الكثيفة بالسعرات ممكن تساعد بين الوجبات.",
    };
  }
  if (profile.activityLevel === "high") {
    return {
      primaryNutritionAction: "ثبّتي أكلك في الأيام النشيطة",
      supportDetail: "نشاطك العالي ممكن يستهلك الزيادة بسهولة. خليكِ ثابتة على الوجبات والسناكس وراجعي اتجاه الوزن بدل الاعتماد على الإحساس.",
    };
  }
  return {
    primaryNutritionAction: "زيادة هادية وثابتة",
    supportDetail: "كبداية عامة، زيادة تدريجية في الطاقة أفضل من الأكل العشوائي. هنراجع اتجاه الوزن والالتزام قبل أي تعديل كبير.",
  };
}

function dietSupportFor(profile: GainModeProfile): string | null {
  if (profile.dietPattern === "vegan") {
    return "بما إن نمطك Vegan، خلي مصادر البروتين والطاقة النباتية متوزعة على اليوم: صويا/توفو، بقول، مكسرات وزبداتها، وحبوب أو بدائل مناسبة ليكي.";
  }
  if (profile.dietPattern === "vegetarian") {
    return "بما إن نمطك نباتي، وزّعي مصادر البروتين المناسبة ليكي على اليوم؛ ألبان/بيض لو بتستخدميهم، ومعاهم بقول وصويا ومكسرات حسب راحتك.";
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
    return { tone: "collect", title: latest ? "معاد الوزن جه" : "سجّلي نقطة البداية", detail: "نفس الظروف قدر الإمكان، ومن غير ما نحكم على قراءة واحدة.", cta: "سجّلي الوزن", href: "/progress/body", weeklyWeightChangeKg: null };
  }

  const targetWeight = body.goal?.targetWeightKg ?? null;
  if (targetWeight !== null && latest.weightKg >= targetWeight) {
    return { tone: "steady", title: "وصلتي للهدف المسجل 🎯", detail: "ثبّتي الروتين شوية وراجعي اتجاه الوزن والقوة قبل ما تختاري هدف جديد.", cta: "راجعي الرحلة", href: "/progress/gain", weeklyWeightChangeKg: null };
  }

  const weeklyWeightChangeKg = estimateRecentWeeklyWeightChange(body.measurements);

  if (weeklyWeightChangeKg === null) {
    return { tone: "collect", title: "لسه بنبني اتجاه الوزن", detail: "محتاجين 3 قراءات على الأقل عبر حوالي أسبوعين قبل أي تعديل. كمّلي القياسات والتمرين.", cta: "شوفي الرحلة", href: "/progress/body", weeklyWeightChangeKg: null };
  }

  if (weeklyWeightChangeKg <= 0.05) {
    const lowAdherence = adherence.weeklyScheduled > 0 && adherence.weekly !== null && adherence.weekly < 0.67;
    if (lowAdherence) {
      return { tone: "training", title: "الوزن ثابت، بس الأول ثبّتي الأسبوع", detail: "قبل ما نزود الأكل أو نغير الخطة، خلّي تمرينك والتسجيل ثابتين عشان نعرف إحنا بنقيس إيه.", cta: "افتحي تمرينك", href: "/workout/today", weeklyWeightChangeKg };
    }
    if (profile.appetiteLevel === "low" || profile.mealSizeDifficulty) {
      return { tone: "adjust", title: "الوزن شبه ثابت · جرّبي إضافة سهلة", detail: "بدل وجبة أكبر، ثبّتي سناك أو إضافة كثيفة بالسعرات يوميًا وراجعي الاتجاه في القياسات الجاية.", cta: "راجعي Gain Mode", href: "/progress/gain", weeklyWeightChangeKg };
    }
    return { tone: "adjust", title: "الوزن شبه ثابت · محتاجين زيادة بسيطة", detail: "اعملي تعديل صغير وثابت في الأكل بدل قفزة كبيرة، وبعدها خلي الميزان والالتزام يقولوا إذا كان التعديل كفاية.", cta: "راجعي Gain Mode", href: "/progress/gain", weeklyWeightChangeKg };
  }

  if (intelligence.improvingCount > 0) {
    return { tone: "steady", title: "الوزن بيتحرك والقوة بتتحسن", detail: "دي إشارة كويسة إن الـprocess ماشية. ما تغيريش حاجة كبيرة لمجرد قراءة واحدة.", cta: "شوفي التقدم", href: "/progress", weeklyWeightChangeKg };
  }

  return { tone: "steady", title: "الوزن بيتحرك في الاتجاه المطلوب", detail: "كمّلي بنفس الإيقاع وخلي تسجيل التمرين يوضح هل القوة كمان بتتحسن مع الوقت.", cta: "شوفي الرحلة", href: "/progress/body", weeklyWeightChangeKg };
}

export async function fetchGainModeSnapshot(userId: UUID): Promise<GainModeSnapshot | null> {
  // Avoid the heavier progress/body requests for users who never enabled Gain Mode.
  const profile = await fetchGainModeProfile(userId);
  if (!profile || profile.status !== "active") return null;

  const [body, adherence, intelligence] = await Promise.all([
    fetchBodyProgress(userId),
    fetchAdherenceSummary(userId),
    fetchProgressIntelligence(userId),
  ]);
  const strategy = strategyFor(profile);
  return {
    profile,
    body,
    proteinTargetGrams: estimateProteinTarget(body.latest?.weightKg ?? body.start?.weightKg ?? null),
    ...strategy,
    dietSupportDetail: dietSupportFor(profile),
    review: buildWeeklyReview(profile, body, adherence, intelligence),
  };
}
