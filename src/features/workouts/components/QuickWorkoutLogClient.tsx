"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, Save, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { getArabicErrorMessage, translateExerciseName } from "@/lib/localization";
import { useActiveWorkout } from "../hooks/use-active-workout";
import { usePreviousPerformances } from "../hooks/use-previous-performance";
import { finishWorkoutSession, updateWorkoutSet } from "../services/workout-session.service";
import { getSafeWorkoutDurationSeconds } from "../utils/session-time";

function parseNumber(input: HTMLInputElement | null) {
  if (!input || !input.value.trim()) return null;
  const parsed = Number(input.value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function e1rm(weight: number | null, reps: number | null) {
  if (weight == null || reps == null || weight <= 0 || reps <= 0) return null;
  return weight * (1 + reps / 30);
}

export function QuickWorkoutLogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const sessionId = searchParams.get("session");
  const requestedEdit = searchParams.get("edit") === "1";
  const formRef = useRef<HTMLFormElement | null>(null);
  const { session, isLoading, error: loadError } = useActiveWorkout(sessionId);
  const exerciseIds = useMemo(() => session?.exercises.map((item) => item.exerciseId) ?? [], [session]);
  const { performances } = usePreviousPerformances(exerciseIds, { excludeSessionId: session?.id });
  const [locallySavedExerciseIds, setLocallySavedExerciseIds] = useState<Set<string>>(new Set());
  const [busyExerciseId, setBusyExerciseId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingCompleted = session?.status === "completed" || requestedEdit;

  const savedExerciseIds = useMemo(() => {
    const saved = new Set(locallySavedExerciseIds);
    for (const exercise of session?.exercises ?? []) {
      if (exercise.sets.some((set) => set.isCompleted)) saved.add(exercise.id);
    }
    return saved;
  }, [locallySavedExerciseIds, session]);

  if (isLoading) return <div className="h-72 animate-pulse rounded-[20px] border border-[var(--border)] bg-[var(--surface-subtle)]" />;
  if (loadError || !session) return <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">{loadError?.message ?? (ar ? "التمرينة مش متاحة." : "Workout is not available.")}</p>;

  const savedCount = savedExerciseIds.size;
  const totalExercises = session.exercises.length;
  const allSaved = totalExercises > 0 && savedCount === totalExercises;

  function input(name: string) {
    const element = formRef.current?.elements.namedItem(name);
    return element instanceof HTMLInputElement ? element : null;
  }

  function hasSuspiciousDrop(exerciseIndex: number) {
    if (editingCompleted) return false;
    const exercise = session!.exercises[exerciseIndex];
    const previous = performances[exercise.exerciseId];
    if (!previous?.sets.length) return false;
    const previousAt = previous.completedAt ? new Date(previous.completedAt).getTime() : null;
    const currentSessionAt = new Date(session!.startedAt).getTime();
    if (previousAt && Number.isFinite(currentSessionAt) && currentSessionAt - previousAt > 21 * 86_400_000) return false;

    const currentScores = exercise.sets.map((set) => e1rm(parseNumber(input(`weight:${set.id}`)), parseNumber(input(`reps:${set.id}`))));
    const previousScores = previous.sets.map((set) => e1rm(set.weightKg, set.reps));
    const currentBest = Math.max(0, ...currentScores.filter((value): value is number => value != null));
    const previousBest = Math.max(0, ...previousScores.filter((value): value is number => value != null));
    return previousBest > 0 && currentBest > 0 && currentBest < previousBest * 0.68;
  }

  async function saveExercise(exerciseIndex: number) {
    const exercise = session!.exercises[exerciseIndex];
    setError(null);
    if (hasSuspiciousDrop(exerciseIndex)) {
      const okay = window.confirm(ar ? "الأداء أقل بوضوح من آخر مرة من غير فجوة طويلة. لو ده مقصود احفظه عادي؛ لو رقم غلط ارجع راجعه." : "This performance is much lower than last time without a long gap. Save it if intentional, or review the numbers if it is a mistake.");
      if (!okay) return;
    }

    setBusyExerciseId(exercise.id);
    try {
      let completed = 0;
      for (const set of exercise.sets) {
        const weight = parseNumber(input(`weight:${set.id}`));
        const repsRaw = parseNumber(input(`reps:${set.id}`));
        if (Number.isNaN(weight) || Number.isNaN(repsRaw)) throw new Error(ar ? "راجع الأرقام المدخلة." : "Check the numbers you entered.");
        const reps = repsRaw == null ? null : Math.round(repsRaw);
        const isCompleted = reps != null && reps > 0;
        if (isCompleted) completed += 1;
        await updateWorkoutSet(set.id, { weightKg: weight, reps, isCompleted, isWarmup: set.isWarmup, notes: set.notes });
      }
      if (completed === 0) throw new Error(ar ? "سجّل سِت واحدة على الأقل في التمرين." : "Log at least one set for this exercise.");
      setLocallySavedExerciseIds((current) => new Set(current).add(exercise.id));
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, ar ? "معرفناش نحفظ التمرين." : "Could not save this exercise.")));
    } finally {
      setBusyExerciseId(null);
    }
  }

  async function finish(eventTimestamp: number) {
    setError(null);
    if (editingCompleted) { router.replace(`/workout/${session!.id}`); router.refresh(); return; }
    if (!allSaved) {
      setError(ar ? `لسه ${totalExercises - savedCount} تمرين مش محفوظ. احفظهم أو اخرج كمسودة.` : `${totalExercises - savedCount} exercises are still unsaved. Save them or leave as a draft.`);
      return;
    }
    setFinishing(true);
    try {
      const completedAtMs = eventTimestamp > 1_000_000_000_000 ? eventTimestamp : performance.timeOrigin + eventTimestamp;
      const duration = getSafeWorkoutDurationSeconds(session!.startedAt, completedAtMs, session!.durationSeconds);
      await finishWorkoutSession(session!.id, duration, session!.notes);
      router.replace("/dashboard"); router.refresh();
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, ar ? "معرفناش نقفل تمرينة النهارده." : "Could not finish today’s workout.")));
      setFinishing(false);
    }
  }

  function exit() {
    if (!editingCompleted && !allSaved && savedCount > 0) {
      const okay = window.confirm(ar ? `اتحفظ ${savedCount} من ${totalExercises} تمارين. الباقي هيفضل Draft. تخرج؟` : `${savedCount} of ${totalExercises} exercises are saved. The rest will stay as a draft. Leave?`);
      if (!okay) return;
    }
    router.push(editingCompleted ? `/workout/${session!.id}` : "/dashboard");
  }

  return (
    <form ref={formRef} className="gc-quick-workout mx-auto w-full min-w-0 space-y-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-2" onSubmit={(event) => event.preventDefault()}>
      <header className="gc-quick-workout-header sticky top-0 z-20 -mx-1 flex items-center gap-3 px-1 py-2">
        <button type="button" onClick={exit} className="gc-gym-back-button" aria-label={ar ? "رجوع" : "Back"}><ChevronLeft className="h-5 w-5 rtl:rotate-180" /></button>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">{editingCompleted ? (ar ? "تعديل التمرينة" : "Edit workout") : (ar ? "تسجيل سريع" : "Quick log")}</p><h1 className="truncate text-lg font-black">{ar ? "الوزن والعدات" : "Weight & reps"}</h1></div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${allSaved ? "bg-emerald-300/10 text-emerald-300" : "bg-white/[0.05] text-neutral-400"}`}>{savedCount}/{totalExercises}</span>
      </header>

      <section className="gc-quick-workout-intro"><div><strong>{editingCompleted ? (ar ? "عدّل أرقام اليوم المحفوظ" : "Edit saved workout numbers") : (ar ? "آخر أرقامك موجودة قدامك تلقائيًا" : "Your last numbers are pre-filled")}</strong><p>{ar ? "الأرقام المقترحة لا تتحسب تسجيل إلا لما تحفظ التمرين نفسه." : "Suggested values do not count as logged until you save that exercise."}</p></div></section>
      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-300" role="alert">{error}</p> : null}

      <div className="space-y-3">
        {session.exercises.map((exercise, exerciseIndex) => {
          const previous = performances[exercise.exerciseId]?.sets ?? [];
          const saved = savedExerciseIds.has(exercise.id);
          return <section key={exercise.id} className={`gc-quick-workout-exercise ${saved ? "ring-1 ring-emerald-300/15" : ""}`}>
            <div className="flex items-start gap-3"><span className="gc-quick-workout-index">{exerciseIndex + 1}</span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-black">{t(translateExerciseName(exercise.exercise.name))}</h2><p className="mt-0.5 text-[11px] font-semibold text-neutral-500">{exercise.targetRepsMin}–{exercise.targetRepsMax} {ar ? "عدات" : "reps"}</p></div>{saved ? <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-300"><Check className="h-3.5 w-3.5" /> {ar ? "محفوظ" : "Saved"}</span> : null}</div>
            <div className="mt-3 space-y-1.5">{exercise.sets.map((set, setIndex) => { const last = previous[setIndex]; return <div key={set.id} className="gc-quick-workout-set"><span className="gc-quick-workout-set-number">{set.setNumber}</span><label className="min-w-0 flex-1"><span>{ar ? "كجم" : "kg"}</span><input name={`weight:${set.id}`} type="number" inputMode="decimal" min="0" step="any" defaultValue={set.weightKg ?? last?.weightKg ?? ""} className="gc-quick-workout-input" /></label><label className="min-w-0 flex-1"><span>{ar ? "عدات" : "reps"}</span><input name={`reps:${set.id}`} type="number" inputMode="numeric" min="0" step="1" defaultValue={set.reps ?? last?.reps ?? ""} className="gc-quick-workout-input" /></label></div>; })}</div>
            <button type="button" disabled={busyExerciseId === exercise.id || finishing} onClick={() => void saveExercise(exerciseIndex)} className={`mt-3 w-full min-h-10 ${saved ? "gc-secondary-button" : "gc-primary-button"} disabled:opacity-50`}><Save className="h-4 w-4" />{busyExerciseId === exercise.id ? (ar ? "بنحفظ…" : "Saving…") : saved ? (ar ? "حدّث التمرين" : "Update exercise") : (ar ? "احفظ التمرين" : "Save exercise")}</button>
          </section>;
        })}
      </div>

      {!editingCompleted && !allSaved && savedCount > 0 ? <div className="flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs leading-5 text-neutral-400"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />{ar ? `اليوم لسه جزئي: ${savedCount} من ${totalExercises} تمارين محفوظة.` : `Today is partial: ${savedCount} of ${totalExercises} exercises saved.`}</div> : null}

      <div className="gc-quick-workout-actions fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg px-3 pb-[max(.75rem,env(safe-area-inset-bottom,0px))] pt-2 sm:px-4"><div className="grid grid-cols-[1fr_auto] gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--surface-glass)] p-2 shadow-[var(--shadow-float)] backdrop-blur-xl"><button type="button" onClick={(event) => void finish(event.timeStamp)} disabled={finishing || busyExerciseId !== null} className="gc-primary-button min-h-12 min-w-0 disabled:opacity-50"><Check className="h-4 w-4" />{editingCompleted ? (ar ? "تم التعديل" : "Done editing") : finishing ? (ar ? "بنقفل اليوم…" : "Finishing…") : allSaved ? (ar ? "احفظ اليوم" : "Save day") : (ar ? `احفظ باقي ${totalExercises - savedCount}` : `Save ${totalExercises - savedCount} more`)}</button><button type="button" onClick={exit} disabled={finishing} className="gc-secondary-button min-h-12 px-3 disabled:opacity-50">{editingCompleted ? (ar ? "إلغاء" : "Cancel") : (ar ? "اخرج" : "Exit")}</button></div></div>
    </form>
  );
}
