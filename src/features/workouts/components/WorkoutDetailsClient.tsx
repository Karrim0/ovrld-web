"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Dumbbell,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatDuration } from "@/lib/utils/format";
import { useLanguage } from "@/contexts/language-context";
import { formatDateArEg, muscleLabelAr, translateExerciseName } from "@/lib/localization";
import type { UUID, WorkoutSet } from "@/types";
import type { PreviousPerformanceMap, WorkoutSessionWithDetails } from "../types";
import {
  fetchPreviousPerformances,
  fetchWorkoutSessionById,
} from "../services/workout-session.service";
import { compareExercisePerformance } from "../utils/performance-comparison";
import { getSessionWorkoutMetrics } from "../utils/workout-metrics";
import { DeleteWorkoutSessionButton } from "./DeleteWorkoutSessionButton";

function bestWorkingSet(sets: WorkoutSet[]) {
  return sets
    .filter((set) => set.isCompleted && !set.isWarmup && (set.reps ?? 0) > 0)
    .reduce<WorkoutSet | null>((best, set) => {
      if (!best) return set;
      const score = (set.weightKg ?? 1) * (1 + (set.reps ?? 0) / 30);
      const bestScore = (best.weightKg ?? 1) * (1 + (best.reps ?? 0) / 30);
      return score > bestScore ? set : best;
    }, null);
}

function formatSetLine(set: WorkoutSet | null, ar: boolean) {
  if (!set) return "—";
  const weight = set.weightKg === null ? "—" : Number.isInteger(set.weightKg) ? String(set.weightKg) : set.weightKg.toFixed(1);
  return `${weight}${ar ? " كجم" : " kg"} × ${set.reps ?? "—"}`;
}

