import { createClient } from "@/lib/supabase/client";
import { fetchBodyProgress } from "@/features/body-progress/services/body-progress.service";
import { fetchAdherenceSummary } from "@/features/progress/services/progress.service";
import { fetchProgressIntelligence } from "@/features/progress/services/progress-intelligence.service";
import { fetchPlanAudit, type PlanMuscleLoad } from "@/features/splits/services/plan-audit.service";
import type { MuscleGroup, UUID } from "@/types";
import { fetchGainNutritionDay, summarizeNutritionDay } from "./nutrition.service";
import { getTodayISODate } from "@/lib/dates";
import type {
  GainActivityLevel,
  GainAppetiteLevel,
  GainDietPattern,
  GainEquationSex,
  GainPhysiqueFocus,
  GainPlanCompatibility,
  GainModeProfile,
  GainModeSnapshot,
  GainModeStatus,
  GainWeeklyReview,
  GainNutritionMode,
  GainTrainingSummary,
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
  equation_sex: GainEquationSex | null | undefined;
  physique_focus: GainPhysiqueFocus | null | undefined;
  support_name: string | null | undefined;
  support_note: string | null | undefined;
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
    equationSex: row.equation_sex === "male" ? "male" : "female",
    physiqueFocus: row.physique_focus === "lower_body" || row.physique_focus === "glutes_legs" ? row.physique_focus : "balanced",
    supportName: row.support_name?.trim() || null,
    supportNote: row.support_note?.trim() || null,
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
  equationSex: GainEquationSex;
  physiqueFocus?: GainPhysiqueFocus;
  supportName?: string | null;
  supportNote?: string | null;
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
    equation_sex: input.equationSex,
    physique_focus: input.physiqueFocus ?? "balanced",
    support_name: input.supportName?.trim().slice(0, 40) || null,
    support_note: input.supportNote?.trim().slice(0, 240) || null,
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

/**
 * Protein reference target for resistance training. The 1.6 g/kg point is a practical
 * reference from a large meta-analysis, not a medical prescription.
 */
export function estimateProteinTarget(weightKg: number | null): number | null {
  if (!weightKg || weightKg <= 0) return null;
  return Math.round(weightKg * 1.6);
}

/**
 * Starting calorie estimate using Mifflin-St Jeor REE, a broad activity multiplier,
 * then a conservative +300 kcal starting surplus. `equationSex` is used only for the
 * equation constant; Gain Mode itself is available to everyone.
 */
export function estimateCalorieTarget(input: {
  weightKg: number | null;
  heightCm: number | null;
  ageYears: number;
  activityLevel: GainActivityLevel;
  equationSex: GainEquationSex;
}): number | null {
  const { weightKg, heightCm, ageYears, activityLevel, equationSex } = input;
  if (!weightKg || !heightCm || !ageYears || weightKg <= 0 || heightCm <= 0 || ageYears <= 0) return null;
  const sexConstant = equationSex === "male" ? 5 : -161;
  const ree = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + sexConstant;
  const factor = activityLevel === "light" ? 1.35 : activityLevel === "high" ? 1.7 : 1.5;
  const target = ree * factor + 300;
  return Math.max(800, Math.min(6000, Math.round(target / 50) * 50));
}

function strategyFor(profile: GainModeProfile): Pick<GainModeSnapshot, "primaryNutritionAction" | "supportDetail"> {
  if (profile.appetiteLevel === "low" || profile.mealSizeDifficulty) {
    return {
      primaryNutritionAction: "قسّم الأكل بدل ما تكبّر الوجبة",
      supportDetail: "وجبات أصغر وسناكس أكتر غالبًا أسهل من إجبار نفسك على وجبة ضخمة.",
    };
  }
  if (profile.activityLevel === "high") {
    return {
      primaryNutritionAction: "ثبّت أكلك في الأيام النشيطة",
      supportDetail: "النشاط العالي ممكن يستهلك الزيادة بسهولة، فخلّي التسجيل والوجبات ثابتين.",
    };
  }
  return {
    primaryNutritionAction: "ثبّت الزيادة اليومية",
    supportDetail: "خلّي الأرقام ثابتة الأول، وبعدها اتجاه الوزن هو اللي يحدد لو محتاجين تعديل.",
  };
}

function dietSupportFor(profile: GainModeProfile): string | null {
  if (profile.dietPattern === "vegan") {
    return "وزّع مصادر البروتين والطاقة النباتية على اليوم: صويا/توفو، بقول، مكسرات وزبداتها، وحبوب أو بدائل مناسبة ليك.";
  }
  if (profile.dietPattern === "vegetarian") {
    return "وزّع مصادر البروتين المناسبة ليك على اليوم؛ ألبان/بيض لو بتستخدمهم، ومعاهم بقول وصويا ومكسرات.";
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
    return { tone: "collect", title: latest ? "معاد الوزن جه" : "سجّل نقطة البداية", detail: "سجّل الوزن في ظروف متشابهة قدر الإمكان.", cta: "سجّل الوزن", href: "/progress/body", weeklyWeightChangeKg: null };
  }

  const targetWeight = body.goal?.targetWeightKg ?? null;
  if (targetWeight !== null && latest.weightKg >= targetWeight) {
    return { tone: "steady", title: "وصلت للهدف المسجل 🎯", detail: "راجع اتجاه الوزن والقوة قبل اختيار هدف جديد.", cta: "راجع الوزن", href: "/progress/body", weeklyWeightChangeKg: null };
  }

  const weeklyWeightChangeKg = estimateRecentWeeklyWeightChange(body.measurements);
  if (weeklyWeightChangeKg === null) {
    return { tone: "collect", title: "بنبني اتجاه الوزن", detail: "3 قراءات عبر حوالي أسبوعين تدي إشارة أحسن من قراءة واحدة.", cta: "سجّل الوزن", href: "/progress/body", weeklyWeightChangeKg: null };
  }

  if (weeklyWeightChangeKg <= 0.05) {
    const lowAdherence = adherence.weeklyScheduled > 0 && adherence.weekly !== null && adherence.weekly < 0.67;
    if (lowAdherence) {
      return { tone: "training", title: "ثبّت الأسبوع الأول", detail: "ثبّت التمرين والتسجيل قبل تغيير الهدف الغذائي.", cta: "افتح التمرين", href: "/workout/today", weeklyWeightChangeKg };
    }
    if (profile.appetiteLevel === "low" || profile.mealSizeDifficulty) {
      return { tone: "adjust", title: "الوزن ثابت · إضافة سهلة", detail: "زوّد سناك أو إضافة ثابتة بدل وجبة أكبر.", cta: "سجّل أكلك", href: "/progress/gain/nutrition", weeklyWeightChangeKg };
    }
    return { tone: "adjust", title: "الوزن ثابت · راجع الأكل", detail: "ثبّت هدف السعرات كام يوم قبل أي قفزة كبيرة.", cta: "راجع اليوم", href: "/progress/gain/nutrition", weeklyWeightChangeKg };
  }

  if (intelligence.improvingCount > 0) {
    return { tone: "steady", title: "الوزن والقوة بيتحسنوا", detail: "الاتجاه كويس؛ خليك ثابت بدل تغيير الخطة بسرعة.", cta: "شوف التقدم", href: "/progress", weeklyWeightChangeKg };
  }

  return { tone: "steady", title: "الوزن بيتحرك صح", detail: "كمّل بنفس الإيقاع وراقب القوة مع الوزن.", cta: "شوف الوزن", href: "/progress/body", weeklyWeightChangeKg };
}


const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "الصدر",
  back: "الظهر",
  shoulders: "الكتف",
  biceps: "البايسبس",
  triceps: "الترايسبس",
  quads: "الفخذ الأمامي",
  hamstrings: "الفخذ الخلفي",
  glutes: "الجلووتس",
  calves: "السمانة",
  core: "الكور",
};

