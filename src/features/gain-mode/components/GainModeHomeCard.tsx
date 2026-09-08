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

  if (snapshot === undefined) return <div className="h-48 animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.035]" />;
  if (!snapshot) return <SmartProcessLoop userId={userId} />;

  const latest = snapshot.body.latest;
  const start = snapshot.body.start;
  const target = snapshot.body.goal?.targetWeightKg ?? null;
  const weighInDue = snapshot.review.tone === "collect" && snapshot.review.href === "/progress/body";
  const gained = latest && start ? latest.weightKg - start.weightKg : null;

  return (
    <section className="gc-card overflow-hidden border-emerald-300/15 p-0">
      <div className="flex items-start gap-3.5 p-4 sm:p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300"><Sparkles className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="gc-eyebrow text-emerald-300">GAIN MODE</p><span className="gc-chip">زيادة الوزن</span></div>
          <h3 className="mt-1.5 text-xl font-black tracking-[-0.035em]">{snapshot.review.title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-neutral-500">{snapshot.review.detail}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px border-y border-white/[0.055] bg-white/[0.055]">
        <div className="gc-process-stat"><strong>{kg(latest?.weightKg)}</strong><span>دلوقتي</span><small>{gained == null ? "نقطة البداية" : `${gained >= 0 ? "+" : ""}${gained.toFixed(1)} كجم`}</small></div>
        <div className="gc-process-stat"><strong>{target ? kg(target) : "—"}</strong><span>الهدف</span><small>{target ? "قابل للتعديل" : "اختياري"}</small></div>
        <div className="gc-process-stat"><strong>{snapshot.proteinTargetGrams ? `${snapshot.proteinTargetGrams}g` : "—"}</strong><span>بروتين تقريبي</span><small>مرجع يومي بسيط</small></div>
      </div>

      <div className="grid gap-2 p-3.5 min-[390px]:grid-cols-2 sm:p-4">
        <Link href={snapshot.review.href} className="gc-process-action">
          <span className="inline-flex items-center gap-2">{weighInDue ? <BellRing className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}{snapshot.review.cta}</span><ArrowUpLeft className="h-4 w-4" />
        </Link>
        <Link href="/progress/body" className="gc-secondary-button"><Scale className="h-4 w-4" /> اتجاه الوزن <Target className="h-4 w-4" /></Link>
      </div>
    </section>
  );
}