export function WorkoutDetailsClient({ sessionId }: { sessionId: UUID }) {
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const [session, setSession] = useState<WorkoutSessionWithDetails | null>(null);
  const [previousPerformances, setPreviousPerformances] = useState<PreviousPerformanceMap>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchWorkoutSessionById(sessionId)
      .then(async (loadedSession) => {
        if (!loadedSession || cancelled) return;
        setSession(loadedSession);
        const previous = await fetchPreviousPerformances(
          loadedSession.exercises.map((exercise) => exercise.exerciseId),
          { excludeSessionId: loadedSession.id },
        );
        if (!cancelled) setPreviousPerformances(previous);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(getArabicErrorMessage(caught, "معرفناش نحمّل التمرينة."));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const comparisons = useMemo(() => {
    if (!session) return [];
    return session.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      comparison: compareExercisePerformance(
        exercise.sets,
        previousPerformances[exercise.exerciseId]?.sets ?? [],
      ),
    }));
  }, [previousPerformances, session]);

  if (error) {
    return (
      <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
        {error}
      </p>
    );
  }
  if (!session) {
    return <p className="py-8 text-center text-sm text-neutral-500">{ar ? "بنجهّز التمرينة…" : "Preparing workout…"}</p>;
  }

  const sessionMetrics = getSessionWorkoutMetrics(session.exercises);
  const { totalVolumeKg, prCount } = sessionMetrics;
  const improvedCount = comparisons.filter((item) => item.comparison.trend === "improved").length;
  const matchedCount = comparisons.filter((item) => item.comparison.trend === "matched").length;
  const adjustedCount = comparisons.filter((item) => item.comparison.trend === "adjusted").length;
  const baselineCount = comparisons.filter((item) => item.comparison.trend === "first").length;
  const topProgress = [...comparisons]
    .filter((item) => item.comparison.trend === "improved" && item.comparison.percentChange !== null)
    .sort((a, b) => (b.comparison.percentChange ?? 0) - (a.comparison.percentChange ?? 0))[0] ?? null;
  const topProgressExercise = topProgress
    ? session.exercises.find((exercise) => exercise.exerciseId === topProgress.exerciseId) ?? null
    : null;
  const topProgressCurrentSet = topProgressExercise ? bestWorkingSet(topProgressExercise.sets) : null;
  const topProgressPreviousSet = topProgressExercise
    ? bestWorkingSet(previousPerformances[topProgressExercise.exerciseId]?.sets ?? [])
    : null;
  const topProgressHasPr = Boolean(
    topProgressExercise?.sets.some((set) => set.isCompleted && !set.isWarmup && set.isPersonalRecord),
  );

  return (
    <div className="space-y-4 pb-8">
      <section className="gc-card p-5 sm:p-6">
        <p className="gc-eyebrow">{ar ? "التمرين خلص" : "Workout Complete"}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">{ar ? "ملخص التمرين" : "Workout Summary"}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="gc-stat">
            <CalendarDays className="h-4 w-4 text-emerald-200" />
            <strong className="mt-2 block text-sm">
              {formatDateArEg(session.scheduledDate)}
            </strong>
            <span className="text-[11px] text-neutral-500">{ar ? "التاريخ" : "Date"}</span>
          </div>
          <div className="gc-stat">
            <Clock3 className="h-4 w-4 text-emerald-200" />
            <strong className="mt-2 block text-sm">{formatDuration(session.durationSeconds)}</strong>
            <span className="text-[11px] text-neutral-500">{ar ? "المدة" : "Duration"}</span>
          </div>
          <div className="gc-stat">
            <Dumbbell className="h-4 w-4 text-emerald-200" />
            <strong className="mt-2 block text-sm">{sessionMetrics.workingSets.length}</strong>
            <span className="text-[11px] text-neutral-500">{ar ? "السِتات" : "Sets"}</span>
          </div>
          <div className="gc-stat">
            <TrendingUp className="h-4 w-4 text-emerald-200" />
            <strong className="mt-2 block text-sm tabular-nums">{Math.round(totalVolumeKg).toLocaleString()}</strong>
            <span className="text-[11px] text-neutral-500">{ar ? "كجم حجم" : "kg volume"}</span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-200" />
            <p className="text-sm font-bold">{ar ? "مقارنة بآخر تمرين" : "Compared with last workout"}{prCount > 0 ? ` · ${prCount} PR` : ""}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <div className="rounded-xl bg-emerald-400/[0.08] p-2.5">
              <TrendingUp className="mx-auto h-4 w-4 text-emerald-300" />
              <strong className="mt-1 block text-lg">{improvedCount}</strong>
              <span className="text-[10px] font-semibold text-emerald-200/80">{ar ? "اتحسن" : "Improved"}</span>
            </div>
            <div className="rounded-xl bg-white/[0.045] p-2.5">
              <Check className="mx-auto h-4 w-4 text-neutral-300" />
              <strong className="mt-1 block text-lg">{matchedCount}</strong>
              <span className="text-[10px] font-semibold text-neutral-400">{ar ? "نفس المستوى" : "Matched"}</span>
            </div>
            <div className="rounded-xl bg-amber-300/[0.07] p-2.5">
              <Minus className="mx-auto h-4 w-4 text-amber-200" />
              <strong className="mt-1 block text-lg">{adjustedCount}</strong>
              <span className="text-[10px] font-semibold text-amber-100/70">{ar ? "اتغيّر" : "Adjusted"}</span>
            </div>
            <div className="rounded-xl bg-emerald-300/[0.08] p-2.5">
              <Dumbbell className="mx-auto h-4 w-4 text-emerald-200" />
              <strong className="mt-1 block text-lg">{baselineCount}</strong>
              <span className="text-[10px] font-semibold text-emerald-100/70">{ar ? "بداية جديدة" : "New baseline"}</span>
            </div>
          </div>
        </div>

        {topProgressExercise && topProgressCurrentSet && topProgressPreviousSet ? (
          <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="gc-eyebrow">{ar ? "أهم تقدم" : "Top progress"}</p>
                <h3 className="mt-1 truncate text-base font-black">{t(translateExerciseName(topProgressExercise.exercise.name))}</h3>
              </div>
              <span className="gc-pr-badge">{topProgressHasPr ? "PR ↑" : (ar ? "تحسن ↑" : "Improved ↑")}</span>
            </div>
            <p className="mt-2 text-sm font-bold tabular-nums text-neutral-300">
              <span className="text-neutral-500">{formatSetLine(topProgressPreviousSet, ar)}</span>
              <span className="mx-2 text-emerald-300">→</span>
              <span className="text-emerald-200">{formatSetLine(topProgressCurrentSet, ar)}</span>
            </p>
          </div>
        ) : null}
      </section>

      {session.exercises.map((item) => {
        const previous = previousPerformances[item.exerciseId];
        const comparison = comparisons.find((entry) => entry.exerciseId === item.exerciseId)?.comparison;
        return (
          <section key={item.id} className="gc-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{t(translateExerciseName(item.exercise.name))}</h3>
                <p className="mt-0.5 text-xs capitalize text-neutral-500">
                  {t(muscleLabelAr(item.exercise.primaryMuscle))}
                </p>
              </div>
              {comparison ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    comparison.trend === "improved"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : comparison.trend === "matched"
                        ? "bg-white/[0.06] text-neutral-300"
                        : comparison.trend === "adjusted"
                          ? "bg-amber-300/10 text-amber-200"
                          : "bg-emerald-300/10 text-emerald-200"
                  }`}
                >
                  {comparison.trend === "improved" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : comparison.trend === "adjusted" ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  {t(comparison.label)}
                </span>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {item.sets.map((set, index) => {
                const previousSet = previous?.sets[index];
                return (
                  <div
                    key={set.id}
                    className="grid grid-cols-[auto_1fr_1fr] items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 text-sm"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] text-xs font-bold">
                      {set.setNumber}
                    </span>
                    <span className="text-center">
                      <strong>{set.weightKg ?? "—"}</strong>{" "}
                      <span className="text-xs text-neutral-500">{ar ? "كجم" : "kg"}</span>
                      {previousSet ? (
                        <span className="mt-0.5 block text-[10px] text-neutral-600">
                          {ar ? "آخر مرة" : "Last time"} {previousSet.weightKg ?? "—"} {ar ? "كجم" : "kg"}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-center">
                      <strong>{set.reps ?? "—"}</strong>{" "}
                      <span className="text-xs text-neutral-500">{ar ? "عدات" : "reps"}</span>
                      {previousSet ? (
                        <span className="mt-0.5 block text-[10px] text-neutral-600">
                          {ar ? "آخر مرة" : "Last time"} {previousSet.reps ?? "—"}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
            {item.notes ? (
              <p className="mt-3 rounded-xl bg-white/[0.025] p-3 text-sm leading-6 text-neutral-400">
                {item.notes}
              </p>
            ) : null}
          </section>
        );
      })}

      {session.notes ? (
        <section className="gc-card p-4">
          <h3 className="font-semibold">{ar ? "ملاحظات التمرينة" : "Workout notes"}</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-400">{session.notes}</p>
        </section>
      ) : null}

      <section className="rounded-[18px] border border-red-400/15 bg-red-400/[0.035] p-4">
        <h3 className="font-semibold text-red-200">{ar ? "التحكم في التمرينة" : "Workout controls"}</h3>
        <p className="mb-3 mt-1 text-sm leading-6 text-neutral-500">
          {ar ? "امسح التمرينات التجريبية بالغلط عشان متدخلش في السجل والإحصائيات." : "Delete accidental test workouts so they do not affect history or stats."}
        </p>
        <DeleteWorkoutSessionButton sessionId={session.id} />
      </section>
    </div>
  );
}
