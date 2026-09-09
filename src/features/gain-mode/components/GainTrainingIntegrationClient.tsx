"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, BarChart3, CheckCircle2, Dumbbell, Gauge, Target, TrendingUp } from "lucide-react";
import type { UUID } from "@/types";
import { fetchGainModeSnapshot } from "../services/gain-mode.service";
import type { GainModeSnapshot } from "../types";
import { GainModeActivationClient } from "./GainModeActivationClient";

function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

export function GainTrainingIntegrationClient({ userId }: { userId: UUID }) {
  const [snapshot, setSnapshot] = useState<GainModeSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetchGainModeSnapshot(userId)
      .then((next) => { if (active) setSnapshot(next); })
      .catch(() => { if (active) setSnapshot(null); });
    return () => { active = false; };
  }, [userId]);

  if (snapshot === undefined) return <div className="mt-4 h-64 animate-pulse rounded-[20px] bg-[var(--surface-elevated)]" />;
  if (!snapshot) return <GainModeActivationClient userId={userId} />;

  const training = snapshot.training;
  const compatibility = training.compatibility;
  const maxLoad = Math.max(1, ...compatibility.priorityLoads.map((item) => item.sets), ...compatibility.maintenanceLoads.map((item) => item.sets));

  return (
    <div className="space-y-3 pb-24 pt-3">
      <section className={`gc-gain-plan-score gc-gain-plan-${compatibility.state}`}>
        <div className="flex items-start gap-3">
          <span className="gc-gain-plan-score-ring">{compatibility.score === null ? "—" : compatibility.score}</span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">توافق الجدول · {compatibility.focusLabel}</p>
            <h2 className="mt-1 text-lg font-black">{compatibility.title}</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">{compatibility.detail}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-[10px] font-bold text-neutral-500">
          <span>مؤشر داخلي لتوزيع الخطة، مش درجة طبية أو ضمان للنتيجة.</span>
          <Link href="/split/personal" className="gc-compact-link shrink-0">عدّل الجدول<ArrowUpLeft className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      <section className="gc-list-panel overflow-hidden">
        <div className="grid grid-cols-4 divide-x divide-x-reverse divide-[var(--border)]">
          <div className="gc-plan-stat"><Dumbbell className="h-4 w-4" /><span>الأيام</span><strong>{training.trainingDays}</strong></div>
          <div className="gc-plan-stat"><Gauge className="h-4 w-4" /><span>السِتات</span><strong>{training.plannedSets}</strong></div>
          <div className="gc-plan-stat"><CheckCircle2 className="h-4 w-4" /><span>الأسبوع</span><strong>{training.workoutsCompleted}/{training.workoutsScheduled || training.trainingDays}</strong></div>
          <div className="gc-plan-stat"><Target className="h-4 w-4" /><span>الالتزام</span><strong>{percent(training.adherence)}</strong></div>
        </div>
      </section>

      {compatibility.priorityLoads.length ? (
        <section className="gc-card p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="gc-eyebrow">أولوية الخطة</p><h3 className="mt-1 text-base font-black">الحمل الأسبوعي</h3></div>{compatibility.lowerBodyShare !== null ? <span className="gc-mini-badge">Lower {compatibility.lowerBodyShare}%</span> : null}</div>
          <div className="mt-4 space-y-3">
            {compatibility.priorityLoads.map((item) => (
              <div key={item.muscle} className="gc-plan-load-row">
                <div className="flex items-center justify-between gap-3 text-xs"><strong>{item.muscle}</strong><span className="tabular-nums text-neutral-500">{item.sets} set · {item.exposureDays} يوم</span></div>
                <div className="gc-progress-track mt-1.5"><span style={{ width: `${Math.min(100, (item.sets / maxLoad) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {compatibility.maintenanceLoads.length ? (
        <section className="gc-card p-4">
          <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-neutral-500" /><h3 className="text-sm font-black">الحفاظ على التوازن</h3></div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {compatibility.maintenanceLoads.map((item) => <div key={item.muscle} className="gc-mini-plan-load"><span>{item.muscle}</span><strong>{item.sets}</strong><small>{item.exposureDays} يوم</small></div>)}
          </div>
        </section>
      ) : null}

      {compatibility.insights.length ? (
        <section className="gc-list-panel overflow-hidden">
          <div className="gc-list-row"><TrendingUp className="h-4 w-4 text-indigo-400" /><strong className="min-w-0 flex-1 text-sm">ملاحظات التوزيع</strong></div>
          {compatibility.insights.map((insight, index) => <div key={`${insight}-${index}`} className="gc-list-row border-t border-[var(--border)]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--surface-overlay)] text-[10px] font-black">{index + 1}</span><span className="min-w-0 flex-1 text-xs leading-5 text-neutral-500">{insight}</span></div>)}
        </section>
      ) : null}

      <section className="gc-card p-4">
        <p className="gc-eyebrow">الأداء الحقيقي</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="gc-mini-plan-load"><span>بيتحسن</span><strong>{training.improvingExercises}</strong><small>تمرين</small></div>
          <div className="gc-mini-plan-load"><span>Plateau</span><strong>{training.plateauExercises}</strong><small>تمرين</small></div>
          <div className="gc-mini-plan-load"><span>نازل</span><strong>{training.slippingExercises}</strong><small>تمرين</small></div>
        </div>
        <Link href="/progress" className="gc-secondary-button mt-3 w-full">شوف تقدم التمرين<ArrowUpLeft className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}
