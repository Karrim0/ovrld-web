"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, BellRing, Sparkles, TrendingUp } from "lucide-react";
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

  if (snapshot === undefined) return <div className="h-16 animate-pulse rounded-[18px] bg-white/[0.025]" />;
  if (!snapshot) {
    return (
      <Link href="/progress/gain" className="gc-quiet-link">
        <Sparkles className="h-4 w-4 shrink-0 text-emerald-300" />
        <span className="min-w-0 flex-1"><strong className="block text-sm">Gain Mode</strong><span className="block truncate text-xs text-neutral-500">ميزة زيادة الوزن للبنات</span></span>
        <span className="gc-mini-badge">NEW</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" />
      </Link>
    );
  }

  const latest = snapshot.body.latest;
  const start = snapshot.body.start;
  const target = snapshot.body.goal?.targetWeightKg ?? null;
  const due = snapshot.review.tone === "collect" && snapshot.review.href === "/progress/body";

  return (
    <Link href="/progress/gain" className="gc-quiet-link border-emerald-300/15">
      <TrendingUp className="h-4 w-4 shrink-0 text-emerald-300" />
      <span className="min-w-0 flex-1"><strong className="block text-sm">Gain Mode</strong><span className="block truncate text-xs tabular-nums text-neutral-500">{kg(start?.weightKg)} → {kg(latest?.weightKg)}{target ? ` → ${kg(target)}` : ""}</span></span>
      {due ? <BellRing className="h-4 w-4 shrink-0 text-amber-300" /> : null}<ArrowUpLeft className="h-4 w-4 text-neutral-600" />
    </Link>
  );
}
