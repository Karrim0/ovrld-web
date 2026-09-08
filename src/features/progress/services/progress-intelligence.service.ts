import { fetchBodyProgress } from "@/features/body-progress/services/body-progress.service";
import { fetchWorkoutHistory } from "@/features/workouts/services/workout-session.service";
import type { BodyProgressSnapshot } from "@/features/body-progress/types";
import type { MuscleGroup, UUID, WorkoutSet } from "@/types";

export type ExerciseMomentumStatus = "new" | "improving" | "steady" | "plateau" | "slipping";
export type ProcessMomentum = "collecting" | "rising" | "steady" | "needs_attention";

export interface ExerciseMomentum {
  exerciseId: UUID;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  sessionCount: number;
  lastTrainedAt: string;
  currentEstimatedOneRepMaxKg: number;
  previousEstimatedOneRepMaxKg: number;
  strengthDeltaPercent: number | null;
  volumeDeltaPercent: number | null;
  latestSessionWasBest: boolean;
  status: ExerciseMomentumStatus;
}

export interface ProgressIntelligenceInsight {
  id: string;
  tone: "positive" | "neutral" | "watch";
  title: string;
  detail: string;
  exerciseId?: UUID;
  exerciseName?: string;
}

export interface ProgressIntelligenceSummary {
  momentum: ProcessMomentum;
  trackedExercises: number;
  improvingCount: number;
  steadyCount: number;
  plateauCount: number;
  slippingCount: number;
  newCount: number;
  latestWorkoutAt: string | null;
  exercises: ExerciseMomentum[];
  insights: ProgressIntelligenceInsight[];
  body: BodyProgressSnapshot | null;
}

interface SessionMetric {
  date: string;
  estimatedOneRepMaxKg: number;
  volumeKg: number;
}

function estimatedOneRepMax(set: WorkoutSet): number {
  if (!set.isCompleted || set.isWarmup || set.weightKg === null || set.reps === null || set.reps <= 0) return 0;
  return set.weightKg * (1 + set.reps / 30);
}

function percentDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function classifyMomentum(metrics: SessionMetric[]): Pick<ExerciseMomentum, "status" | "strengthDeltaPercent" | "volumeDeltaPercent" | "latestSessionWasBest" | "currentEstimatedOneRepMaxKg" | "previousEstimatedOneRepMaxKg"> {
  const latest = metrics.at(-1)!;
  const previousBest = Math.max(0, ...metrics.slice(0, -1).map((item) => item.estimatedOneRepMaxKg));
  const latestSessionWasBest = previousBest > 0 && latest.estimatedOneRepMaxKg >= previousBest * 1.01;

  if (metrics.length < 2) {
    return {
      status: "new",
      strengthDeltaPercent: null,
      volumeDeltaPercent: null,
      latestSessionWasBest: false,
      currentEstimatedOneRepMaxKg: latest.estimatedOneRepMaxKg,
      previousEstimatedOneRepMaxKg: 0,
    };
  }

  const recentWindow = metrics.length >= 4 ? metrics.slice(-2) : [latest];
  const previousWindow = metrics.length >= 4 ? metrics.slice(-4, -2) : metrics.slice(0, -1);
  const currentStrength = average(recentWindow.map((item) => item.estimatedOneRepMaxKg));
  const previousStrength = average(previousWindow.map((item) => item.estimatedOneRepMaxKg));
  const currentVolume = average(recentWindow.map((item) => item.volumeKg));
  const previousVolume = average(previousWindow.map((item) => item.volumeKg));
  const strengthDeltaPercent = percentDelta(currentStrength, previousStrength);
  const volumeDeltaPercent = percentDelta(currentVolume, previousVolume);

  let status: ExerciseMomentumStatus = "steady";
  if (strengthDeltaPercent !== null && strengthDeltaPercent >= 2.5) status = "improving";
  else if (strengthDeltaPercent !== null && strengthDeltaPercent <= -4) status = "slipping";
  else if (metrics.length >= 4 && strengthDeltaPercent !== null && Math.abs(strengthDeltaPercent) < 2.5 && !latestSessionWasBest) status = "plateau";

  return {
    status,
    strengthDeltaPercent,
    volumeDeltaPercent,
    latestSessionWasBest,
    currentEstimatedOneRepMaxKg: latest.estimatedOneRepMaxKg,
    previousEstimatedOneRepMaxKg: previousStrength,
  };
}

