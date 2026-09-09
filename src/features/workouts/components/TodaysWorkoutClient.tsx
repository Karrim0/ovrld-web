"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import Link from "next/link";
import { ArrowLeft, Dumbbell, Play, RotateCcw } from "lucide-react";
import type { UUID, Weekday } from "@/types";
import { WEEKDAY_LABELS_AR, translateExerciseName, translateWorkoutLabel } from "@/lib/localization";
import type { SplitDayWithDetails, WeeklyScheduleDayWithDetails } from "@/features/splits/types";
import { fetchEffectiveWeekSchedule, fetchPersonalSplit } from "@/features/splits/services/split.service";
import type { WorkoutSessionWithDetails } from "../types";
import { getPlannedWorkoutMetrics, getSessionWorkoutMetrics } from "../utils/workout-metrics";
import { fetchActiveWorkoutSession, startWorkoutSession } from "../services/workout-session.service";

const DAY_BY_JS_INDEX: Record<number, Weekday> = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday", 6: "saturday",
};

function getLocalDateValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function getDayTitle(day: Pick<SplitDayWithDetails, "displayName" | "workoutType">) {
  return translateWorkoutLabel(day.displayName?.trim()) || (day.workoutType === "rest" ? "راحة" : "يوم تمرين");
}

interface TodaysWorkoutClientProps { userId: UUID; compact?: boolean }

