import { fetchBodyProgress } from "@/features/body-progress/services/body-progress.service";
import type { BodyGoalType } from "@/features/body-progress/types";
import type { MuscleGroup, UUID } from "@/types";
import { fetchPersonalSplit } from "./split.service";

export type PlanAlignment = "good" | "partial" | "needs_work" | "not_enough_data";

export interface PlanMuscleLoad {
  muscle: MuscleGroup;
  directSets: number;
  secondarySets: number;
  weightedSets: number;
  exposureDays: number;
}

export interface PlanAuditInsight {
  id: string;
  tone: "positive" | "neutral" | "watch";
  title: string;
  detail: string;
}

export interface PlanAuditResult {
  alignment: PlanAlignment;
  goalType: BodyGoalType | null;
  trainingDays: number;
  restDays: number;
  plannedSets: number;
  exerciseSlots: number;
  coveredMuscles: number;
  muscles: PlanMuscleLoad[];
  insights: PlanAuditInsight[];
}

const MUSCLES: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

const BIG_AREAS: MuscleGroup[] = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes"];

function goalContext(goalType: BodyGoalType | null): PlanAuditInsight | null {
  if (goalType === "gain_weight" || goalType === "lose_weight" || goalType === "maintain_weight") {
    const verb = goalType === "gain_weight" ? "زيادة الوزن" : goalType === "lose_weight" ? "خسارة الوزن" : "تثبيت الوزن";
    return {
      id: "scale-goal-context",
      tone: "neutral",
      title: `الجدول لوحده مش بيحكم على ${verb}`,
      detail: "OVRLD يقدر يراجع توزيع التمرين والتقدم، لكن اتجاه الوزن محتاج قياسات جسم منتظمة وعوامل خارج الجدول كمان.",
    };
  }
  if (goalType === "muscle_gain" || goalType === "recomposition") {
    return {
      id: "muscle-goal-context",
      tone: "positive",
      title: "هنقارن الخطة بالتغطية والتكرار",
      detail: "لأن هدفك مرتبط ببناء العضلات، التدقيق بيركز على العضلات اللي بتوصلها الخطة وعدد مرات ظهورها خلال الأسبوع.",
    };
  }
  return null;
}

export async function fetchPlanAudit(userId: UUID): Promise<PlanAuditResult> {
  const [days, body] = await Promise.all([
    fetchPersonalSplit(userId),
    fetchBodyProgress(userId).catch(() => null),
  ]);
  const trainingDays = days.filter((day) => day.workoutType !== "rest");
  const loads = new Map<MuscleGroup, PlanMuscleLoad>(MUSCLES.map((muscle) => [muscle, {
    muscle,
    directSets: 0,
    secondarySets: 0,
    weightedSets: 0,
    exposureDays: 0,
  }]));

  let plannedSets = 0;
  let exerciseSlots = 0;

  for (const day of trainingDays) {
    const musclesSeenToday = new Set<MuscleGroup>();
    for (const item of day.exercises) {
      plannedSets += item.targetSets;
      exerciseSlots += 1;
      const primary = loads.get(item.exercise.primaryMuscle)!;
      primary.directSets += item.targetSets;
      primary.weightedSets += item.targetSets;
      musclesSeenToday.add(item.exercise.primaryMuscle);

      for (const secondaryMuscle of item.exercise.secondaryMuscles) {
        const secondary = loads.get(secondaryMuscle)!;
        secondary.secondarySets += item.targetSets;
        secondary.weightedSets += item.targetSets * 0.35;
        musclesSeenToday.add(secondaryMuscle);
      }
    }
    for (const muscle of musclesSeenToday) loads.get(muscle)!.exposureDays += 1;
  }

  const muscles = MUSCLES.map((muscle) => loads.get(muscle)!).sort((a, b) => b.weightedSets - a.weightedSets);
  const coveredMuscles = muscles.filter((item) => item.weightedSets > 0).length;
  const missingBigAreas = BIG_AREAS.filter((muscle) => (loads.get(muscle)?.weightedSets ?? 0) === 0);
  const oneTouchAreas = BIG_AREAS.filter((muscle) => {
    const item = loads.get(muscle)!;
    return item.weightedSets > 0 && item.exposureDays === 1;
  });
  const top = muscles[0];
  const totalWeighted = muscles.reduce((sum, item) => sum + item.weightedSets, 0);
  const insights: PlanAuditInsight[] = [];

  const context = goalContext(body?.goal?.goalType ?? null);
  if (context) insights.push(context);

  if (trainingDays.length === 0) {
    insights.push({ id: "no-training-days", tone: "watch", title: "لسه مفيش أيام تمرين", detail: "اختار أيامك وحط التمارين الأول، وبعدها التدقيق يبقى له معنى." });
  } else if (exerciseSlots === 0) {
    insights.push({ id: "empty-training-days", tone: "watch", title: "أيام التمرين فاضية", detail: "عندك أيام تمرين، بس مفيش تمارين محفوظة جواها لسه." });
  } else {
    if (missingBigAreas.length > 0) {
      insights.push({
        id: "missing-big-areas",
        tone: "watch",
        title: `${missingBigAreas.length} مناطق كبيرة مش ظاهرة في الخطة`,
        detail: "ده مش معناه تلقائيًا إن الجدول غلط، لكنه شيء يستاهل تبص عليه لو هدفك جسم متوازن أو بناء عضل عام.",
      });
    } else {
      insights.push({ id: "big-area-coverage", tone: "positive", title: "المناطق الكبيرة كلها موجودة", detail: "الخطة فيها شغل مباشر أو مساعد للصدر والظهر والكتف والرجل الأمامية والخلفية والجلووتس." });
    }

    if (oneTouchAreas.length >= 3) {
      insights.push({
        id: "single-exposure",
        tone: "neutral",
        title: `${oneTouchAreas.length} مناطق بتظهر في يوم واحد بس`,
        detail: "لو التقدم فيها واقف بعد فترة، التكرار الأسبوعي يبقى من أول الحاجات اللي تستاهل المراجعة.",
      });
    }

    if (top && totalWeighted > 0 && top.weightedSets / totalWeighted >= 0.25) {
      insights.push({
        id: "concentrated-load",
        tone: "neutral",
        title: "جزء كبير من الخطة مركز في عضلة واحدة",
        detail: "مش مشكلة لو ده مقصود، لكن OVRLD بيعلّمهولك عشان يبقى قرار واعي مش صدفة من تركيب الجدول.",
      });
    }

    const chest = loads.get("chest")!.weightedSets;
    const back = loads.get("back")!.weightedSets;
    if (Math.max(chest, back) > 0 && Math.min(chest, back) > 0 && Math.max(chest, back) / Math.min(chest, back) >= 2) {
      insights.push({ id: "upper-balance", tone: "neutral", title: "في فرق واضح بين شغل الصدر والظهر", detail: "لو الفرق مقصود تمام؛ لو مش مقصود، راجع توزيع التمارين قبل ما تزود حجم الخطة كلها." });
    }
  }

  let alignment: PlanAlignment = "not_enough_data";
  if (trainingDays.length > 0 && exerciseSlots > 0) {
    if (missingBigAreas.length >= 3) alignment = "needs_work";
    else if (missingBigAreas.length > 0 || oneTouchAreas.length >= 4) alignment = "partial";
    else alignment = "good";
  }

  return {
    alignment,
    goalType: body?.goal?.goalType ?? null,
    trainingDays: trainingDays.length,
    restDays: Math.max(0, 7 - trainingDays.length),
    plannedSets,
    exerciseSlots,
    coveredMuscles,
    muscles,
    insights: insights.slice(0, 4),
  };
}