function buildBodyInsight(body: BodyProgressSnapshot | null): ProgressIntelligenceInsight | null {
  if (!body?.goal) return null;
  if (!body.latest) {
    return {
      id: "body-first-checkin",
      tone: "neutral",
      title: "اقفل حلقة المتابعة",
      detail: "هدف الجسم متسجل، لكن لسه محتاج أول وزن عشان OVRLD يربط التمرين بالنتيجة على الميزان.",
    };
  }
  if (!body.start || body.start.id === body.latest.id) return null;

  const change = body.latest.weightKg - body.start.weightKg;
  const abs = Math.abs(change).toFixed(1);
  if (body.goal.goalType === "gain_weight") {
    return {
      id: "body-gain-trend",
      tone: change > 0 ? "positive" : "watch",
      title: change > 0 ? `الوزن طالع ${abs} كجم` : "الوزن لسه مش طالع",
      detail: "التمرين جزء من الصورة. OVRLD هيكمل يقارن اتجاه الميزان بأدائك بدل ما يحكم من حصة واحدة.",
    };
  }
  if (body.goal.goalType === "lose_weight") {
    return {
      id: "body-loss-trend",
      tone: change < 0 ? "positive" : "watch",
      title: change < 0 ? `الوزن نازل ${abs} كجم` : "الوزن لسه مش نازل",
      detail: "المهم اتجاه عدة قياسات مع الحفاظ على الأداء، مش رقم يوم واحد.",
    };
  }
  if (body.goal.goalType === "maintain_weight") {
    return {
      id: "body-maintain-trend",
      tone: Math.abs(change) <= 1 ? "positive" : "neutral",
      title: Math.abs(change) <= 1 ? "الوزن قريب من نقطة البداية" : `الوزن اتحرك ${abs} كجم`,
      detail: "بنشوف الاتجاه مع أداء الجيم عشان تعرف هل العملية ماشية زي ما إنت عايز.",
    };
  }
  return null;
}

function buildInsights(exercises: ExerciseMomentum[], body: BodyProgressSnapshot | null): ProgressIntelligenceInsight[] {
  const insights: ProgressIntelligenceInsight[] = [];
  const bestImprover = exercises
    .filter((item) => item.status === "improving" && item.strengthDeltaPercent !== null)
    .sort((a, b) => (b.strengthDeltaPercent ?? 0) - (a.strengthDeltaPercent ?? 0))[0];
  if (bestImprover) {
    insights.push({
      id: `improving-${bestImprover.exerciseId}`,
      tone: "positive",
      title: "بيتحرك لفوق",
      exerciseName: bestImprover.exerciseName,
      detail: `مؤشر القوة التقديري أعلى بحوالي ${Math.abs(bestImprover.strengthDeltaPercent ?? 0).toFixed(1)}% مقارنة بالفترة اللي قبلها.`,
      exerciseId: bestImprover.exerciseId,
    });
  }

  const plateau = exercises.find((item) => item.status === "plateau");
  if (plateau) {
    insights.push({
      id: `plateau-${plateau.exerciseId}`,
      tone: "watch",
      title: "ثابت بقاله كذا مرة",
      exerciseName: plateau.exerciseName,
      detail: "مش حكم إن الخطة وحشة؛ دي إشارة تبص على التنفيذ والعدات والراحة قبل ما تغيّر البرنامج كله.",
      exerciseId: plateau.exerciseId,
    });
  }

  const slipping = exercises.find((item) => item.status === "slipping");
  if (slipping) {
    insights.push({
      id: `slipping-${slipping.exerciseId}`,
      tone: "watch",
      title: "محتاج عين",
      exerciseName: slipping.exerciseName,
      detail: `المؤشر التقديري نازل حوالي ${Math.abs(slipping.strengthDeltaPercent ?? 0).toFixed(1)}%. راقب أكتر من تمرينة قبل أي قرار كبير.`,
      exerciseId: slipping.exerciseId,
    });
  }

  const bodyInsight = buildBodyInsight(body);
  if (bodyInsight) insights.push(bodyInsight);

  if (insights.length === 0) {
    insights.push({
      id: "collect-more",
      tone: "neutral",
      title: "كمّل تسجيل زي ما إنت",
      detail: "كل ما تسجل الوزن والعدات بانتظام، OVRLD يقدر يفرّق بين تطور حقيقي وتقلب تمرينة واحدة.",
    });
  }
  return insights.slice(0, 4);
}

