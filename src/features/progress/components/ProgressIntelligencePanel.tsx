"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, CircleAlert, Gauge, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { getArabicErrorMessage, translateExerciseName } from "@/lib/localization";
import type { UUID } from "@/types";
import { fetchProgressIntelligence, type ProgressIntelligenceSummary } from "../services/progress-intelligence.service";

const MOMENTUM_META = {
  collecting: { title: "بنجمع خط الأساس", icon: Gauge, tone: "text-neutral-400" },
  rising: { title: "القوة ماشية لفوق", icon: TrendingUp, tone: "text-emerald-300" },
  steady: { title: "التقدم مستقر", icon: Sparkles, tone: "text-emerald-300" },
  needs_attention: { title: "في أرقام محتاجة عين", icon: TrendingDown, tone: "text-amber-300" },
} as const;

export function ProgressIntelligencePanel({ userId }: { userId: UUID }) {
  const [data, setData] = useState<ProgressIntelligenceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchProgressIntelligence(userId)
      .then((next) => { if (active) setData(next); })
      .catch((caught) => { if (active) setError(getArabicErrorMessage(caught, "معرفناش نحلّل تقدمك دلوقتي.")); });
    return () => { active = false; };
  }, [userId]);

  if (error) return <p className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs font-semibold text-rose-300">{error}</p>;
  if (!data) return <div className="h-36 animate-pulse rounded-[20px] border border-white/[0.06] bg-white/[0.025]" />;

  const momentum = MOMENTUM_META[data.momentum];
  const MomentumIcon = momentum.icon;
  const firstInsight = data.insights[0] ?? null;

  return (
    <section className="gc-daily-panel overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] ${momentum.tone}`}><MomentumIcon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">تحليل التمرين</span><h3 className="truncate text-base font-black">{momentum.title}</h3></div>
        <Link href="/progress/exercises" className="gc-compact-link">التفاصيل</Link>
      </div>
      <div className="grid grid-cols-3 border-y border-white/[0.055]">
        <div className="gc-number-cell"><span>بيتحسن</span><strong className="text-emerald-300">{data.improvingCount}</strong></div>
        <div className="gc-number-cell border-x border-white/[0.055]"><span>ثابت</span><strong>{data.steadyCount}</strong></div>
        <div className="gc-number-cell"><span>محتاج عين</span><strong className={data.plateauCount + data.slippingCount > 0 ? "text-amber-300" : ""}>{data.plateauCount + data.slippingCount}</strong></div>
      </div>
      {firstInsight ? (
        <Link href={firstInsight.exerciseId ? `/progress/exercises/${firstInsight.exerciseId}` : "/progress/exercises"} className="flex items-center gap-3 px-4 py-3 text-sm">
          <span className={firstInsight.tone === "watch" ? "text-amber-300" : firstInsight.tone === "positive" ? "text-emerald-300" : "text-emerald-300"}>{firstInsight.tone === "watch" ? <CircleAlert className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}</span>
          <span className="min-w-0 flex-1 truncate font-bold">{firstInsight.exerciseName ? `${translateExerciseName(firstInsight.exerciseName)} · ${firstInsight.title}` : firstInsight.title}</span>
          <ArrowUpLeft className="h-4 w-4 text-neutral-600" />
        </Link>
      ) : null}
    </section>
  );
}
