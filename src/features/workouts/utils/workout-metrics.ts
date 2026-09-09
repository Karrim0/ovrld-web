export interface PlannedExerciseMetricInput {
  targetSets: number;
}

export interface SessionSetMetricInput {
  isCompleted: boolean;
  isWarmup?: boolean;
  weightKg: number | null;
  reps: number | null;
  isPersonalRecord?: boolean;
}

export interface SessionExerciseMetricInput {
  sets: SessionSetMetricInput[];
}

export interface PlannedWorkoutMetrics {
  exerciseCount: number;
  totalSets: number;
  estimatedMinutes: number;
}

export interface SessionWorkoutMetrics {
  exerciseCount: number;
  totalSets: number;
  completedSets: number;
  completedExercises: number;
  workingSets: SessionSetMetricInput[];
  totalVolumeKg: number;
  prCount: number;
}

export function getPlannedWorkoutMetrics(
  exercises: readonly PlannedExerciseMetricInput[],
): PlannedWorkoutMetrics {
  const totalSets = exercises.reduce((sum, exercise) => sum + Math.max(0, exercise.targetSets), 0);
  return {
    exerciseCount: exercises.length,
    totalSets,
    estimatedMinutes: totalSets > 0 ? Math.max(20, Math.round((totalSets * 2.6) / 5) * 5) : 0,
  };
}

export function getSessionWorkoutMetrics(
  exercises: readonly SessionExerciseMetricInput[],
): SessionWorkoutMetrics {
  const allSets = exercises.flatMap((exercise) => exercise.sets);
  const completedSets = allSets.filter((set) => set.isCompleted);
  const workingSets = completedSets.filter((set) => !set.isWarmup);

  return {
    exerciseCount: exercises.length,
    totalSets: allSets.length,
    completedSets: completedSets.length,
    completedExercises: exercises.filter(
      (exercise) => exercise.sets.length > 0 && exercise.sets.every((set) => set.isCompleted),
    ).length,
    workingSets,
    totalVolumeKg: workingSets.reduce(
      (sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0),
      0,
    ),
    prCount: workingSets.filter((set) => set.isPersonalRecord).length,
  };
}