export function TodaysWorkoutClient({ userId, compact = false }: TodaysWorkoutClientProps) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const [baseDays, setBaseDays] = useState<SplitDayWithDetails[]>([]);
  const [weekDays, setWeekDays] = useState<WeeklyScheduleDayWithDetails[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSessionWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [alternateDayId, setAlternateDayId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentDate = useSyncExternalStore(
    () => () => undefined,
    () => getLocalDateValue(new Date()),
    () => null,
  );

  const load = useCallback(async () => {
    if (!currentDate) return;
    setIsLoading(true);
    setError(null);
    try {
      const [split, week, active] = await Promise.all([
        fetchPersonalSplit(userId),
        fetchEffectiveWeekSchedule(userId, currentDate),
        fetchActiveWorkoutSession(),
      ]);
      setBaseDays(split);
      setWeekDays(week);
      setActiveSession(active);
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نحمّل تمرينة النهارده."));
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const weekday = currentDate ? DAY_BY_JS_INDEX[new Date(`${currentDate}T12:00:00`).getDay()] : null;
  const today = useMemo(() => currentDate ? weekDays.find((day) => day.scheduleDate === currentDate) ?? null : null, [currentDate, weekDays]);
  const trainableDays = baseDays.filter((day) => day.workoutType !== "rest" && day.exercises.length > 0);
  const alternateDay = trainableDays.find((day) => day.id === alternateDayId) ?? null;

  async function startScheduled(day: WeeklyScheduleDayWithDetails | null = today) {
    if (!day || day.workoutType === "rest" || !currentDate || !day.sourceDay) return;
    setIsStarting(true);
    setError(null);
    try {
      const session = await startWorkoutSession(userId, day.sourceDay, currentDate);
      router.push(`/workout/active?session=${session.id}`);
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نبدأ التمرينة."));
    } finally {
      setIsStarting(false);
    }
  }

  async function startExtra(day: SplitDayWithDetails | null) {
    if (!day || day.workoutType === "rest" || !currentDate) return;
    setIsStarting(true);
    setError(null);
    try {
      const session = await startWorkoutSession(userId, day, currentDate);
      router.push(`/workout/active?session=${session.id}`);
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نبدأ التمرينة."));
    } finally {
      setIsStarting(false);
    }
  }

  if (isLoading || !currentDate || !weekday) return <div className="h-48 animate-pulse rounded-[20px] border border-white/[0.06] bg-white/[0.035]" />;

  if (activeSession) {
    const activeMetrics = getSessionWorkoutMetrics(activeSession.exercises);
    const { totalSets, completedSets } = activeMetrics;
    if (compact) {
      return (
        <section className="gc-home-train-card gc-home-train-card-active">
          <div className="flex items-start gap-3">
            <span className="gc-home-train-icon"><Play className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <span className="gc-home-action-label">{ar ? "تدرّب" : "Train"}</span>
              <h2 className="mt-1 truncate text-2xl font-black tracking-[-0.04em]">{ar ? "كمّل تمرينتك" : "Resume workout"}</h2>
              <p className="mt-1 text-sm font-semibold text-neutral-500">{completedSets}/{totalSets} {ar ? "سِتات مكتملة" : "sets completed"}</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }} /></div>
          <Link href={`/workout/active?session=${activeSession.id}`} className="gc-primary-button mt-4 w-full min-h-12"><Play className="h-4 w-4" /> {ar ? "كمّل التمرينة" : "Resume workout"}</Link>
        </section>
      );
    }
    return (
      <section className="gc-card border-emerald-300/20 p-5 sm:p-6">
        <p className="gc-eyebrow">{ar ? "فيه تمرينة شغالة" : "Workout in progress"}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">{ar ? "كمّل تمرينتك" : "Resume workout"}</h2>
        <p className="mt-2 text-sm text-neutral-500">{ar ? `خلصت ${completedSets} من ${totalSets} سِتات.` : `${completedSets} of ${totalSets} sets completed.`}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }} /></div>
        <Link href={`/workout/active?session=${activeSession.id}`} className="gc-primary-button mt-5 w-full sm:w-auto"><Play className="h-4 w-4" /> {ar ? "كمّل التمرينة" : "Resume workout"}</Link>
      </section>
    );
  }

  if (!today) {
    return (
      <div className="space-y-4">
        <section className="gc-card p-5 sm:p-6">
          <p className="gc-eyebrow">{ar ? "تمرين النهارده" : "Today’s Workout"}</p>
          <h2 className="mt-2 text-xl font-bold">{ar ? "مفيش تمرين متحدد للنهارده" : "No workout scheduled today"}</h2>
          <p className="mt-2 text-sm text-neutral-500">{ar ? "اختار تمرينة من خطتك وابدأ على طول." : "Choose a workout from your plan and start right away."}</p>
        </section>
        {renderAlternateStarter()}
      </div>
    );
  }

  if (today.workoutType === "rest") {
    if (compact) {
      return (
        <section className="gc-home-train-card">
          <div className="flex items-start gap-3">
            <span className="gc-home-train-icon gc-home-train-icon-rest"><RotateCcw className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <span className="gc-home-action-label">{ar ? "تدرّب" : "Train"}</span>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">{ar ? "النهارده راحة" : "Rest day"}</h2>
              <p className="mt-1 text-sm font-semibold text-neutral-500">{ar ? "لو عايز تتمرن، اختار تمرينة من جدولك." : "If you want to train, choose a workout from your plan."}</p>
            </div>
          </div>
          <Link href="/workout/today#alternate-workout" className="gc-secondary-button mt-4 w-full min-h-12">{ar ? "اختار تمرينة من جدولك" : "Choose workout from your plan"}</Link>
        </section>
      );
    }
    return (
      <div className="space-y-4">
        <section className="gc-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-300/10 text-sky-200"><RotateCcw className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><p className="gc-eyebrow">{t(translateWorkoutLabel(today.displayName))}</p><h2 className="mt-1 text-xl font-bold">{ar ? "راحة" : "Rest"}</h2></div>
          </div>
          <a href="#alternate-workout" className="gc-secondary-button mt-4 w-full">{ar ? "تمرّن حاجة تانية" : "Train another workout"} <ArrowLeft className="h-4 w-4" /></a>
        </section>
        {renderAlternateStarter()}
      </div>
    );
  }

  const title = translateWorkoutLabel(today.displayName) || (ar ? "تمرين النهارده" : "Today’s Workout");
  const displayedExercises = compact ? today.exercises.slice(0, 3) : today.exercises;
  const plannedMetrics = getPlannedWorkoutMetrics(today.exercises);
  const totalTargetSets = plannedMetrics.totalSets;

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p> : null}
      <section className={`${compact ? "gc-home-train-card" : "gc-card overflow-hidden p-0"}`}>
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className={`grid shrink-0 place-items-center rounded-xl bg-emerald-300 text-[#11131a] ${compact ? "h-10 w-10" : "h-12 w-12"}`}><Dumbbell className={compact ? "h-5 w-5" : "h-6 w-6"} /></span>
            <div className="min-w-0 flex-1"><p className="gc-eyebrow">{compact ? (ar ? "تدرّب" : "Train") : `${t(WEEKDAY_LABELS_AR[weekday])} · ${ar ? "النهارده" : "Today"}`}</p><h2 className={`mt-1 truncate font-black tracking-[-0.03em] ${compact ? "text-2xl" : "text-2xl"}`}>{t(title)}</h2><p className="mt-1 text-xs font-semibold text-neutral-500">{plannedMetrics.exerciseCount} {ar ? "تمارين" : "exercises"} · {totalTargetSets} {ar ? "سِتات" : "sets"}</p></div>
          </div>
          {!compact && today.dayNotes ? <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-sm leading-6 text-neutral-400">{today.dayNotes}</p> : null}
          <button type="button" disabled={isStarting || today.exercises.length === 0 || !today.sourceDay} onClick={() => void startScheduled()} className="gc-primary-button mt-5 w-full disabled:opacity-50"><Play className="h-5 w-5" /> {isStarting ? (ar ? "بنبدأ…" : "Starting…") : compact ? (ar ? "ابدأ التمرينة" : "Start workout") : (ar ? "ابدأ التمرينة" : "Start workout")}</button>
        </div>

        {compact ? (
          <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
            <div className="gc-today-exercise-strip">
              {displayedExercises.map((item, index) => (
                <span key={item.id} className="gc-today-exercise-pill">
                  <span className="gc-today-exercise-index">{index + 1}</span>
                  <span className="min-w-0 truncate">{t(translateExerciseName(item.exercise.name))}</span>
                </span>
              ))}
              {today.exercises.length > displayedExercises.length ? <span className="gc-today-exercise-more">+{today.exercises.length - displayedExercises.length}</span> : null}
            </div>
          </div>
        ) : (
          <div className="border-t border-white/[0.06] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">{ar ? "أهم التمارين" : "Key exercises"}</h3><span className="text-xs font-semibold text-neutral-500">{plannedMetrics.exerciseCount} {ar ? "تمارين" : "exercises"}</span></div>
            <ol className="space-y-2">{displayedExercises.map((item, index) => <li key={item.id} className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.02] p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.055] text-xs font-bold">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t(translateExerciseName(item.exercise.name))}</p><p className="mt-0.5 text-xs text-neutral-500">{item.targetSets} {ar ? "سِتات" : "sets"} · {item.targetRepsMin}–{item.targetRepsMax} {ar ? "عدات" : "reps"}</p></div></li>)}</ol>
          </div>
        )}
      </section>
      {!compact ? renderAlternateStarter() : null}
    </div>
  );

  function renderAlternateStarter() {
    return (
      <section id="alternate-workout" className="gc-card scroll-mt-24 p-4 sm:p-5">
        <h3 className="font-semibold">{ar ? "تمرّن حاجة تانية" : "Train another workout"}</h3>
        <p className="mt-1 text-sm text-neutral-500">{ar ? "اختار تمرينة من خطتك من غير ما تغيّر الجدول." : "Choose a workout from your plan without changing the schedule."}</p>
        <div className="mt-3 flex gap-2"><select value={alternateDayId} onChange={(event) => setAlternateDayId(event.target.value)} className="gc-input min-w-0 flex-1"><option value="">{ar ? "اختار تمرينة…" : "Choose a workout…"}</option>{trainableDays.map((day) => <option key={day.id} value={day.id}>{getDayTitle(day)}</option>)}</select><button type="button" disabled={!alternateDay || isStarting} onClick={() => void startExtra(alternateDay)} className="gc-secondary-button shrink-0 disabled:opacity-40">{ar ? "ابدأ" : "Start"}</button></div>
      </section>
    );
  }
}
