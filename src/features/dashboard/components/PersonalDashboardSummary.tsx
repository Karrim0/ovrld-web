"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, Flame, Target } from "lucide-react";
import { formatAdherencePercentage } from "@/features/progress/utils/format-adherence";
import { fetchPersonalProgressSummary, type PersonalProgressSummary } from "@/features/progress/services/progress.service";
import type { UUID } from "@/types";

type SummaryState =
  | { status: "loading" }
  | { status: "ready"; summary: PersonalProgressSummary }
  | { status: "error" };

export function PersonalDashboardSummary({ userId }: { userId: UUID }) {
  const [state, setState] = useState<SummaryState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    void fetchPersonalProgressSummary(userId)
      .then((summary) => {
        if (active) setState({ status: "ready", summary });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (state.status === "loading") {
    return <div className="h-32 animate-pulse rounded-[22px] border border-white/[0.06] bg-white/[0.035]" />;
  }

  if (state.status === "error") {
    return (
      <section className="gc-card p-5">
        <p className="font-semibold">التقدم مش متاح مؤقتًا.</p>
        <p className="mt-1 text-sm text-neutral-500">بيانات تمرينك لسه محفوظة على الجهاز.</p>
        <Link href="/progress" className="gc-secondary-button mt-4">افتح التقدم</Link>
      </section>
    );
  }

  const { summary } = state;
  const stats = [
    { label: "خطة الأسبوع", value: formatAdherencePercentage(summary.adherence.weekly), detail: `${summary.adherence.weeklyCompleted}/${summary.adherence.weeklyScheduled}`, icon: Target, tone: "text-emerald-300" },
    { label: "السلسلة الحالية", value: `${summary.currentStreak} يوم`, detail: `الأفضل ${summary.longestStreak} يوم`, icon: Flame, tone: "text-orange-400" },
    { label: "آخر الأرقام", value: String(summary.recentRecords.length), detail: "إنجازات جديدة", icon: Award, tone: "text-amber-300" },
  ];

  return (
    <Link href="/progress" className="gc-card-interactive block p-4 sm:p-5" aria-label="افتح التقدم">
      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3 sm:gap-3">
        {stats.map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="gc-stat min-w-0">
            <Icon className={`h-4 w-4 ${tone}`} />
            <strong className="mt-2 block truncate text-lg font-bold sm:text-2xl">{value}</strong>
            <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500 sm:text-[11px]">{label}</span>
            <span className="mt-0.5 block truncate text-[10px] text-neutral-600 sm:text-xs">{detail}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}
