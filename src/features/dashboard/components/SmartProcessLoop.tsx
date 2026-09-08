"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpLeft,
  CheckCircle2,
  CircleAlert,
  Gauge,
  Scale,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { translateExerciseName } from "@/lib/localization";
import { formatAdherencePercentage } from "@/features/progress/utils/format-adherence";
import type { UUID } from "@/types";
import {
  fetchProcessLoop,
  type ProcessLoopSnapshot,
  type ProcessLoopTone,
} from "../services/process-loop.service";

const TONE_META: Record<ProcessLoopTone, { shell: string; icon: string; iconWrap: string }> = {
  positive: {
    shell: "gc-process-loop-positive",
    icon: "text-emerald-300",
    iconWrap: "bg-emerald-300/10",
  },
  neutral: {
    shell: "gc-process-loop-neutral",
    icon: "text-indigo-200",
    iconWrap: "bg-indigo-300/10",
  },
  watch: {
    shell: "gc-process-loop-watch",
    icon: "text-amber-300",
    iconWrap: "bg-amber-300/10",
  },
  body: {
    shell: "gc-process-loop-body",
    icon: "text-emerald-300",
    iconWrap: "bg-emerald-300/10",
  },
};

function ActionIcon({ tone }: { tone: ProcessLoopTone }) {
  if (tone === "body") return <Scale className="h-5 w-5" />;
  if (tone === "watch") return <CircleAlert className="h-5 w-5" />;
  if (tone === "positive") return <TrendingUp className="h-5 w-5" />;
  return <Sparkles className="h-5 w-5" />;
}

export function SmartProcessLoop({ userId }: { userId: UUID }) {
  const [data, setData] = useState<ProcessLoopSnapshot | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchProcessLoop(userId)
      .then((next) => {
        if (!active) return;
        setData(next);
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (failed) {
    return (
      <Link href="/progress" className="gc-quiet-link">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-300/10 text-indigo-200"><Gauge className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><strong className="block text-sm">راجع تقدمك</strong><span className="block text-xs text-neutral-500">معرفناش نبني ملخص العملية دلوقتي.</span></span>
        <ArrowUpLeft className="h-4 w-4 text-neutral-600" />
      </Link>
    );
  }

  if (!data) {
    return <div className="h-64 animate-pulse rounded-[26px] border border-white/[0.06] bg-white/[0.035]" />;
  }

  const tone = TONE_META[data.action.tone];
  const visibleInsights = data.insights
    .filter((insight) => {
      if (data.action.kind === "body" && insight.id.startsWith("body-")) return false;
      if (data.action.exerciseName && insight.exerciseName === data.action.exerciseName) return false;
      return insight.id !== data.action.id;
    })
    .slice(0, 2);
  const actionTitle = data.action.exerciseName
    ? `${translateExerciseName(data.action.exerciseName)} ${data.action.title}`
    : data.action.title;

  return (
    <section className="space-y-3">
      <div className={`gc-process-loop overflow-hidden ${tone.shell}`}>
        <div className="flex items-start gap-3.5 p-4 sm:p-5">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone.iconWrap} ${tone.icon}`}>
            <ActionIcon tone={data.action.tone} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="gc-eyebrow">{data.action.eyebrow}</p>
              <span className="gc-process-live-dot"><span /> Live</span>
            </div>
            <h3 className="mt-1.5 text-xl font-black tracking-[-0.035em] sm:text-2xl">{actionTitle}</h3>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-neutral-500">{data.action.detail}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px border-y border-white/[0.055] bg-white/[0.055]">
          <div className="gc-process-stat">
            <strong>{data.weeklyScheduled > 0 ? `${data.weeklyCompleted}/${data.weeklyScheduled}` : "—"}</strong>
            <span>الأسبوع</span>
            <small>{formatAdherencePercentage(data.weeklyAdherence)}</small>
          </div>
          <div className="gc-process-stat">
            <strong className="text-emerald-300">{data.improvingCount}</strong>
            <span>بيتحسن</span>
            <small>{data.trackedExercises} متابع</small>
          </div>
          <div className="gc-process-stat">
            <strong className={data.attentionCount > 0 ? "text-amber-300" : "text-neutral-300"}>{data.attentionCount}</strong>
            <span>محتاج عين</span>
            <small>{data.bodyCheckInDue ? "وفي قياس مستني" : data.bodyTrackingEnabled ? "الجسم متابع" : "الجسم اختياري"}</small>
          </div>
        </div>

        <div className="p-3.5 sm:p-4">
          <Link href={data.action.href} className="gc-process-action">
            <span>{data.action.cta}</span>
            <ArrowUpLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {visibleInsights.length > 0 ? (
        <div className="gc-process-signals">
          {visibleInsights.map((insight) => {
            const href = insight.exerciseId ? `/progress/exercises/${insight.exerciseId}` : insight.id.startsWith("body-") ? "/progress/body" : "/progress";
            return (
              <Link key={insight.id} href={href} className="gc-process-signal">
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${insight.tone === "positive" ? "bg-emerald-300/10 text-emerald-300" : insight.tone === "watch" ? "bg-amber-300/10 text-amber-300" : "bg-indigo-300/10 text-indigo-200"}`}>
                  {insight.tone === "positive" ? <CheckCircle2 className="h-4 w-4" /> : insight.tone === "watch" ? <CircleAlert className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{insight.exerciseName ? `${translateExerciseName(insight.exerciseName)} · ${insight.title}` : insight.title}</strong>
                  <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-neutral-500">{insight.detail}</span>
                </span>
                <ArrowUpLeft className="h-4 w-4 shrink-0 text-neutral-600" />
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
