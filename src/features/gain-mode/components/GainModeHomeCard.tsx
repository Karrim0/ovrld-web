"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, BellRing, Flame, Scale, Sparkles, Utensils } from "lucide-react";
import type { UUID } from "@/types";
import { SmartProcessLoop } from "@/features/dashboard/components/SmartProcessLoop";
import { fetchGainModeSnapshot, getDailyNutritionStatus } from "../services/gain-mode.service";
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

  if (snapshot === undefined) return <div className="h-32 animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--surface-elevated)]" />;
  if (!snapshot) return <SmartProcessLoop userId={userId} />;

  const day = snapshot.todayNutrition;
  const latest = snapshot.body.latest;
  const weighInDue = snapshot.review.tone === "collect" && snapshot.review.href === "/progress/body";

  return (
    <section className="gc-daily-panel overflow-hidden border-emerald-400/20">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-500"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><strong className="text-sm">Gain Mode</strong><span className="gc-mini-badge">زيادة الوزن</span></div>
          <p className="mt-0.5 truncate text-xs font-semibold text-neutral-500">{snapshot.nutritionAvailable ? getDailyNutritionStatus(snapshot) : "حدّث قاعدة البيانات لتفعيل تسجيل الأكل"}</p>
        </div>
        {weighInDue ? <BellRing className="h-4 w-4 shrink-0 text-amber-400" /> : null}
      </div>

      <div className="grid grid-cols-3 border-y border-[var(--border)]">
        <div className="gc-number-cell"><span><Flame className="me-1 inline h-3 w-3" />السعرات</span><strong>{day.caloriesKcal.toLocaleString("en-US")}</strong><small>/ {day.calorieTargetKcal?.toLocaleString("en-US") ?? "—"} kcal</small></div>
        <div className="gc-number-cell border-x border-[var(--border)]"><span><Utensils className="me-1 inline h-3 w-3" />البروتين</span><strong>{Math.round(day.proteinGrams)}g</strong><small>/ {day.proteinTargetGrams ? `${Math.round(day.proteinTargetGrams)}g` : "—"}</small></div>
        <div className="gc-number-cell"><span><Scale className="me-1 inline h-3 w-3" />الوزن</span><strong>{kg(latest?.weightKg)}</strong><small>{snapshot.review.weeklyWeightChangeKg === null ? "الاتجاه بيتبني" : `${snapshot.review.weeklyWeightChangeKg >= 0 ? "+" : ""}${snapshot.review.weeklyWeightChangeKg.toFixed(2)}/أسبوع`}</small></div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2 p-3">
        <Link href="/progress/gain/nutrition" className="gc-compact-action"><span>سجّل أكلك</span><ArrowUpLeft className="h-4 w-4" /></Link>
        <Link href="/progress/gain" className="gc-compact-action gc-compact-action-muted px-3" aria-label="افتح Gain Mode"><Sparkles className="h-4 w-4" /></Link>
      </div>
    </section>
  );
}