export async function fetchProgressIntelligence(userId: UUID): Promise<ProgressIntelligenceSummary> {
  const [history, body] = await Promise.all([
    fetchWorkoutHistory(userId),
    fetchBodyProgress(userId).catch(() => null),
  ]);

  const metricMap = new Map<UUID, { name: string; primaryMuscle: MuscleGroup; metrics: SessionMetric[] }>();
  const orderedHistory = [...history].sort((a, b) => (a.completedAt ?? a.scheduledDate).localeCompare(b.completedAt ?? b.scheduledDate));

  for (const session of orderedHistory) {
    for (const workoutExercise of session.exercises) {
      const completed = workoutExercise.sets.filter((set) => set.isCompleted && !set.isWarmup);
      if (completed.length === 0) continue;
      const metric = metricMap.get(workoutExercise.exerciseId) ?? {
        name: workoutExercise.exercise.name,
        primaryMuscle: workoutExercise.exercise.primaryMuscle,
        metrics: [],
      };
      metric.metrics.push({
        date: session.completedAt ?? session.scheduledDate,
        estimatedOneRepMaxKg: Math.max(0, ...completed.map(estimatedOneRepMax)),
        volumeKg: completed.reduce((total, set) => total + (set.weightKg ?? 0) * (set.reps ?? 0), 0),
      });
      metricMap.set(workoutExercise.exerciseId, metric);
    }
  }

  const exercises = [...metricMap.entries()].map(([exerciseId, item]): ExerciseMomentum => {
    const classified = classifyMomentum(item.metrics);
    return {
      exerciseId,
      exerciseName: item.name,
      primaryMuscle: item.primaryMuscle,
      sessionCount: item.metrics.length,
      lastTrainedAt: item.metrics.at(-1)?.date ?? "",
      ...classified,
    };
  }).sort((a, b) => {
    const rank: Record<ExerciseMomentumStatus, number> = { slipping: 0, plateau: 1, improving: 2, steady: 3, new: 4 };
    return rank[a.status] - rank[b.status] || b.lastTrainedAt.localeCompare(a.lastTrainedAt);
  });

  const improvingCount = exercises.filter((item) => item.status === "improving").length;
  const steadyCount = exercises.filter((item) => item.status === "steady").length;
  const plateauCount = exercises.filter((item) => item.status === "plateau").length;
  const slippingCount = exercises.filter((item) => item.status === "slipping").length;
  const newCount = exercises.filter((item) => item.status === "new").length;
  const enoughHistory = exercises.filter((item) => item.sessionCount >= 2).length;
  let momentum: ProcessMomentum = "collecting";
  if (enoughHistory >= 2) {
    if (slippingCount > improvingCount && slippingCount > 0) momentum = "needs_attention";
    else if (improvingCount > plateauCount + slippingCount) momentum = "rising";
    else momentum = "steady";
  }

  return {
    momentum,
    trackedExercises: exercises.length,
    improvingCount,
    steadyCount,
    plateauCount,
    slippingCount,
    newCount,
    latestWorkoutAt: orderedHistory.at(-1)?.completedAt ?? orderedHistory.at(-1)?.scheduledDate ?? null,
    exercises,
    insights: buildInsights(exercises, body),
    body,
  };
}
