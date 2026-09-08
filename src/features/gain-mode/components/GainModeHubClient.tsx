"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, ChevronDown, Dumbbell, Scale, Settings2, Sparkles, Target, Utensils } from "lucide-react";
import type { UUID } from "@/types";
import { fetchGainModeSnapshot } from "../services/gain-mode.service";
import type { GainModeSnapshot } from "../types";
import { GainModeActivationClient } from "./GainModeActivationClient";

function kg(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} كجم`;
}

function appetiteLabel(value: GainModeSnapshot["profile"]["appetiteLevel"]) {
  if (value === "low") return "ضعيفة";
  if (value === "good") return "كويسة";
  return "عادية";
}

export function GainModeHubClient({ userId }: { userId: UUID }) {
  const [snapshot, setSnapshot] = useState<GainModeSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetchGainModeSnapshot(userId).then((next) => { if (active) setSnapshot(next); }).catch(() => { if (active) setSnapshot(null); });
    return () => { active = false; };
  }, [userId]);

  if (snapshot === undefined) return <div className="mt-4 h-48 animate-pulse rounded-[22px] border border-white/[0.06] bg-white/[0.025]" />;
  if (!snapshot) return <GainModeActivationClient userId={userId} />;

  const latest = snapshot.body.latest;
  const start = snapshot.body.start;
  const target = snapshot.body.goal?.targetWeightKg ?? null;
  const delta = latest && start ? latest.weightKg - start.weightKg : null;

  return (
    <div className="space-y-4 pb-24 pt-4">
      <section className="gc-gain-summary">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300"><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1"><span className="gc-mini-badge">GAIN MODE</span><h2 className="mt-1 text-xl font-black">زيادة الوزن</h2></div>
          <Link href="/progress/body" className="gc-compact-link">الوزن</Link>
        </div>
        <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-white/[0.06]">
          <div className="gc-number-cell"><span>البداية</span><strong>{kg(start?.weightKg)}</strong></div>
          <div className="gc-number-cell border-x border-white/[0.055]"><span>دلوقتي</span><strong>{kg(latest?.weightKg)}</strong><small>{delta == null ? "" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} كجم`}</small></div>
          <div className="gc-number-cell"><span>الهدف</span><strong>{kg(target)}</strong></div>
        </div>
      </section>

      <Link href={snapshot.review.href} className="gc-priority-row">
        <Target className="h-4 w-4 shrink-0 text-indigo-300" />
        <span className="min-w-0 flex-1"><span className="text-[10px] font-black uppercase tracking-[0.1em] text-neutral-500">الخطوة الجاية</span><strong className="block truncate text-sm">{snapshot.review.title}</strong></span>
        <span className="text-xs font-black text-indigo-300">{snapshot.review.cta}</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" />
      </Link>

      <section className="gc-list-panel">
        <div className="gc-list-row">
          <Utensils className="h-4 w-4 text-amber-300" />
          <span className="min-w-0 flex-1"><strong className="block">الأكل</strong><span className="block truncate text-xs text-neutral-500">{snapshot.primaryNutritionAction}</span></span>
        </div>
        <div className="grid grid-cols-2 border-t border-white/[0.055]">
          <div className="gc-number-cell"><span>البروتين</span><strong>{snapshot.proteinTargetGrams ? `${snapshot.proteinTargetGrams}g` : "—"}</strong></div>
          <div className="gc-number-cell border-s border-white/[0.055]"><span>الشهية</span><strong>{appetiteLabel(snapshot.profile.appetiteLevel)}</strong></div>
        </div>
      </section>

      <section className="gc-list-panel">
        <Link href="/workout/today" className="gc-list-row"><Dumbbell className="h-4 w-4 text-sky-300" /><span className="min-w-0 flex-1 font-bold">تمرين النهارده</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
        <Link href="/progress/body" className="gc-list-row"><Scale className="h-4 w-4 text-emerald-300" /><span className="min-w-0 flex-1 font-bold">اتجاه الوزن</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
      </section>

      <details className="gc-list-panel group">
        <summary className="gc-list-row list-none [&::-webkit-details-marker]:hidden"><Settings2 className="h-4 w-4 text-neutral-500" /><span className="min-w-0 flex-1 font-bold">إعدادات Gain Mode</span><ChevronDown className="h-4 w-4 text-neutral-600 transition-transform group-open:rotate-180" /></summary>
        <div className="border-t border-white/[0.055] p-3"><GainModeActivationClient userId={userId} compact /></div>
      </details>
    </div>
  );
}
