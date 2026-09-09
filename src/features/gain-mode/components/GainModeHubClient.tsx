"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpLeft,
  CalendarDays,
  ChevronDown,
  Dumbbell,
  Flame,
  History,
  Ruler,

  Settings2,
  Sparkles,
  Utensils,
} from "lucide-react";
import type { UUID } from "@/types";
import { fetchGainModeSnapshot, getDailyNutritionStatus } from "../services/gain-mode.service";
import type { GainModeSnapshot } from "../types";
import { GainModeActivationClient } from "./GainModeActivationClient";
import { GainReviewPreview } from "./GainReviewPreview";

function kg(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} كجم`;
}

function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function deltaText(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "لسه بنبني الاتجاه";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} كجم/أسبوع`;
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

  const body = snapshot?.body;
  const latest = body?.latest ?? null;
  const start = body?.start ?? null;
  const target = body?.goal?.targetWeightKg ?? null;
  const totalDelta = latest && start ? latest.weightKg - start.weightKg : null;
  const nutritionStatus = useMemo(() => snapshot ? getDailyNutritionStatus(snapshot) : "", [snapshot]);

  if (snapshot === undefined) return <div className="mt-4 h-48 animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--surface-elevated)]" />;
  if (!snapshot) return <GainModeActivationClient userId={userId} />;

  const quickLinks = [
    {
      href: "/progress/gain/nutrition",
      icon: Utensils,
      title: "التغذية",
      value: `${snapshot.todayNutrition.caloriesKcal.toLocaleString("en-US")} / ${snapshot.todayNutrition.calorieTargetKcal?.toLocaleString("en-US") ?? "—"} kcal`,
      note: nutritionStatus,
      tone: "amber",
    },
    {
      href: "/progress/body",
      icon: Ruler,
      title: "الجسم",
      value: kg(latest?.weightKg),
      note: body?.latestCircumference ? "الوزن والقياسات في مكان واحد" : "سجّل أول قياسات جسم",
      tone: "emerald",
    },
    {
      href: "/progress/gain/training",
      icon: Dumbbell,
      title: "التمرين",
      value: snapshot.training.compatibility.score === null ? "اربط الجدول" : `${snapshot.training.compatibility.score}% توافق`,
      note: `${snapshot.training.workoutsCompleted}/${snapshot.training.workoutsScheduled || snapshot.training.trainingDays} تمرينات · ${percent(snapshot.training.adherence)}`,
      tone: "indigo",
    },
    {
      href: "/progress/gain/history",
      icon: History,
      title: "السجل",
      value: "كل التواريخ",
      note: "وزن · أكل · قياسات · تمرين",
      tone: "slate",
    },
  ] as const;

  return (
    <div className="space-y-3 pb-24 pt-3">
      <section className="gc-gain-dashboard gc-gain-dashboard-compact">
        <div className="flex items-center gap-3">
          <span className="gc-gain-mode-icon"><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><h2 className="text-lg font-black">Gain Mode</h2><span className="gc-mini-badge">زيادة الوزن</span></div>
            <p className="mt-0.5 text-xs font-semibold text-neutral-500">اليوم قدامك · التفاصيل جوه كل قسم</p>
          </div>
          <Link href="/progress/gain/review" className="gc-compact-link"><CalendarDays className="h-3.5 w-3.5" /> مراجعة</Link>
        </div>

        <div className="gc-gain-weight-grid mt-4">
          <div><span>البداية</span><strong>{kg(start?.weightKg)}</strong></div>
          <div className="gc-gain-current"><span>الحالي</span><strong>{kg(latest?.weightKg)}</strong><small>{totalDelta === null ? "—" : `${totalDelta >= 0 ? "+" : ""}${totalDelta.toFixed(1)} كجم`}</small></div>
          <div><span>الهدف</span><strong>{kg(target)}</strong></div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-xs">
          <span className="font-bold text-neutral-500">اتجاه الوزن</span>
          <strong className="tabular-nums">{deltaText(snapshot.review.weeklyWeightChangeKg)}</strong>
        </div>
      </section>

      <section className="gc-gain-today-strip">
        <div className="gc-gain-today-metric"><Flame className="h-4 w-4 text-amber-400" /><span>السعرات</span><strong>{snapshot.todayNutrition.caloriesKcal.toLocaleString("en-US")}</strong><small>/ {snapshot.todayNutrition.calorieTargetKcal?.toLocaleString("en-US") ?? "—"}</small></div>
        <div className="gc-gain-today-metric"><Utensils className="h-4 w-4 text-emerald-400" /><span>البروتين</span><strong>{Math.round(snapshot.todayNutrition.proteinGrams)}g</strong><small>/ {snapshot.todayNutrition.proteinTargetGrams ? `${Math.round(snapshot.todayNutrition.proteinTargetGrams)}g` : "—"}</small></div>
        <div className="gc-gain-today-metric"><Dumbbell className="h-4 w-4 text-indigo-400" /><span>التمرين</span><strong>{snapshot.training.workoutsCompleted}/{snapshot.training.workoutsScheduled || snapshot.training.trainingDays}</strong><small>{percent(snapshot.training.adherence)}</small></div>
      </section>

      <section className="gc-gain-section-grid" aria-label="أقسام Gain Mode">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`gc-gain-section-link gc-gain-section-${item.tone}`}>
              <span className="gc-gain-section-icon"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><strong>{item.title}</strong><small>{item.note}</small></span>
              <span className="text-end"><b>{item.value}</b><ArrowUpLeft className="ms-auto mt-1 h-3.5 w-3.5 text-neutral-500" /></span>
            </Link>
          );
        })}
      </section>

      {snapshot.profile.supportNote ? (
        <section className="gc-card border-rose-300/15 bg-rose-300/[0.04] p-4">
          <p className="gc-eyebrow">رسالة خاصة{snapshot.profile.supportName ? ` · من ${snapshot.profile.supportName}` : ""}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-neutral-200">{snapshot.profile.supportNote}</p>
        </section>
      ) : null}

      {snapshot.training.improvingExercises > 0 ? (
        <section className="gc-list-panel overflow-hidden">
          <div className="gc-list-row"><Sparkles className="h-4 w-4 text-emerald-400" /><span className="min-w-0 flex-1 text-sm font-bold">أيوه كده — {snapshot.training.improvingExercises} تمرين بيتحسن. ثبّت النوم والأكل وسيب الأرقام تكمل شغلها.</span></div>
        </section>
      ) : null}

      <GainReviewPreview userId={userId} />

      <details className="gc-list-panel group">
        <summary className="gc-list-row list-none [&::-webkit-details-marker]:hidden"><Settings2 className="h-4 w-4 text-neutral-500" /><span className="min-w-0 flex-1 font-bold">إعدادات Gain Mode</span><ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" /></summary>
        <div className="border-t border-[var(--border)] p-3"><GainModeActivationClient userId={userId} compact /></div>
      </details>
    </div>
  );
}
