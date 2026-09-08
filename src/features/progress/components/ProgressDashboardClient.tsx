"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Award, ArrowUpLeft, BarChart3, Clock3, Dumbbell, Flame, ScanLine, Target } from "lucide-react";
import { muscleLabelAr, translateExerciseName } from "@/lib/localization";
import { formatDuration, formatWeight } from "@/lib/utils/format";
import { formatAdherencePercentage } from "@/features/progress/utils/format-adherence";
import { GainModeProgressCard } from "@/features/gain-mode/components/GainModeProgressCard";
import type { UUID } from "@/types";
import { fetchPersonalProgressSummary, type PersonalProgressSummary } from "../services/progress.service";
import { TrainingTrendChart } from "./TrainingTrendChart";
import { ProgressIntelligencePanel } from "./ProgressIntelligencePanel";

interface ProgressDashboardClientProps { userId: UUID }

function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <div className="gc-card p-4"><div className="flex items-center justify-between text-neutral-500"><span className="text-[10px] font-bold uppercase tracking-[0.14em]">{label}</span><span className="text-indigo-300">{icon}</span></div><p className="mt-3 text-2xl font-bold tracking-[-0.035em]">{value}</p><p className="mt-1 text-xs leading-5 text-neutral-500">{detail}</p></div>;
}

export function ProgressDashboardClient({ userId }: ProgressDashboardClientProps) {
  const [summary, setSummary] = useState<PersonalProgressSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchPersonalProgressSummary(userId).then((next) => { if (active) setSummary(next); }).catch((caught) => { if (active) setError(getArabicErrorMessage(caught, "معرفناش نحمّل تقدمك.")); });
    return () => { active = false; };
  }, [userId]);

  if (error) return <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-semibold text-red-300">{error}</p>;
  if (!summary) return <div className="space-y-3 pt-4"><div className="h-40 animate-pulse rounded-[26px] bg-white/[0.04]" /><div className="h-56 animate-pulse rounded-[26px] bg-white/[0.035]" /></div>;

  if (summary.totalSessions === 0) {
    return (
      <div className="space-y-4 pb-24 pt-4">
        <GainModeProgressCard userId={userId} />
        <section className="gc-hero-card rounded-[28px] p-5 sm:p-6">
          <p className="gc-eyebrow">تقدم التمرين</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">لسه مفيش أرقام نحكم عليها.</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">بدل ما نملّي الشاشة أصفار، كمّل أول تمرينة وسجّل الوزن والعدات. بعدها OVRLD يبدأ يبني اتجاه حقيقي.</p>
          <Link href="/workout/today" className="gc-primary-button mt-5 w-full sm:w-auto"><Dumbbell className="h-4 w-4" /> افتح تمرينة النهارده</Link>
        </section>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/progress/body" className="gc-card-interactive flex items-center gap-3 p-4"><Target className="h-5 w-5 text-emerald-300" /><span className="min-w-0 flex-1"><strong className="block">الجسم والوزن</strong><span className="text-xs text-neutral-500">لو بتتابع هدف جسم، ابدأ نقطة البداية.</span></span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
          <Link href="/split/personal" className="gc-card-interactive flex items-center gap-3 p-4"><Dumbbell className="h-5 w-5 text-indigo-300" /><span className="min-w-0 flex-1"><strong className="block">راجع جدولك</strong><span className="text-xs text-neutral-500">خلّي أول أسبوع واضح وسهل الالتزام.</span></span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
        </div>
      </div>
    );
  }

  const topMuscle = summary.muscles[0];
  return (
    <div className="space-y-5 pb-24 pt-4">
      <GainModeProgressCard userId={userId} />

      <section className="gc-hero-card relative overflow-hidden rounded-[30px] p-5 sm:p-7">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-indigo-300/10 blur-3xl" />
        <div className="relative flex items-end justify-between gap-4"><div><p className="gc-eyebrow">أسبوع التمرين ده</p><h2 className="mt-2 text-4xl font-bold tracking-[-0.05em]">{summary.sessionsThisWeek} تمرينات</h2><p className="mt-2 text-sm text-neutral-400">خلصت {formatAdherencePercentage(summary.adherence.weekly)} من جدولك الشخصي.</p></div><Dumbbell className="hidden h-14 w-14 text-indigo-300/35 sm:block" /></div>
        {topMuscle ? <p className="relative mt-5 inline-flex rounded-full border border-white/[0.07] bg-black/20 px-3 py-2 text-xs font-bold text-neutral-300">أكتر عضلة لعبتها مؤخرًا: <strong className="mr-1 text-indigo-300">{muscleLabelAr(topMuscle.muscle)}</strong></p> : null}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="التزام الأسبوع" value={formatAdherencePercentage(summary.adherence.weekly)} detail={`${summary.adherence.weeklyCompleted}/${summary.adherence.weeklyScheduled} تمرينات متخططلها`} icon={<Target className="h-4 w-4" />} />
        <StatCard label="السلسلة الحالية" value={`${summary.currentStreak} يوم`} detail={`الأطول: ${summary.longestStreak} يوم`} icon={<Flame className="h-4 w-4" />} />
        <StatCard label="حجم تمرين الشهر" value={formatWeight(summary.volumeThisMonthKg)} detail={`${summary.sessionsThisMonth} تمرينة مكتملة`} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="متوسط وقت التمرينة" value={formatDuration(summary.averageDurationSeconds)} detail={`${summary.totalSessions} تمرينة متسجلة`} icon={<Clock3 className="h-4 w-4" />} />
      </div>

      <ProgressIntelligencePanel userId={userId} />
      <TrainingTrendChart userId={userId} />

      <div className="grid gap-3 sm:grid-cols-3">
        {[{ href: "/progress/exercises", title: "تقدم التمارين", detail: "الوزن والعدات عبر الوقت", icon: BarChart3 }, { href: "/progress/records", title: "أرقامك القياسية", detail: "أعلى وزن وعدات وحجم", icon: Award }, { href: "/progress/body-map", title: "خريطة العضلات", detail: "إنت بتدرّب إيه فعلًا", icon: ScanLine }].map(({ href, title, detail, icon: Icon }) => <Link key={href} href={href} className="gc-card-interactive flex items-center gap-3 p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-300/10 text-indigo-300"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-bold">{title}</span><span className="block text-sm text-neutral-500">{detail}</span></span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>)}
      </div>

      {summary.recentRecords.length > 0 ? <section className="gc-card p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="gc-eyebrow">إنجازات</p><h3 className="mt-1 text-lg font-bold">أرقام جديدة</h3></div><Link href="/progress/records" className="text-xs font-bold text-indigo-300">شوف الكل</Link></div><div className="mt-4 divide-y divide-white/[0.06]">{summary.recentRecords.map((record) => <div key={`${record.exerciseId}-${record.type}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-300/10 text-amber-300"><Award className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate font-bold">{translateExerciseName(record.exerciseName)}</p><p className="text-xs capitalize text-neutral-500">{record.type === "max_weight" ? "أعلى وزن" : record.type === "max_reps" ? "أعلى عدات" : "أعلى حجم تمرين"}</p></div><strong className="text-sm">{record.type === "max_reps" ? `${record.value} عدة` : formatWeight(record.value)}</strong></div>)}</div></section> : null}
    </div>
  );
}
