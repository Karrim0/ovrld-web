"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, CircleAlert, Gauge, Scale, Sparkles, TrendingUp } from "lucide-react";
import { translateExerciseName } from "@/lib/localization";
import { formatAdherencePercentage } from "@/features/progress/utils/format-adherence";
import type { UUID } from "@/types";
import { fetchProcessLoop, type ProcessLoopSnapshot, type ProcessLoopTone } from "../services/process-loop.service";

function ActionIcon({ tone }: { tone: ProcessLoopTone }) {
  if (tone === "body") return <Scale className="h-4 w-4" />;
  if (tone === "watch") return <CircleAlert className="h-4 w-4" />;
  if (tone === "positive") return <TrendingUp className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
}

export function SmartProcessLoop({ userId }: { userId: UUID }) {
  const [data, setData] = useState<ProcessLoopSnapshot | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchProcessLoop(userId)
      .then((next) => { if (active) { setData(next); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [userId]);

  if (failed) {
    return <Link href="/progress" className="gc-quiet-link"><Gauge className="h-4 w-4 text-emerald-300" /><span className="min-w-0 flex-1 truncate text-sm font-bold">راجع تقدمك</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>;
  }
  if (!data) return <div className="h-32 animate-pulse rounded-[20px] border border-white/[0.06] bg-white/[0.025]" />;

  const actionTitle = data.action.exerciseName ? `${translateExerciseName(data.action.exerciseName)} · ${data.action.title}` : data.action.title;
  const toneClass = data.action.tone === "watch" ? "text-amber-300" : data.action.tone === "positive" || data.action.tone === "body" ? "text-emerald-300" : "text-emerald-300";

  return (
    <section className="gc-daily-panel overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] ${toneClass}`}><ActionIcon tone={data.action.tone} /></span>
        <div className="min-w-0 flex-1"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">الخطوة الجاية</span><p className="mt-0.5 truncate text-sm font-black">{actionTitle}</p></div>
        <Link href={data.action.href} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.07]" aria-label={data.action.cta}><ArrowUpLeft className="h-4 w-4" /></Link>
      </div>
      <div className="grid grid-cols-3 border-t border-white/[0.055]">
        <div className="gc-number-cell"><span>الأسبوع</span><strong>{data.weeklyScheduled > 0 ? `${data.weeklyCompleted}/${data.weeklyScheduled}` : "—"}</strong><small>{formatAdherencePercentage(data.weeklyAdherence)}</small></div>
        <div className="gc-number-cell border-x border-white/[0.055]"><span>بيتحسن</span><strong>{data.improvingCount}</strong><small>{data.trackedExercises} متابع</small></div>
        <div className="gc-number-cell"><span>محتاج عين</span><strong>{data.attentionCount}</strong><small>{data.bodyCheckInDue ? "قياس مستني" : ""}</small></div>
      </div>
    </section>
  );
}
