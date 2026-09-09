"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, History, Save, Sparkles } from "lucide-react";
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

interface SavedSummary {
  completedSets: number;
  volumeKg: number;
  finalized: boolean;
}

export function QuickWorkoutLogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const sessionId = searchParams.get("session");
  const formRef = useRef<HTMLFormElement | null>(null);
  const { session, isLoading, error: loadError } = useActiveWorkout(sessionId);
  const exerciseIds = useMemo(() => session?.exercises.map((item) => item.exerciseId) ?? [], [session]);
  const { performances } = usePreviousPerformances(exerciseIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSummary, setSavedSummary] = useState<SavedSummary | null>(null);

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-[20px] border border-[var(--border)] bg-[var(--surface-subtle)]" />;
  }

  if (loadError || !session) {
    return <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">{loadError?.message ?? (ar ? "مفيش تمرينة شغالة." : "No active workout.")}</p>;
  }

  const metrics = getSessionWorkoutMetrics(session.exercises);

  function fillFromLast(setId: string, weightKg: number | null | undefined, reps: number | null | undefined) {
    const form = formRef.current;
    if (!form) return;
    const weightInput = form.elements.namedItem(`weight:${setId}`);
    const repsInput = form.elements.namedItem(`reps:${setId}`);
    if (weightInput instanceof HTMLInputElement && weightKg !== null && weightKg !== undefined) {
      weightInput.value = String(weightKg);
    }
    if (repsInput instanceof HTMLInputElement && reps !== null && reps !== undefined) {
      repsInput.value = String(reps);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const action = String(data.get("action") ?? "finish");
    setBusy(true);
    setError(null);
    setSavedSummary(null);

    try {
      let completedSets = 0;
      let workingVolumeKg = 0;

      for (const exercise of session.exercises) {
        for (const set of exercise.sets) {
          const nextWeight = parseOptionalNumber(data.get(`weight:${set.id}`));
          const nextRepsRaw = parseOptionalNumber(data.get(`reps:${set.id}`));
          if (Number.isNaN(nextWeight) || Number.isNaN(nextRepsRaw)) {
            throw new Error(ar ? "راجع الأرقام المدخلة." : "Check the numbers you entered.");
          }
          const nextReps = nextRepsRaw === null ? null : Math.round(nextRepsRaw);
          const nextCompleted = nextReps !== null && nextReps > 0;

          if (nextCompleted) {
            completedSets += 1;
            if (!set.isWarmup) workingVolumeKg += (nextWeight ?? 0) * (nextReps ?? 0);
          }

          const touched =
            !sameNumber(nextWeight, set.weightKg) ||
            !sameNumber(nextReps, set.reps) ||
            nextCompleted !== set.isCompleted;
          if (!touched) continue;

          // Quick Log writes through the exact same workout-set service as Game Mode.
          // Once the primary action finalizes the session, Progress, PRs, Last Time,
          // adherence and Gain reviews all read this data from the same completed history.
          await updateWorkoutSet(set.id, {
            weightKg: nextWeight,
            reps: nextReps,
            isCompleted: nextCompleted,
            isWarmup: set.isWarmup,
            notes: set.notes,
          });
        }
      }

      if (action === "draft") {
        setSavedSummary({ completedSets, volumeKg: workingVolumeKg, finalized: false });
        window.setTimeout(() => {
          router.replace("/dashboard");
          router.refresh();
        }, 650);
        return;
      }

      if (completedSets === 0) {
        throw new Error(ar ? "سجّل سِت واحدة على الأقل قبل ما تحفظ التمرينة." : "Log at least one set before saving the workout.");
      }

      const duration = getSafeWorkoutDurationSeconds(session.startedAt, Date.now(), session.durationSeconds);
      await finishWorkoutSession(session.id, duration, session.notes);
      setSavedSummary({ completedSets, volumeKg: workingVolumeKg, finalized: true });

      window.setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 850);
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, ar ? "معرفناش نحفظ الأرقام." : "Could not save your numbers.")));
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="gc-quick-workout mx-auto w-full min-w-0 space-y-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-2">
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
          <p>{ar ? "الحفظ الأساسي بيقفل جلسة النهارده ويحدّث الـProgress وLast Time والـGain Process بالكامل. لو لسه هتكمل بعدين احفظها كمسودة." : "The main save finishes today’s session and updates Progress, Last Time and the Gain Process. Save a draft only if you plan to continue later."}</p>
        </div>
      </section>

      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-300" role="alert">{error}</p> : null}
      {savedSummary ? (
        <div className="gc-quick-workout-success" role="status" aria-live="polite">
          <span><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <strong>{savedSummary.finalized ? (ar ? "التقدم اتحدّث" : "Progress updated") : (ar ? "المسودة اتحفظت" : "Draft saved")}</strong>
            <p>{savedSummary.completedSets} {ar ? "سِت" : "sets"} · {Math.round(savedSummary.volumeKg).toLocaleString("en-US")} {ar ? "كجم volume" : "kg volume"}</p>
          </div>
        </div>
      ) : null}

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
                  const hasLast = last && (last.weightKg !== null || last.reps !== null);
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
                      {hasLast ? (
                        <button type="button" className="gc-quick-use-last" onClick={() => fillFromLast(set.id, last?.weightKg, last?.reps)}>
                          <History className="h-3 w-3" /> {ar ? "استخدم آخر أرقام" : "Use last"}
                          <span>{last?.weightKg ?? "—"} × {last?.reps ?? "—"}</span>
                        </button>
                      ) : null}
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
          <button type="submit" name="action" value="finish" disabled={busy} className="gc-primary-button min-h-12 min-w-0 disabled:opacity-50"><Save className="h-4 w-4" /> {busy ? (ar ? "بنحفظ…" : "Saving…") : (ar ? "احفظ التمرينة" : "Save workout")}</button>
          <button type="submit" name="action" value="draft" disabled={busy} className="gc-secondary-button min-h-12 px-3 disabled:opacity-50">{ar ? "مسودة" : "Draft"}</button>
        </div>
      </div>
    </form>
  );
}
