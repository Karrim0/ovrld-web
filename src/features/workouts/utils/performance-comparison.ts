import type { WorkoutSet } from "@/types";

export type ExercisePerformanceTrend = "first" | "improved" | "matched" | "adjusted";

export interface ExercisePerformanceComparison {
  trend: ExercisePerformanceTrend;
  label: string;
  percentChange: number | null;
}

function completedSets(sets: WorkoutSet[]) {
  return sets.filter((set) => !set.isWarmup && set.isCompleted && set.reps !== null && set.reps > 0);
}

function performanceScore(sets: WorkoutSet[]) {
  return completedSets(sets).reduce((total, set) => {
    const resistance = set.weightKg && set.weightKg > 0 ? set.weightKg : 1;
    return total + resistance * (set.reps ?? 0);
  }, 0);
}

export function compareExercisePerformance(
  currentSets: WorkoutSet[],
  previousSets: WorkoutSet[],
): ExercisePerformanceComparison {
  const current = completedSets(currentSets);
  const previous = completedSets(previousSets);

  if (current.length === 0 || previous.length === 0) {
    return { trend: "first", label: "أول نقطة بداية", percentChange: null };
  }

  const sameSets =
    current.length === previous.length &&
    current.every((set, index) => {
      const previousSet = previous[index];
      return set.weightKg === previousSet.weightKg && set.reps === previousSet.reps;
    });

  if (sameSets) {
    return { trend: "matched", label: "نفس آخر تمرينة", percentChange: 0 };
  }

  const previousScore = performanceScore(previous);
  const currentScore = performanceScore(current);
  if (previousScore <= 0) {
    return { trend: "adjusted", label: "الأداء اتغيّر", percentChange: null };
  }

  const percentChange = ((currentScore - previousScore) / previousScore) * 100;
  if (percentChange > 0.5) {
    return {
      trend: "improved",
      label: `شغل أكتر بنسبة ${percentChange >= 10 ? percentChange.toFixed(0) : percentChange.toFixed(1)}%`,
      percentChange,
    };
  }

  return {
    trend: "adjusted",
    label:
      percentChange < -0.5
        ? `أخف النهارده بنسبة ${Math.abs(percentChange) >= 10 ? Math.abs(percentChange).toFixed(0) : Math.abs(percentChange).toFixed(1)}%`
        : "الأداء اتغيّر",
    percentChange,
  };
}
