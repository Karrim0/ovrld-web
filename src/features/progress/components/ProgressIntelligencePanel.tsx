"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, CircleAlert, Gauge, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { getArabicErrorMessage, muscleLabelAr, translateExerciseName } from "@/lib/localization";
import type { UUID } from "@/types";
import {
  fetchProgressIntelligence,
  type ExerciseMomentumStatus,
  type ProgressIntelligenceSummary,
} from "../services/progress-intelligence.service";

const STATUS_META: Record<ExerciseMomentumStatus, { label: string; className: string }> = {
  improving: { label: "بيتحسن", className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" },
  steady: { label: "ثابت", className: "border-sky-300/20 bg-sky-300/10 text-sky-200" },
  plateau: { label: "واقف شوية", className: "border-amber-300/25 bg-amber-300/10 text-amber-200" },
  slipping: { label: "محتاج عين", className: "border-rose-300/25 bg-rose-300/10 text-rose-200" },
  new: { label: "لسه جديد", className: "border-white/10 bg-white/[0.04] text-neutral-400" },
};

const MOMENTUM_META = {
  collecting: { title: "لسه بنجمع خط الأساس", detail: "سجّل كام تمرينة بنفس الأمانة، وبعدها الإشارات تبقى أذكى.", icon: Gauge },
  rising: { title: "العملية ماشية لفوق", detail: "في تمارين أكتر بتتحسن من اللي واقفة أو راجعة.", icon: TrendingUp },
  steady: { title: "التقدم هادي ومستقر", detail: "مفيش إشارة واحدة تستدعي قلب الخطة. ركّز على الاستمرارية.", icon: Sparkles },
  needs_attention: { title: "في كذا رقم محتاج عين", detail: "مش لازم تغيّر البرنامج؛ بص على الإشارات واحدة واحدة الأول.", icon: TrendingDown },
} as const;

function InsightIcon({ tone }: { tone: "positive" | "neutral" | "watch" }) {
  if (tone === "positive") return <TrendingUp className="h-4 w-4" />;
  if (tone === "watch") return <CircleAlert className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
}

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

  if (error) return <section className="gc-card p-4"><p className="text-sm font-semibold text-rose-300">{error}</p></section>;
  if (!data) return <section className="h-64 animate-pulse rounded-[26px] border border-white/[0.06] bg-white/[0.035]" />;

  const momentum = MOMENTUM_META[data.momentum];
  const MomentumIcon = momentum.icon;
  const visibleExercises = data.exercises.filter((item) => item.status !== "new").slice(0, 6);

  return (
    <section className="space-y-3">
      <div className="gc-hero-card overflow-hidden rounded-[28px] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-300/10 text-indigo-200"><MomentumIcon className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">OVRLD Intelligence</p>
            <h3 className="mt-1 text-xl font-black tracking-[-0.035em]">{momentum.title}</h3>
            <p className="mt-1 text-sm leading-6 text-neutral-400">{momentum.detail}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="gc-stat min-w-0"><strong className="text-xl text-emerald-200">{data.improvingCount}</strong><span className="mt-1 block text-[10px] font-bold text-neutral-500">بيتحسن</span></div>
          <div className="gc-stat min-w-0"><strong className="text-xl text-amber-200">{data.plateauCount}</strong><span className="mt-1 block text-[10px] font-bold text-neutral-500">واقف شوية</span></div>
          <div className="gc-stat min-w-0"><strong className="text-xl text-rose-200">{data.slippingCount}</strong><span className="mt-1 block text-[10px] font-bold text-neutral-500">محتاج عين</span></div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_.95fr]">
        <section className="gc-card p-4 sm:p-5">
          <div><p className="gc-eyebrow">إيه اللي يستاهل تركيزك</p><h3 className="mt-1 text-lg font-bold">إشارات، مش أحكام</h3></div>
          <div className="mt-4 space-y-2">
            {data.insights.map((insight) => (
              <div key={insight.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                <div className={`flex items-start gap-3 ${insight.tone === "positive" ? "text-emerald-200" : insight.tone === "watch" ? "text-amber-200" : "text-indigo-200"}`}>
                  <span className="mt-0.5"><InsightIcon tone={insight.tone} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{insight.exerciseName ? `${translateExerciseName(insight.exerciseName)} ${insight.title}` : insight.title}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">{insight.detail}</p>
                    {insight.exerciseId ? <Link href={`/progress/exercises/${insight.exerciseId}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-300">شوف التفاصيل <ArrowUpLeft className="h-3.5 w-3.5" /></Link> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="gc-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="gc-eyebrow">تمرين بتمرين</p><h3 className="mt-1 text-lg font-bold">آخر اتجاهات القوة</h3></div><Link href="/progress/exercises" className="text-xs font-bold text-indigo-300">الكل</Link></div>
          {visibleExercises.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-neutral-500">محتاج تمرينتين أو أكتر لنفس الحركة عشان نقارن بشكل محترم.</p>
          ) : (
            <div className="mt-3 divide-y divide-white/[0.06]">
              {visibleExercises.map((item) => {
                const status = STATUS_META[item.status];
                return (
                  <Link key={item.exerciseId} href={`/progress/exercises/${item.exerciseId}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{translateExerciseName(item.exerciseName)}</p><p className="mt-0.5 text-[11px] text-neutral-600">{muscleLabelAr(item.primaryMuscle)} · {item.sessionCount} مرات</p></div>
                    {item.strengthDeltaPercent !== null ? <strong className={`text-xs ${item.strengthDeltaPercent > 0 ? "text-emerald-200" : item.strengthDeltaPercent < 0 ? "text-rose-200" : "text-neutral-400"}`}>{item.strengthDeltaPercent > 0 ? "+" : ""}{item.strengthDeltaPercent.toFixed(1)}%</strong> : null}
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${status.className}`}>{status.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
