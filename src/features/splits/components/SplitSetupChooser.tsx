"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import { useLanguage } from "@/contexts/language-context";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Dumbbell,
  FileUp,
  LayoutTemplate,
  Loader2,
  PencilRuler,
  Sparkles,
  X,
} from "lucide-react";
import type { StarterPlanKey } from "../types";
import { STARTER_PLANS } from "../constants/starter-plans";
import { applySplitTemplate } from "../services/split.service";
import { SplitImportWizard } from "./SplitImportWizard";

interface SplitSetupChooserProps {
  onChanged: () => Promise<void>;
}

const STARTERS = STARTER_PLANS;

export function SplitSetupChooser({ onChanged }: SplitSetupChooserProps) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [starterOpen, setStarterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<StarterPlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gainPlan = STARTERS.find((plan) => plan.recommendedForGain) ?? STARTERS[0];

  async function apply(key: StarterPlanKey) {
    const selected = STARTERS.find((plan) => plan.key === key);
    const warning = key === "manual"
      ? ar
        ? "تبدأ بجدول فاضي؟ جدولك الأساسي الحالي هيتبدّل، وتقدر تضيف الأيام والتمارين بعدها."
        : "Start with an empty plan? Your current base plan will be replaced and you can build it from there."
      : ar
        ? `تستخدم ${selected?.titleAr ?? "الجدول ده"}؟ جدولك الأساسي الحالي هيتبدّل، وتقدر تعدّل كل حاجة بعدين.`
        : `Use ${selected?.titleEn ?? "this plan"}? Your current base plan will be replaced, and you can edit everything later.`;
    if (!window.confirm(warning)) return;

    setBusyKey(key);
    setError(null);
    try {
      await applySplitTemplate(key);
      await onChanged();
      setStarterOpen(false);
    } catch (caught) {
      const arabic = getArabicErrorMessage(caught, "معرفناش نعمل الجدول.");
      setError(ar ? arabic : "We could not apply this plan. Please try again.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div>
      <section className="gc-plan-builder rounded-[24px] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="gc-plan-builder-icon"><LayoutTemplate className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">{ar ? "إعداد الجدول" : "Plan setup"}</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.025em]">
              {ar ? "ابدأ من نقطة واضحة" : "Choose a clear starting point"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              {ar
                ? "اختار خطة جاهزة، استورد جدولك الحالي، أو ابدأ من الصفر. أي اختيار تقدر تعدّله بعدين."
                : "Choose a ready plan, import the plan you already use, or build from scratch. Every option stays editable."}
            </p>
          </div>
        </div>

        <div className="gc-plan-recommended mt-4">
          <div className="flex items-start gap-3">
            <span className="gc-plan-recommended-mark"><Sparkles className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm font-black">{ar ? gainPlan.titleAr : gainPlan.titleEn}</strong>
                <span className="gc-plan-recommended-badge">{ar ? "مقترح لـ Gain Mode" : "Recommended for Gain Mode"}</span>
                {gainPlan.womenFocused ? <span className="gc-plan-women-badge">{ar ? "موجّه للبنات" : "Women-focused"}</span> : null}
              </div>
              <p className="mt-1 text-xs leading-5 text-neutral-500">{ar ? gainPlan.detailAr : gainPlan.detailEn}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="gc-plan-chip">{ar ? "4 أيام تمرين" : "4 training days"}</span>
                <span className="gc-plan-chip">{ar ? "3 أيام راحة" : "3 rest days"}</span>
                <span className="gc-plan-chip gc-plan-chip-blush">Glutes + Legs · Shape</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={Boolean(busyKey)}
            onClick={() => void apply("gain_glutes_4")}
            className="gc-primary-button mt-4 w-full"
          >
            {busyKey === "gain_glutes_4" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dumbbell className="h-4 w-4" />}
            {busyKey === "gain_glutes_4"
              ? ar ? "بنجهز الخطة…" : "Preparing plan…"
              : ar ? "استخدم خطة Gain" : "Use Gain plan"}
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button type="button" disabled={Boolean(busyKey)} onClick={() => setStarterOpen(true)} className="gc-plan-path-card">
            <span className="gc-plan-path-icon"><LayoutTemplate className="h-4.5 w-4.5" /></span>
            <span className="min-w-0 flex-1 text-start">
              <strong>{ar ? "كل الخطط الجاهزة" : "Ready plans"}</strong>
              <small>{ar ? "3–6 أيام" : "3–6 days"}</small>
            </span>
            <ArrowRight className="gc-plan-path-arrow h-4 w-4" />
          </button>

          <button type="button" disabled={Boolean(busyKey)} onClick={() => setImportOpen(true)} className="gc-plan-path-card">
            <span className="gc-plan-path-icon"><FileUp className="h-4.5 w-4.5" /></span>
            <span className="min-w-0 flex-1 text-start">
              <strong>{ar ? "استورد جدولك" : "Import your plan"}</strong>
              <small>{ar ? "ملف أو نص" : "File or text"}</small>
            </span>
            <ArrowRight className="gc-plan-path-arrow h-4 w-4" />
          </button>

          <button type="button" disabled={Boolean(busyKey)} onClick={() => void apply("manual")} className="gc-plan-path-card">
            <span className="gc-plan-path-icon"><PencilRuler className="h-4.5 w-4.5" /></span>
            <span className="min-w-0 flex-1 text-start">
              <strong>{ar ? "ابدأ من الصفر" : "Build from scratch"}</strong>
              <small>{ar ? "أسبوع فاضي" : "Empty week"}</small>
            </span>
            {busyKey === "manual" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="gc-plan-path-arrow h-4 w-4" />}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--surface-overlay)] px-3 py-2 text-[11px] font-semibold text-neutral-500">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>{ar ? "مفيش اختيار نهائي: الأيام والتمارين والأهداف كلها قابلة للتعديل." : "Nothing is locked: days, exercises and targets can all be edited later."}</span>
        </div>

        {error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-300">{error}</p> : null}
      </section>

      {starterOpen ? (
        <div className="gc-modal-backdrop fixed inset-0 z-[85] flex items-end p-2 sm:items-center sm:justify-center sm:p-3" role="dialog" aria-modal="true" aria-label={ar ? "اختار جدول جاهز" : "Choose a ready plan"}>
          <section className="gc-modal-card w-full max-w-lg rounded-[24px] p-4 sm:rounded-[26px] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="gc-eyebrow">{ar ? "الخطط الجاهزة" : "Ready plans"}</p>
                <h3 className="mt-1 text-xl font-black">{ar ? "اختار الهيكل الأقرب لهدفك" : "Choose the structure closest to your goal"}</h3>
                <p className="mt-1 text-sm leading-5 text-neutral-500">{ar ? "شوف عدد الأيام والتركيز قبل ما تطبق الخطة." : "Compare days and focus before applying a plan."}</p>
              </div>
              <button type="button" onClick={() => setStarterOpen(false)} className="gc-icon-button rounded-full" aria-label={ar ? "اقفل" : "Close"}><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-4 space-y-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter.key}
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() => void apply(starter.key)}
                  className={`gc-ready-plan-row ${starter.recommendedForGain ? "gc-ready-plan-row-recommended" : ""}`}
                >
                  <span className="gc-ready-plan-days"><strong>{starter.days}</strong><small>{ar ? "أيام" : "days"}</small></span>
                  <span className="min-w-0 flex-1 text-start">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <strong className="text-sm">{ar ? starter.titleAr : starter.titleEn}</strong>
                      {starter.recommendedForGain ? <span className="gc-plan-recommended-badge">Gain Mode</span> : null}
                      {starter.womenFocused ? <span className="gc-plan-women-badge">{ar ? "للبنات" : "Women"}</span> : null}
                    </span>
                    <small className="mt-1 block text-xs leading-5 text-neutral-500">{ar ? starter.detailAr : starter.detailEn}</small>
                  </span>
                  {busyKey === starter.key ? <Loader2 className="h-5 w-5 animate-spin text-emerald-300" /> : <ArrowRight className="h-4 w-4 shrink-0 text-neutral-500" />}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {importOpen ? <SplitImportWizard onClose={() => setImportOpen(false)} onImported={onChanged} /> : null}
    </div>
  );
}
