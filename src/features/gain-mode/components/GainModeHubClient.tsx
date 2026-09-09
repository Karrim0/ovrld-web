"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Flame,
  History,
  MoreHorizontal,
  Ruler,
  Settings2,
  Sparkles,
  Target,
  Utensils,
  X,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { UUID } from "@/types";
import { fetchGainModeSnapshot, getDailyNutritionStatus } from "../services/gain-mode.service";
import type { GainModeSnapshot } from "../types";
import { GainModeActivationClient } from "./GainModeActivationClient";
import { GainReviewPreview } from "./GainReviewPreview";

function kg(value: number | null | undefined, language: "ar" | "en") {
  if (value == null) return "—";
  const number = Number.isInteger(value) ? value : value.toFixed(1);
  return language === "ar" ? `${number} كجم` : `${number} kg`;
}

function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function deltaText(value: number | null, language: "ar" | "en") {
  if (value === null || !Number.isFinite(value)) return language === "ar" ? "لسه بنبني الاتجاه" : "Building your trend";
  const sign = value > 0 ? "+" : "";
  return language === "ar" ? `${sign}${value.toFixed(2)} كجم/أسبوع` : `${sign}${value.toFixed(2)} kg/week`;
}

export function GainModeHubClient({ userId }: { userId: UUID }) {
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const [snapshot, setSnapshot] = useState<GainModeSnapshot | null | undefined>(undefined);
  const [showOptions, setShowOptions] = useState(false);
  const [showGoalEditor, setShowGoalEditor] = useState(false);

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
      title: ar ? "التغذية" : "Nutrition",
      value: `${snapshot.todayNutrition.caloriesKcal.toLocaleString("en-US")} / ${snapshot.todayNutrition.calorieTargetKcal?.toLocaleString("en-US") ?? "—"} kcal`,
      note: t(nutritionStatus),
      tone: "amber",
    },
    {
      href: "/progress/body",
      icon: Ruler,
      title: ar ? "الجسم" : "Body",
      value: kg(latest?.weightKg, language),
      note: body?.latestCircumference
        ? ar ? "الوزن والقياسات في مكان واحد" : "Weight and measurements together"
        : ar ? "سجّل أول قياسات جسم" : "Log your first measurements",
      tone: "emerald",
    },
    {
      href: "/progress/gain/training",
      icon: Dumbbell,
      title: ar ? "التمرين" : "Training",
      value: snapshot.training.compatibility.score === null
        ? ar ? "اربط الجدول" : "Connect plan"
        : ar ? `${snapshot.training.compatibility.score}% توافق` : `${snapshot.training.compatibility.score}% fit`,
      note: `${snapshot.training.workoutsCompleted}/${snapshot.training.workoutsScheduled || snapshot.training.trainingDays} ${ar ? "تمرينات" : "workouts"} · ${percent(snapshot.training.adherence)}`,
      tone: "emerald",
    },
    {
      href: "/progress/gain/history",
      icon: History,
      title: ar ? "السجل" : "History",
      value: ar ? "كل التواريخ" : "All dates",
      note: ar ? "وزن · أكل · قياسات · تمرين" : "Weight · Food · Measurements · Training",
      tone: "slate",
    },
  ] as const;

  return (
    <div className="space-y-3 pb-24 pt-3">
      <section className="gc-gain-dashboard gc-gain-dashboard-v2">
        <div className="flex items-start gap-3">
          <span className="gc-gain-mode-icon"><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black">Gain Mode</h2>
              <span className="gc-gain-active-badge">{ar ? "نشط" : "Active"}</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-neutral-500">
              {ar ? "هدفك، أكلك، تمرينك واتجاه وزنك في مسار واحد." : "Your goal, nutrition, training and weight trend in one loop."}
            </p>
          </div>
          <button type="button" onClick={() => setShowOptions(true)} className="gc-gain-options-button" aria-label={ar ? "خيارات Gain Mode" : "Gain Mode options"}>
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        <div className="gc-gain-weight-grid mt-4">
          <div><span>{ar ? "البداية" : "Start"}</span><strong>{kg(start?.weightKg, language)}</strong></div>
          <div className="gc-gain-current"><span>{ar ? "الحالي" : "Current"}</span><strong>{kg(latest?.weightKg, language)}</strong><small>{totalDelta === null ? "—" : `${totalDelta >= 0 ? "+" : ""}${totalDelta.toFixed(1)} ${ar ? "كجم" : "kg"}`}</small></div>
          <div><span>{ar ? "الهدف" : "Target"}</span><strong>{kg(target, language)}</strong></div>
        </div>

        <div className="gc-gain-trend-row mt-3">
          <span>{ar ? "اتجاه الوزن" : "Weight trend"}</span>
          <strong className="tabular-nums">{deltaText(snapshot.review.weeklyWeightChangeKg, language)}</strong>
        </div>
      </section>

      <section className="gc-gain-today-strip">
        <div className="gc-gain-today-metric"><Flame className="h-4 w-4 text-amber-400" /><span>{ar ? "السعرات" : "Calories"}</span><strong>{snapshot.todayNutrition.caloriesKcal.toLocaleString("en-US")}</strong><small>/ {snapshot.todayNutrition.calorieTargetKcal?.toLocaleString("en-US") ?? "—"}</small></div>
        <div className="gc-gain-today-metric"><Utensils className="h-4 w-4 text-emerald-400" /><span>{ar ? "البروتين" : "Protein"}</span><strong>{Math.round(snapshot.todayNutrition.proteinGrams)}g</strong><small>/ {snapshot.todayNutrition.proteinTargetGrams ? `${Math.round(snapshot.todayNutrition.proteinTargetGrams)}g` : "—"}</small></div>
        <div className="gc-gain-today-metric"><Dumbbell className="h-4 w-4 text-emerald-400" /><span>{ar ? "التمرين" : "Training"}</span><strong>{snapshot.training.workoutsCompleted}/{snapshot.training.workoutsScheduled || snapshot.training.trainingDays}</strong><small>{percent(snapshot.training.adherence)}</small></div>
      </section>

      <section className="gc-gain-section-grid" aria-label={ar ? "أقسام Gain Mode" : "Gain Mode sections"}>
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`gc-gain-section-link gc-gain-section-${item.tone}`}>
              <span className="gc-gain-section-icon"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><strong>{item.title}</strong><small>{item.note}</small></span>
              <span className="text-end"><b>{item.value}</b><ChevronRight className="ms-auto mt-1 h-3.5 w-3.5 text-neutral-500" /></span>
            </Link>
          );
        })}
      </section>

      {snapshot.profile.supportNote ? (
        <section className="gc-card border-rose-300/15 bg-rose-300/[0.04] p-4">
          <p className="gc-eyebrow">{ar ? "رسالة خاصة" : "Private note"}{snapshot.profile.supportName ? ` · ${ar ? "من" : "from"} ${snapshot.profile.supportName}` : ""}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-neutral-200">{snapshot.profile.supportNote}</p>
        </section>
      ) : null}

      {snapshot.training.improvingExercises > 0 ? (
        <section className="gc-list-panel overflow-hidden">
          <div className="gc-list-row"><Sparkles className="h-4 w-4 text-emerald-400" /><span className="min-w-0 flex-1 text-sm font-bold">{ar ? `أيوه كده — ${snapshot.training.improvingExercises} تمرين بيتحسن. ثبّت النوم والأكل وسيب الأرقام تكمل شغلها.` : `${snapshot.training.improvingExercises} exercise${snapshot.training.improvingExercises === 1 ? " is" : "s are"} improving. Keep sleep and nutrition steady and let the trend build.`}</span></div>
        </section>
      ) : null}

      <GainReviewPreview userId={userId} />

      {showOptions ? (
        <div className="gc-workout-options-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowOptions(false); }}>
          <section className="gc-workout-options-sheet gc-gain-options-sheet" role="dialog" aria-modal="true" aria-label={ar ? "خيارات Gain Mode" : "Gain Mode options"}>
            <div className="gc-workout-options-handle" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="gc-eyebrow">Gain Mode</p>
                <h2 className="mt-0.5 text-xl font-black">{ar ? "الخيارات" : "Options"}</h2>
                <p className="mt-1 text-xs font-semibold text-neutral-500">{ar ? "كل إعداد ثانوي في مكان واحد." : "Secondary controls, kept in one place."}</p>
              </div>
              <button type="button" onClick={() => setShowOptions(false)} className="gc-icon-button" aria-label={ar ? "اقفل" : "Close"}><X className="h-4 w-4" /></button>
            </div>

            <div className="gc-workout-options-list mt-4">
              <Link href="/progress/gain/review" onClick={() => setShowOptions(false)} className="gc-workout-option-row">
                <span className="gc-workout-option-icon"><CalendarDays className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><strong>{ar ? "المراجعة" : "Review"}</strong><small>{ar ? "الوزن والسعرات والالتزام" : "Weight, calories and adherence"}</small></span>
                <ChevronRight className="h-4 w-4 text-neutral-500" />
              </Link>
              <Link href="/progress/gain/training" onClick={() => setShowOptions(false)} className="gc-workout-option-row">
                <span className="gc-workout-option-icon"><BarChart3 className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><strong>{ar ? "خطة التمرين" : "Training plan"}</strong><small>{ar ? "التوافق والحمل الأسبوعي" : "Plan fit and weekly volume"}</small></span>
                <ChevronRight className="h-4 w-4 text-neutral-500" />
              </Link>
              <Link href="/progress/gain/history" onClick={() => setShowOptions(false)} className="gc-workout-option-row">
                <span className="gc-workout-option-icon"><History className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><strong>{ar ? "السجل" : "History"}</strong><small>{ar ? "كل نقاط الرحلة" : "Every point in the journey"}</small></span>
                <ChevronRight className="h-4 w-4 text-neutral-500" />
              </Link>
              <button type="button" onClick={() => setShowGoalEditor((value) => !value)} className="gc-workout-option-row">
                <span className="gc-workout-option-icon"><Target className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 text-start"><strong>{ar ? "تعديل الهدف" : "Edit goal"}</strong><small>{ar ? "الوزن المستهدف وإعدادات Gain" : "Target weight and Gain settings"}</small></span>
                <Settings2 className="h-4 w-4 text-neutral-500" />
              </button>
            </div>

            {showGoalEditor ? <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-2"><GainModeActivationClient userId={userId} compact /></div> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
