"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, BellRing, Sparkles } from "lucide-react";
import type { UUID } from "@/types";
import { fetchGainModeSnapshot } from "../services/gain-mode.service";
import type { GainModeSnapshot } from "../types";

function kg(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

export function GainModeProgressCard({ userId }: { userId: UUID }) {
  const [snapshot, setSnapshot] = useState<GainModeSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetchGainModeSnapshot(userId).then((next) => { if (active) setSnapshot(next); }).catch(() => { if (active) setSnapshot(null); });
    return () => { active = false; };
  }, [userId]);

  if (snapshot === undefined) return <div className="h-20 animate-pulse rounded-[16px] bg-[var(--surface-elevated)]" />;
  if (!snapshot) {
    return (
      <Link href="/progress/gain" className="gc-quiet-link">
        <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="min-w-0 flex-1"><strong className="block text-sm">Gain Mode</strong><span className="block truncate text-xs text-neutral-500">ميزة زيادة الوزن</span></span>
        <span className="gc-mini-badge">NEW</span><ArrowUpLeft className="h-4 w-4 text-neutral-500" />
      </Link>
    );
  }

  const latest = snapshot.body.latest;
  const start = snapshot.body.start;
  const target = snapshot.body.goal?.targetWeightKg ?? null;
  const due = snapshot.review.tone === "collect" && snapshot.review.href === "/progress/body";

  return (
    <Link href="/progress/gain" className="gc-gain-progress-link">
      <div className="flex items-center gap-2.5">
        <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
        <strong className="min-w-0 flex-1 text-sm">Gain Mode</strong>
        {due ? <BellRing className="h-4 w-4 shrink-0 text-amber-400" /> : null}
        <ArrowUpLeft className="h-4 w-4 text-neutral-500" />
      </div>
      <div className="mt-3 grid grid-cols-3 text-center">
        <span><small>البداية</small><strong>{kg(start?.weightKg)}</strong></span>
        <span className="border-x border-[var(--border)]"><small>الحالي</small><strong>{kg(latest?.weightKg)}</strong></span>
        <span><small>الهدف</small><strong>{kg(target)}</strong></span>
      </div>
    </Link>
  );
}