function focusLabel(focus: GainPhysiqueFocus): string {
  if (focus === "lower_body") return "Lower body";
  if (focus === "glutes_legs") return "Glutes + legs";
  return "متوازن";
}

export function buildGainPlanCompatibility(
  focus: GainPhysiqueFocus,
  plan: Awaited<ReturnType<typeof fetchPlanAudit>>,
): GainPlanCompatibility {
  if (plan.trainingDays === 0 || plan.exerciseSlots === 0) {
    return {
      state: "setup",
      score: null,
      focus,
      focusLabel: focusLabel(focus),
      title: "محتاج جدول فعلي",
      detail: "اختار جدولك الأول، وبعدها Gain Mode يراجع توزيع السِتات حسب تركيز جسمك.",
      lowerBodyShare: null,
      priorityLoads: [],
      maintenanceLoads: [],
      insights: [],
    };
  }

  const byMuscle = new Map<MuscleGroup, PlanMuscleLoad>(plan.muscles.map((item) => [item.muscle, item]));
  const get = (muscle: MuscleGroup): PlanMuscleLoad => byMuscle.get(muscle) ?? { muscle, directSets: 0, secondarySets: 0, weightedSets: 0, exposureDays: 0 };
  const lowerKeys: MuscleGroup[] = ["glutes", "quads", "hamstrings"];
  const total = Math.max(0.01, plan.muscles.reduce((sum, item) => sum + item.weightedSets, 0));
  const lowerLoad = lowerKeys.reduce((sum, key) => sum + get(key).weightedSets, 0);
  const lowerBodyShare = Math.round((lowerLoad / total) * 100);

  const priorityKeys: MuscleGroup[] = focus === "balanced" ? ["chest", "back", "shoulders", ...lowerKeys] : lowerKeys;
  const maintenanceKeys: MuscleGroup[] = focus === "balanced" ? ["biceps", "triceps", "calves", "core"] : ["chest", "back", "shoulders"];
  const priorityLoads = priorityKeys.map((muscle) => ({ muscle: MUSCLE_LABELS[muscle] ?? muscle, sets: Math.round(get(muscle).weightedSets * 10) / 10, exposureDays: get(muscle).exposureDays }));
  const maintenanceLoads = maintenanceKeys.map((muscle) => ({ muscle: MUSCLE_LABELS[muscle] ?? muscle, sets: Math.round(get(muscle).weightedSets * 10) / 10, exposureDays: get(muscle).exposureDays }));

  let score = 100;
  const insights: string[] = [];

  if (focus === "balanced") {
    const missing = priorityKeys.filter((muscle) => get(muscle).weightedSets < 4);
    score -= missing.length * 12;
    if (missing.length) insights.push(`${missing.length} مناطق أساسية حجمها قليل نسبيًا.`);
    const single = priorityKeys.filter((muscle) => get(muscle).weightedSets >= 6 && get(muscle).exposureDays < 2);
    score -= single.length * 5;
    if (single.length >= 2) insights.push("بعض العضلات كلها متجمعة في يوم واحد؛ توزيعها ممكن يحسن جودة السِتات.");
  } else {
    const glutes = get("glutes");
    const quads = get("quads");
    const hamstrings = get("hamstrings");
    if (glutes.weightedSets < 10) { score -= 18; insights.push("الجلووتس أقل من حجم عملي قوي للتركيز الحالي."); }
    if (quads.weightedSets < 8) { score -= 12; insights.push("الفخذ الأمامي محتاج حجم أسبوعي أوضح."); }
    if (hamstrings.weightedSets < 7) { score -= 12; insights.push("الفخذ الخلفي أقل من المطلوب لتوازن الرجل."); }
    if (glutes.exposureDays < 2) { score -= 10; insights.push("الجلووتس محتاجة تتوزع على يومين على الأقل بدل يوم واحد مزدحم."); }
    if (lowerBodyShare < 45) { score -= 12; insights.push("نسبة شغل الـlower body قليلة مقارنة بتركيزك المختار."); }
    if (lowerBodyShare > 78) { score -= 6; insights.push("الـlower body واخد معظم الخطة؛ حافظ على شغل upper بسيط للتوازن والمفاصل."); }
    const chest = get("chest").weightedSets;
    const back = get("back").weightedSets;
    if (chest < 4 || back < 4) { score -= 8; insights.push("حافظ على حد أدنى للصدر والظهر حتى مع تركيز الرجل."); }
    if (get("shoulders").weightedSets > 12 && focus === "glutes_legs") { score -= 4; insights.push("حجم الكتف عالي نسبيًا مقارنة بتركيز Glutes + legs."); }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const state = score >= 82 ? "good" : score >= 65 ? "partial" : "needs_work";
  const title = state === "good" ? "الخطة متوافقة مع تركيزك" : state === "partial" ? "الخطة قريبة وعايزة تظبيط" : "الخطة محتاجة إعادة توزيع";
  const detail = focus === "balanced"
    ? `تغطية الخطة ${plan.coveredMuscles}/10 مناطق · ${plan.trainingDays} أيام تمرين.`
    : `الـlower body حوالي ${lowerBodyShare}% من الحمل المحسوب · ${plan.trainingDays} أيام تمرين.`;

  return { state, score, focus, focusLabel: focusLabel(focus), title, detail, lowerBodyShare, priorityLoads, maintenanceLoads, insights: insights.slice(0, 4) };
}

function buildTrainingSummary(
  focus: GainPhysiqueFocus,
  adherence: Awaited<ReturnType<typeof fetchAdherenceSummary>>,
  intelligence: Awaited<ReturnType<typeof fetchProgressIntelligence>>,
  plan: Awaited<ReturnType<typeof fetchPlanAudit>>,
): GainTrainingSummary {
  const compatibility = buildGainPlanCompatibility(focus, plan);
  if (plan.trainingDays === 0 || plan.exerciseSlots === 0) {
    return {
      state: "setup",
      title: "التمرين محتاج خطة",
      detail: "اربط Gain Mode بجدول تمرين فعلي عشان نقدر نقارن زيادة الوزن بالقوة والالتزام.",
      href: "/split/personal",
      cta: "ظبّط الجدول",
      trainingDays: plan.trainingDays, plannedSets: plan.plannedSets, exerciseSlots: plan.exerciseSlots,
      workoutsCompleted: adherence.weeklyCompleted, workoutsScheduled: adherence.weeklyScheduled, adherence: adherence.weekly,
      improvingExercises: intelligence.improvingCount, plateauExercises: intelligence.plateauCount, slippingExercises: intelligence.slippingCount, trackedExercises: intelligence.trackedExercises,
      compatibility,
    };
  }

  if (adherence.weeklyScheduled > 0 && adherence.weekly !== null && adherence.weekly < 0.67) {
    return {
      state: "attention",
      title: "ثبّت التمرين الأسبوعي",
      detail: "قبل ما نحكم على الأكل أو السعرات، خلّي تنفيذ الجدول أقرب للخطة.",
      href: "/workout/today", cta: "افتح التمرين",
      trainingDays: plan.trainingDays, plannedSets: plan.plannedSets, exerciseSlots: plan.exerciseSlots,
      workoutsCompleted: adherence.weeklyCompleted, workoutsScheduled: adherence.weeklyScheduled, adherence: adherence.weekly,
      improvingExercises: intelligence.improvingCount, plateauExercises: intelligence.plateauCount, slippingExercises: intelligence.slippingCount, trackedExercises: intelligence.trackedExercises,
      compatibility,
    };
  }

  if (intelligence.trackedExercises < 2) {
    return {
      state: "collecting",
      title: "بنبني خط القوة",
      detail: "سجّل الأوزان والعدات كام تمرينة، وبعدها Gain Mode هيقارن الوزن بتطور الأداء.",
      href: "/workout/today", cta: "سجّل التمرين",
      trainingDays: plan.trainingDays, plannedSets: plan.plannedSets, exerciseSlots: plan.exerciseSlots,
      workoutsCompleted: adherence.weeklyCompleted, workoutsScheduled: adherence.weeklyScheduled, adherence: adherence.weekly,
      improvingExercises: intelligence.improvingCount, plateauExercises: intelligence.plateauCount, slippingExercises: intelligence.slippingCount, trackedExercises: intelligence.trackedExercises,
      compatibility,
    };
  }

  const attention = intelligence.slippingCount + intelligence.plateauCount;
  return {
    state: attention > intelligence.improvingCount && attention > 0 ? "attention" : "on_track",
    title: attention > intelligence.improvingCount && attention > 0 ? "فيه أداء محتاج عين" : "التمرين مربوط بالرحلة",
    detail: attention > intelligence.improvingCount && attention > 0
      ? "راجع اتجاه التمارين اللي واقفة قبل ما تغيّر الخطة كلها."
      : "الوزن، الالتزام والقوة بيتقارنوا مع بعض بدل ما نعتمد على الميزان لوحده.",
    href: "/progress", cta: "شوف التقدم",
    trainingDays: plan.trainingDays, plannedSets: plan.plannedSets, exerciseSlots: plan.exerciseSlots,
    workoutsCompleted: adherence.weeklyCompleted, workoutsScheduled: adherence.weeklyScheduled, adherence: adherence.weekly,
    improvingExercises: intelligence.improvingCount, plateauExercises: intelligence.plateauCount, slippingExercises: intelligence.slippingCount, trackedExercises: intelligence.trackedExercises,
    compatibility,
  };
}

export function getDailyNutritionStatus(snapshot: Pick<GainModeSnapshot, "todayNutrition">): string {
  const day = snapshot.todayNutrition;
  const caloriesLeft = day.calorieTargetKcal === null ? null : Math.max(0, day.calorieTargetKcal - day.caloriesKcal);
  const proteinLeft = day.proteinTargetGrams === null ? null : Math.max(0, Math.round(day.proteinTargetGrams - day.proteinGrams));
  if (day.entries.length === 0) return "لسه مسجلتش أكل النهارده";
  if ((day.calorieProgress ?? 0) >= 0.95 && (day.proteinProgress ?? 0) >= 0.9) return "يومك قريب جدًا من الخطة";
  if (caloriesLeft !== null && proteinLeft !== null) return `باقي ${caloriesLeft} kcal · ${proteinLeft}g بروتين`;
  if (caloriesLeft !== null) return `باقي ${caloriesLeft} kcal`;
  return "كمّل تسجيل اليوم";
}

export async function fetchGainModeSnapshot(userId: UUID): Promise<GainModeSnapshot | null> {
  const profile = await fetchGainModeProfile(userId);
  if (!profile || profile.status !== "active") return null;

  const [body, adherence, intelligence, plan] = await Promise.all([
    fetchBodyProgress(userId),
    fetchAdherenceSummary(userId),
    fetchProgressIntelligence(userId),
    fetchPlanAudit(userId),
  ]);
  const weightKg = body.latest?.weightKg ?? body.start?.weightKg ?? null;
  const estimatedCalories = estimateCalorieTarget({
    weightKg,
    heightCm: body.goal?.heightCm ?? null,
    ageYears: profile.ageYears,
    activityLevel: profile.activityLevel,
    equationSex: profile.equationSex,
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
    training: buildTrainingSummary(profile.physiqueFocus, adherence, intelligence, plan),
  };
}
