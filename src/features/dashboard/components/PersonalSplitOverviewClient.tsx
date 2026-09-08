"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Activity, ArrowLeft, CalendarDays, Dumbbell, Flame, Heart, Moon, PencilLine, Shield, Target, Zap } from "lucide-react";
import { fetchEffectiveWeekSchedule } from "@/features/splits/services/split.service";
import type { WeeklyScheduleDayWithDetails } from "@/features/splits/types";
import { getWeekdayFromDate, parseISODateOnly } from "@/lib/dates";
import { translateWorkoutLabel, WEEKDAY_SHORT_LABELS_AR } from "@/lib/localization";
import type { SplitDayIconKey, UUID, Weekday } from "@/types";

const SHORT_DAY: Record<Weekday, string> = WEEKDAY_SHORT_LABELS_AR;

const ICONS: Record<SplitDayIconKey, typeof Dumbbell> = {
  dumbbell: Dumbbell, zap: Zap, target: Target, flame: Flame, shield: Shield, heart: Heart, moon: Moon, activity: Activity,
};

function subscribeToDate() { return () => undefined; }
function getBrowserDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}
function getServerDate(): null { return null; }

export function PersonalSplitOverviewClient({ userId, compact = false }: { userId: UUID; compact?: boolean }) {
  const [days, setDays] = useState<WeeklyScheduleDayWithDetails[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const today = useSyncExternalStore(subscribeToDate, getBrowserDate, getServerDate);

  useEffect(() => {
    if (!today) return;
    let active = true;
    void fetchEffectiveWeekSchedule(userId, today)
      .then((result) => { if (active) { setDays(result); setStatus("ready"); } })
      .catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [today, userId]);

  const orderedDays = useMemo(() => [...days].sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate)), [days]);

  if (status === "loading") return <div className="h-44 animate-pulse rounded-[22px] border border-white/[0.06] bg-white/[0.035]" />;
  if (status === "error") return <section className="gc-card p-5"><p className="gc-eyebrow">جدولك</p><h2 className="mt-1 text-xl font-bold">معرفناش نحمّل جدولك.</h2><p className="mt-2 text-sm text-neutral-500">افتح جدولي عشان تجرّب تاني أو تعدّل الأسبوع.</p><Link href="/split/personal" className="gc-secondary-button mt-4">افتح جدولي <ArrowLeft className="h-4 w-4" /></Link></section>;

  return (
    <section className="gc-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="gc-eyebrow">جدولك</p><h2 className="mt-1 text-xl font-bold">{compact ? "الأسبوع ده" : "أسبوع التمرين ده"}</h2>{compact ? null : <p className="mt-1 text-sm text-neutral-500">هنا هتشوف أسماء أيامك وتعديلات الأسبوع ده.</p>}</div>
        <Link href="/split/personal" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-indigo-200" aria-label="عدّل جدولك الشخصي"><PencilLine className="h-4 w-4" /></Link>
      </div>

      <div className="gc-week-strip mt-4" aria-label="ملخص جدول الأسبوع">
        {orderedDays.map((day) => {
          const weekday = getWeekdayFromDate(parseISODateOnly(day.scheduleDate));
          const active = day.scheduleDate === today;
          const Icon = ICONS[day.iconKey];
          return (
            <Link key={day.scheduleDate} href={`/split/personal?day=${weekday}`} className={`gc-week-day-card ${active ? "gc-week-day-card-active" : ""}`} aria-current={active ? "date" : undefined}>
              <span className={`block text-[10px] font-black uppercase tracking-wide ${active ? "text-indigo-200" : "text-neutral-500"}`}>{SHORT_DAY[weekday]}</span>
              <span className={`gc-week-day-icon ${day.workoutType === "rest" ? "gc-week-day-icon-rest" : ""}`}><Icon className="h-4 w-4" /></span>
              <span className={`mt-1.5 block truncate text-[11px] font-bold ${day.workoutType === "rest" ? "text-neutral-500" : "text-neutral-200"}`}>{translateWorkoutLabel(day.displayName)}</span>
              <span className="mt-1 block text-[9px] font-semibold text-neutral-600">{active ? "النهارده" : new Intl.DateTimeFormat("ar-EG", { day: "numeric" }).format(parseISODateOnly(day.scheduleDate))}</span>
            </Link>
          );
        })}
      </div>

      {compact ? null : <Link href="/split/personal" className="mt-4 flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 transition hover:border-indigo-300/25">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-300/10 text-indigo-200"><CalendarDays className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold">حرّك يوم أو عدّله</span><span className="block text-xs text-neutral-500">الأسبوع ده بس أو كل أسبوع</span></span><ArrowLeft className="h-4 w-4 text-neutral-500" />
      </Link>}
    </section>
  );
}
