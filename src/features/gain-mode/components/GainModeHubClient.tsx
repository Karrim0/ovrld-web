"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, ChevronDown, Dumbbell, Scale, Settings2, Sparkles, Target, TrendingUp } from "lucide-react";
import type { UUID } from "@/types";
import { fetchGainModeSnapshot } from "../services/gain-mode.service";
import type { GainModeSnapshot } from "../types";
import { GainModeActivationClient } from "./GainModeActivationClient";
import { GainNutritionPanel } from "./GainNutritionPanel";

function kg(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} كجم`;
}

function deltaText(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "لسه محتاجين قياسات";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} كجم / أسبوع`;
}

export function GainModeHubClient({ userId }: { userId: UUID }) {
  const [snapshot, setSnapshot] = useState<GainModeSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetchGainModeSnapshot(userId)
      .then((next) => { if (active) setSnapshot(next); })
      .catch(() => { if (active) setSnapshot(null); });
    return () => { active = false; };
  }, [userId]);

  if (snapshot === undefined) return <div className="mt-4 h-48 animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--surface-elevated)]" />;
  if (!snapshot) return <GainModeActivationClient userId={userId} />;

  const latest = snapshot.body.latest;
  const start = snapshot.body.start;
  const target = snapshot.body.goal?.targetWeightKg ?? null;
  const delta = latest && start ? latest.weightKg - start.weightKg : null;

  return (
    <div className="space-y-3 pb-24 pt-3">
      <section className="gc-gain-dashboard">
        <div className="flex items-center gap-3">
          <span className="gc-gain-mode-icon"><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><h2 className="text-lg font-black">Gain Mode</h2><span className="gc-mini-badge">زيادة الوزن</span></div>
            <p className="mt-0.5 text-xs font-semibold text-neutral-500">أكلك · وزنك · تمرينك</p>
          </div>
          <Link href="/progress/body" className="gc-compact-link"><Scale className="h-3.5 w-3.5" /> الوزن</Link>
        </div>

        <div className="gc-gain-weight-grid mt-4">
          <div><span>البداية</span><strong>{kg(start?.weightKg)}</strong></div>
          <div className="gc-gain-current"><span>الحالي</span><strong>{kg(latest?.weightKg)}</strong><small>{delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} كجم`}</small></div>
          <div><span>الهدف</span><strong>{kg(target)}</strong></div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-neutral-500"><TrendingUp className="h-3.5 w-3.5" /> اتجاه آخر أسابيع</span>
          <strong className="tabular-nums">{deltaText(snapshot.review.weeklyWeightChangeKg)}</strong>
        </div>
      </section>

      <GainNutritionPanel userId={userId} snapshot={snapshot} />

      <section className="gc-gain-review">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500"><Target className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">المراجعة الحالية</p>
            <h3 className="mt-0.5 text-sm font-black">{snapshot.review.title}</h3>
            <p className="mt-1 text-xs leading-5 text-neutral-500">{snapshot.review.detail}</p>
          </div>
        </div>
        <Link href={snapshot.review.href} className="gc-review-action mt-3">{snapshot.review.cta}<ArrowUpLeft className="h-4 w-4" /></Link>
      </section>

      <section className="gc-list-panel">
        <Link href="/workout/today" className="gc-list-row"><Dumbbell className="h-4 w-4 text-indigo-400" /><span className="min-w-0 flex-1 font-bold">تمرين النهارده</span><ArrowUpLeft className="h-4 w-4 text-neutral-500" /></Link>
        <Link href="/progress/body" className="gc-list-row"><Scale className="h-4 w-4 text-emerald-400" /><span className="min-w-0 flex-1 font-bold">الوزن والقياسات</span><ArrowUpLeft className="h-4 w-4 text-neutral-500" /></Link>
      </section>

      <details className="gc-list-panel group">
        <summary className="gc-list-row list-none [&::-webkit-details-marker]:hidden"><Settings2 className="h-4 w-4 text-neutral-500" /><span className="min-w-0 flex-1 font-bold">إعدادات Gain Mode</span><ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" /></summary>
        <div className="border-t border-[var(--border)] p-3"><GainModeActivationClient userId={userId} compact /></div>
      </details>
    </div>
  );
}
