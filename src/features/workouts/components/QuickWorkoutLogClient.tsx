"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, History, Save } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { getArabicErrorMessage, translateExerciseName } from "@/lib/localization";
import { useActiveWorkout } from "../hooks/use-active-workout";
import { usePreviousPerformances } from "../hooks/use-previous-performance";
import { finishWorkoutSession, updateWorkoutSet } from "../services/workout-session.service";
import { getSafeWorkoutDurationSeconds } from "../utils/session-time";
import { getSessionWorkoutMetrics } from "../utils/workout-metrics";

function parseOptionalNumber(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function sameNumber(a: number | null, b: number | null) {
  return a === b || (a === null && b === null);
}

export function QuickWorkoutLogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const sessionId = searchParams.get("session");
  const { session, isLoading, error: loadError } = useActiveWorkout(sessionId);
  const exerciseIds = useMemo(() => session?.exercises.map((item) => item.exerciseId) ?? [], [session]);
  const { performances } = usePreviousPerformances(exerciseIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-[20px] border border-[var(--border)] bg-[var(--surface-subtle)]" />;
  }

  if (loadError || !session) {
    return <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">{loadError?.message ?? (ar ? "مفيش تمرينة شغالة." : "No active workout.")}</p>;
  }

  const metrics = getSessionWorkoutMetrics(session.exercises);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const action = String(data.get("action") ?? "exit");
    setBusy(true);
    setError(null);

    try {
      for (const exercise of session.exercises) {
        for (const set of exercise.sets) {
          const nextWeight = parseOptionalNumber(data.get(`weight:${set.id}`));
          const nextRepsRaw = parseOptionalNumber(data.get(`reps:${set.id}`));
          if (Number.isNaN(nextWeight) || Number.isNaN(nextRepsRaw)) {
            throw new Error(ar ? "راجع الأرقام المدخلة." : "Check the numbers you entered.");
          }
          const nextReps = nextRepsRaw === null ? null : Math.round(nextRepsRaw);
          const touched = !sameNumber(nextWeight, set.weightKg) || !sameNumber(nextReps, set.reps);
          if (!touched) continue;

          await updateWorkoutSet(set.id, {
            weightKg: nextWeight,
            reps: nextReps,
            isCompleted: nextReps !== null && nextReps > 0,
            isWarmup: set.isWarmup,
            notes: set.notes,
          });
        }
      }

      if (action === "finish") {
        const duration = getSafeWorkoutDurationSeconds(session.startedAt, Date.now(), session.durationSeconds);
        await finishWorkoutSession(session.id, duration, session.notes);
        router.replace(`/workout/${session.id}`);
      } else {
        router.replace("/dashboard");
      }
      router.refresh();
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, ar ? "معرفناش نحفظ الأرقام." : "Could not save your numbers.")));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="gc-quick-workout mx-auto w-full min-w-0 space-y-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-2">
      <header className="gc-quick-workout-header sticky top-0 z-20 -mx-1 flex items-center gap-3 px-1 py-2">
        <button type="button" onClick={() => router.push("/dashboard")} className="gc-gym-back-button" aria-label={ar ? "رجوع للرئيسية" : "Back home"}><ChevronLeft className="h-5 w-5 rtl:rotate-180" /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">{ar ? "تسجيل سريع" : "Quick log"}</p>
          <h1 className="truncate text-lg font-black">{ar ? "الأرقام بس" : "Numbers only"}</h1>
        </div>
        <span className="text-xs font-bold text-neutral-500">{metrics.completedSets}/{metrics.totalSets}</span>
      </header>

      <section className="gc-quick-workout-intro">
        <div>
          <strong>{ar ? "سجّل الوزن والعدات واطلع" : "Log weight and reps, then leave"}</strong>
          <p>{ar ? "من غير تايمر أو Game Mode. أي سِت فيها عدات هتتحسب مكتملة." : "No timer or Game Mode. Any set with reps is saved as completed."}</p>
        </div>
      </section>

      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-300" role="alert">{error}</p> : null}

      <div className="space-y-3">
        {session.exercises.map((exercise, exerciseIndex) => {
          const previous = performances[exercise.exerciseId]?.sets ?? [];
          return (
            <section key={exercise.id} className="gc-quick-workout-exercise">
              <div className="flex items-start gap-3">
                <span className="gc-quick-workout-index">{exerciseIndex + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-black">{t(translateExerciseName(exercise.exercise.name))}</h2>
                  <p className="mt-0.5 text-[11px] font-semibold text-neutral-500">{exercise.targetRepsMin}–{exercise.targetRepsMax} {ar ? "عدات" : "reps"}</p>
                </div>
                {previous.length > 0 ? <span className="gc-quick-last-label"><History className="h-3 w-3" /> {ar ? "آخر مرة" : "Last"}</span> : null}
              </div>

              <div className="mt-3 space-y-1.5">
                {exercise.sets.map((set, setIndex) => {
                  const last = previous[setIndex];
                  return (
                    <div key={set.id} className={`gc-quick-workout-set ${set.isCompleted ? "gc-quick-workout-set-done" : ""}`}>
                      <span className="gc-quick-workout-set-number">{set.setNumber}</span>
                      <label className="min-w-0 flex-1">
                        <span>{ar ? "كجم" : "kg"}</span>
                        <input
                          name={`weight:${set.id}`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          defaultValue={set.weightKg ?? ""}
                          placeholder={last?.weightKg?.toString() ?? "—"}
                          className="gc-quick-workout-input"
                        />
                      </label>
                      <label className="min-w-0 flex-1">
                        <span>{ar ? "عدات" : "reps"}</span>
                        <input
                          name={`reps:${set.id}`}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          defaultValue={set.reps ?? ""}
                          placeholder={last?.reps?.toString() ?? "—"}
                          className="gc-quick-workout-input"
                        />
                      </label>
                      <span className="gc-quick-workout-set-state">{set.isCompleted ? <Check className="h-4 w-4" /> : null}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="gc-quick-workout-actions fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg px-3 pb-[max(.75rem,env(safe-area-inset-bottom,0px))] pt-2 sm:px-4">
        <div className="grid grid-cols-[1fr_auto] gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--surface-glass)] p-2 shadow-[var(--shadow-float)] backdrop-blur-xl">
          <button type="submit" name="action" value="exit" disabled={busy} className="gc-primary-button min-h-12 min-w-0 disabled:opacity-50"><Save className="h-4 w-4" /> {busy ? (ar ? "بنحفظ…" : "Saving…") : (ar ? "احفظ واخرج" : "Save & exit")}</button>
          <button type="submit" name="action" value="finish" disabled={busy} className="gc-secondary-button min-h-12 px-3 disabled:opacity-50">{ar ? "إنهاء" : "Finish"}</button>
        </div>
      </div>
    </form>
  );
}
