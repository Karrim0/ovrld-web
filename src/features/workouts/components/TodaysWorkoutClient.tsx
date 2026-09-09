"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Dumbbell, PencilLine, Play, RotateCcw } from "lucide-react";
import type { UUID, Weekday } from "@/types";
import { WEEKDAY_LABELS_AR, translateExerciseName, translateWorkoutLabel } from "@/lib/localization";
import type { SplitDayWithDetails, WeeklyScheduleDayWithDetails } from "@/features/splits/types";
import { fetchEffectiveWeekSchedule, fetchPersonalSplit } from "@/features/splits/services/split.service";
import type { WorkoutSessionWithDetails } from "../types";
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
    const totalSets = activeSession.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
    const completedSets = activeSession.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.isCompleted).length, 0);
    if (compact) {
      return (
        <section className="gc-today-compact border-indigo-300/20">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-300 text-[#11131a]"><Play className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-indigo-300">تمرين شغال</span><h2 className="truncate text-lg font-black">كمّل تمرينتك</h2></div>
            <strong className="text-sm tabular-nums">{completedSets}/{totalSets}</strong>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-indigo-300" style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }} /></div>
          <Link href={`/workout/active?session=${activeSession.id}`} className="gc-primary-button mt-3 w-full min-h-11"><Play className="h-4 w-4" /> كمّل</Link>
        </section>
      );
    }
    return (
      <section className="gc-card border-indigo-300/20 p-5 sm:p-6">
        <p className="gc-eyebrow">فيه تمرينة شغالة</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">كمّل تمرينتك</h2>
        <p className="mt-2 text-sm text-neutral-500">خلصت {completedSets} من {totalSets} سِتات.</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-indigo-300" style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }} /></div>
        <Link href={`/workout/active?session=${activeSession.id}`} className="gc-primary-button mt-5 w-full sm:w-auto"><Play className="h-4 w-4" /> كمّل التمرينة</Link>
      </section>
    );
  }

  if (!today) {
    return (
      <section className="gc-card p-5 sm:p-6">
        <p className="gc-eyebrow">الجدول محتاج يتظبط</p>
        <h2 className="mt-2 text-xl font-bold">النهارده مش موجود في جدول الأسبوع ده.</h2>
        <p className="mt-2 text-sm text-neutral-500">افتح جدولي وظبّط أسبوع التمرين ده.</p>
        <Link href={`/split/personal?day=${weekday}`} className="gc-primary-button mt-5 w-full sm:w-auto"><PencilLine className="h-4 w-4" /> ظبّط الأسبوع ده</Link>
      </section>
    );
  }

  if (today.workoutType === "rest") {
    if (compact) {
      return (
        <section className="gc-today-compact">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-300/10 text-sky-300"><RotateCcw className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">النهارده</span><h2 className="truncate text-xl font-black">راحة</h2></div>
            <Link href={`/split/personal?day=${weekday}`} className="gc-compact-link">تعديل</Link>
          </div>
        </section>
      );
    }
    return (
      <div className="space-y-4">
        <section className="gc-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-300/10 text-sky-200"><RotateCcw className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><p className="gc-eyebrow">{translateWorkoutLabel(today.displayName)}</p><h2 className="mt-1 text-xl font-bold">راحة</h2></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2"><Link href={`/split/personal?day=${weekday}`} className="gc-secondary-button"><PencilLine className="h-4 w-4" /> عدّل الأسبوع</Link><a href="#alternate-workout" className="gc-secondary-button">اتمرّن برضه <ArrowLeft className="h-4 w-4" /></a></div>
        </section>
        {renderAlternateStarter()}
      </div>
    );
  }

  const title = translateWorkoutLabel(today.displayName) || "تمرين النهارده";
  const displayedExercises = compact ? today.exercises.slice(0, 3) : today.exercises;
  const totalTargetSets = today.exercises.reduce((total, exercise) => total + exercise.targetSets, 0);

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p> : null}
      <section className={`gc-card overflow-hidden p-0 ${compact ? "gc-today-hero" : ""}`}>
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className={`grid shrink-0 place-items-center rounded-xl bg-indigo-300 text-[#11131a] ${compact ? "h-10 w-10" : "h-12 w-12"}`}><Dumbbell className={compact ? "h-5 w-5" : "h-6 w-6"} /></span>
            <div className="min-w-0 flex-1"><p className="gc-eyebrow">{WEEKDAY_LABELS_AR[weekday]} · النهارده</p><h2 className={`mt-1 truncate font-black tracking-[-0.03em] ${compact ? "text-xl" : "text-2xl"}`}>{title}</h2><p className="mt-1 text-xs font-semibold text-neutral-500">{today.exercises.length} تمارين · {totalTargetSets} سِتات</p></div>
          </div>
          {!compact && today.dayNotes ? <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-sm leading-6 text-neutral-400">{today.dayNotes}</p> : null}
          <button type="button" disabled={isStarting || today.exercises.length === 0 || !today.sourceDay} onClick={() => void startScheduled()} className="gc-primary-button mt-5 w-full disabled:opacity-50"><Play className="h-5 w-5" /> {isStarting ? "بنبدأ…" : compact ? "ابدأ" : "ابدأ التمرينة"}</button>
        </div>

        {compact ? (
          <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
            <div className="gc-today-exercise-strip">
              {displayedExercises.map((item, index) => (
                <span key={item.id} className="gc-today-exercise-pill">
                  <span className="gc-today-exercise-index">{index + 1}</span>
                  <span className="min-w-0 truncate">{translateExerciseName(item.exercise.name)}</span>
                </span>
              ))}
              {today.exercises.length > displayedExercises.length ? <span className="gc-today-exercise-more">+{today.exercises.length - displayedExercises.length}</span> : null}
            </div>
          </div>
        ) : (
          <div className="border-t border-white/[0.06] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">تمارين النهارده</h3><Link href={`/split/personal?day=${weekday}`} className="text-xs font-semibold text-indigo-200">عدّل الأسبوع</Link></div>
            <ol className="space-y-2">{displayedExercises.map((item, index) => <li key={item.id} className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.02] p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.055] text-xs font-bold">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{translateExerciseName(item.exercise.name)}</p><p className="mt-0.5 text-xs text-neutral-500">{item.targetSets} سِتات · {item.targetRepsMin}–{item.targetRepsMax} عدات</p></div></li>)}</ol>
          </div>
        )}
      </section>
      {!compact ? renderAlternateStarter() : null}
    </div>
  );

  function renderAlternateStarter() {
    return (
      <section id="alternate-workout" className="gc-card scroll-mt-24 p-4 sm:p-5">
        <h3 className="font-semibold">اختار تمرينة تانية من جدولك</h3>
        <p className="mt-1 text-sm text-neutral-500">ده هيبدأ تمرينة زيادة النهارده من غير ما يغيّر جدول الأسبوع.</p>
        <div className="mt-3 flex gap-2"><select value={alternateDayId} onChange={(event) => setAlternateDayId(event.target.value)} className="gc-input min-w-0 flex-1"><option value="">اختار تمرينة…</option>{trainableDays.map((day) => <option key={day.id} value={day.id}>{getDayTitle(day)}</option>)}</select><button type="button" disabled={!alternateDay || isStarting} onClick={() => void startExtra(alternateDay)} className="gc-secondary-button shrink-0 disabled:opacity-40">ابدأ</button></div>
      </section>
    );
  }
}
