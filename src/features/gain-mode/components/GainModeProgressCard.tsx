"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, BellRing, Scale, Sparkles, TrendingUp } from "lucide-react";
import type { UUID } from "@/types";
import { fetchGainModeSnapshot } from "../services/gain-mode.service";
import type { GainModeSnapshot } from "../types";

function kg(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} كجم`;
}

export function GainModeProgressCard({ userId }: { userId: UUID }) {
  const [snapshot, setSnapshot] = useState<GainModeSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetchGainModeSnapshot(userId).then((next) => { if (active) setSnapshot(next); }).catch(() => { if (active) setSnapshot(null); });
    return () => { active = false; };
  }, [userId]);

  if (snapshot === undefined) return <div className="h-40 animate-pulse rounded-[24px] bg-white/[0.035]" />;
  if (!snapshot) {
    return (
      <Link href="/progress/gain" className="gc-card-interactive flex items-center gap-3 p-4 sm:p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300"><Sparkles className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><span className="gc-eyebrow text-emerald-300">GOAL MODE · NEW</span><strong className="mt-1 block text-lg">Gain Mode · زيادة الوزن للبنات</strong><span className="mt-1 block text-xs leading-5 text-neutral-500">فعّليه لو هدف زيادة الوزن جزء من رحلتك. باقي OVRLD يفضل زي ما هو.</span></span>
        <ArrowUpLeft className="h-5 w-5 text-neutral-500" />
      </Link>
    );
  }

  const latest = snapshot.body.latest;
  const start = snapshot.body.start;
  const target = snapshot.body.goal?.targetWeightKg ?? null;
  const delta = latest && start ? latest.weightKg - start.weightKg : null;
  const due = snapshot.review.tone === "collect" && snapshot.review.href === "/progress/body";

  return (
    <section className="gc-card overflow-hidden border-emerald-300/15 p-0">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300"><TrendingUp className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><p className="gc-eyebrow text-emerald-300">رحلة زيادة الوزن</p><h3 className="mt-1 text-xl font-black">{kg(start?.weightKg)} → {kg(latest?.weightKg)}{target ? ` → ${kg(target)}` : ""}</h3><p className="mt-1 text-sm text-neutral-500">{delta == null ? "سجّلي قراءات كفاية عشان نبدأ نشوف الاتجاه." : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} كجم من بداية المتابعة.`}</p><p className="mt-2 text-xs font-semibold text-neutral-400">{snapshot.review.title}</p></div>
        {due ? <span className="gc-chip text-amber-300"><BellRing className="h-3.5 w-3.5" /> قياس مستني</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-white/[0.055] bg-white/[0.055]">
        <Link href="/progress/body" className="flex items-center gap-3 bg-[var(--gc-surface)] p-4 text-sm font-bold"><Scale className="h-4 w-4 text-emerald-300" /><span className="flex-1">الوزن والقياسات</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
        <Link href="/progress/gain" className="flex items-center gap-3 bg-[var(--gc-surface)] p-4 text-sm font-bold"><Sparkles className="h-4 w-4 text-indigo-300" /><span className="flex-1">إعداد Gain Mode</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
      </div>
    </section>
  );
}
