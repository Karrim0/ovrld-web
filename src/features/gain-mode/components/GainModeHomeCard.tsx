"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, BellRing, Scale, Sparkles, Target, Utensils } from "lucide-react";
import type { UUID } from "@/types";
import { SmartProcessLoop } from "@/features/dashboard/components/SmartProcessLoop";
import { fetchGainModeSnapshot } from "../services/gain-mode.service";
import type { GainModeSnapshot } from "../types";

function kg(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} كجم`;
}

export function GainModeHomeCard({ userId }: { userId: UUID }) {
  const [snapshot, setSnapshot] = useState<GainModeSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetchGainModeSnapshot(userId)
      .then((next) => { if (active) setSnapshot(next); })
      .catch(() => { if (active) setSnapshot(null); });
    return () => { active = false; };
  }, [userId]);

  if (snapshot === undefined) return <div className="h-36 animate-pulse rounded-[20px] border border-white/[0.06] bg-white/[0.025]" />;
  if (!snapshot) return <SmartProcessLoop userId={userId} />;

  const latest = snapshot.body.latest;
  const target = snapshot.body.goal?.targetWeightKg ?? null;
  const weighInDue = snapshot.review.tone === "collect" && snapshot.review.href === "/progress/body";

  return (
    <section className="gc-daily-panel overflow-hidden border-emerald-300/15">
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><strong className="text-sm">Gain Mode</strong><span className="gc-mini-badge">زيادة الوزن</span></div>
          <p className="mt-0.5 truncate text-xs font-semibold text-neutral-500">{snapshot.review.title}</p>
        </div>
        {weighInDue ? <BellRing className="h-4 w-4 shrink-0 text-amber-300" /> : null}
      </div>

      <div className="grid grid-cols-3 border-y border-white/[0.055]">
        <div className="gc-number-cell"><span>الوزن</span><strong>{kg(latest?.weightKg)}</strong></div>
        <div className="gc-number-cell border-x border-white/[0.055]"><span>الهدف</span><strong>{kg(target)}</strong></div>
        <div className="gc-number-cell"><span>البروتين</span><strong>{snapshot.proteinTargetGrams ? `${snapshot.proteinTargetGrams}g` : "—"}</strong></div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        <Link href={snapshot.review.href} className="gc-compact-action">
          <span className="inline-flex items-center gap-1.5">{weighInDue ? <Scale className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}{snapshot.review.cta}</span>
          <ArrowUpLeft className="h-4 w-4" />
        </Link>
        <Link href="/progress/gain" className="gc-compact-action gc-compact-action-muted"><Target className="h-4 w-4" /><span>التفاصيل</span><ArrowUpLeft className="h-4 w-4" /></Link>
      </div>
    </section>
  );
}
