"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Award, ArrowUpLeft, BarChart3, Dumbbell, Flame, ScanLine, Target } from "lucide-react";
import { translateExerciseName } from "@/lib/localization";
import { formatWeight } from "@/lib/utils/format";
import { formatAdherencePercentage } from "@/features/progress/utils/format-adherence";
import type { UUID } from "@/types";
import { fetchPersonalProgressSummary, type PersonalProgressSummary } from "../services/progress.service";
import { TrainingTrendChart } from "./TrainingTrendChart";
import { ProgressIntelligencePanel } from "./ProgressIntelligencePanel";

interface ProgressDashboardClientProps { userId: UUID }

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="gc-metric"><span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-neutral-500">{icon}{label}</span><strong className="mt-1 block text-xl font-black tracking-[-0.03em]">{value}</strong></div>;
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
  if (!summary) return <div className="space-y-3 pt-4"><div className="h-28 animate-pulse rounded-[20px] bg-white/[0.03]" /><div className="h-48 animate-pulse rounded-[20px] bg-white/[0.025]" /></div>;

  if (summary.totalSessions === 0) {
    return (
      <div className="space-y-4 pb-24 pt-4">
        <section className="gc-empty-state">
          <Dumbbell className="h-6 w-6 text-emerald-300" />
          <h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">ابدأ أول تمرينة</h2>
          <p className="mt-1 text-sm text-neutral-500">بعد أول تسجيل هنبدأ نعرض القوة والالتزام والاتجاه.</p>
          <Link href="/workout/today" className="gc-primary-button mt-4 w-full sm:w-auto">ابدأ</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 pt-4">
      <section className="gc-progress-summary">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">الأسبوع ده</span>
          <div className="mt-1 flex items-baseline gap-2"><strong className="text-3xl font-black tracking-[-0.05em]">{summary.sessionsThisWeek}</strong><span className="text-sm font-bold text-neutral-500">تمرين</span></div>
        </div>
        <div className="text-end"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">الالتزام</span><strong className="mt-1 block text-2xl font-black text-emerald-300">{formatAdherencePercentage(summary.adherence.weekly)}</strong></div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="السلسلة" value={`${summary.currentStreak} يوم`} icon={<Flame className="h-3.5 w-3.5" />} />
        <Metric label="الشهر" value={`${summary.sessionsThisMonth}`} icon={<Target className="h-3.5 w-3.5" />} />
        <Metric label="الحجم" value={formatWeight(summary.volumeThisMonthKg)} icon={<Activity className="h-3.5 w-3.5" />} />
      </div>

      <ProgressIntelligencePanel userId={userId} />
      <TrainingTrendChart userId={userId} />

      <section className="gc-list-panel">
        {[
          { href: "/progress/exercises", title: "تقدم التمارين", icon: BarChart3 },
          { href: "/progress/records", title: "الأرقام القياسية", icon: Award },
          { href: "/progress/body-map", title: "خريطة العضلات", icon: ScanLine },
        ].map(({ href, title, icon: Icon }) => (
          <Link key={href} href={href} className="gc-list-row"><Icon className="h-4 w-4 text-emerald-300" /><span className="min-w-0 flex-1 font-bold">{title}</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
        ))}
      </section>

      {summary.recentRecords.length > 0 ? (
        <section className="gc-list-panel">
          <div className="flex items-center justify-between px-4 py-3"><strong>آخر الأرقام</strong><Link href="/progress/records" className="text-xs font-bold text-emerald-300">الكل</Link></div>
          {summary.recentRecords.slice(0, 3).map((record) => (
            <div key={`${record.exerciseId}-${record.type}`} className="gc-list-row"><Award className="h-4 w-4 text-amber-300" /><span className="min-w-0 flex-1 truncate font-bold">{translateExerciseName(record.exerciseName)}</span><strong className="text-sm">{record.type === "max_reps" ? `${record.value} عدة` : formatWeight(record.value)}</strong></div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
