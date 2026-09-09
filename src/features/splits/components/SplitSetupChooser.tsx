"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import { useState } from "react";
import { ChevronLeft, FileUp, LayoutTemplate, Loader2, PencilRuler, Sparkles, X } from "lucide-react";
import type { StarterPlanKey } from "../types";
import { applySplitTemplate } from "../services/split.service";
import { SplitImportWizard } from "./SplitImportWizard";

interface SplitSetupChooserProps {
  onChanged: () => Promise<void>;
}

const STARTERS: Array<{ key: Exclude<StarterPlanKey, "manual">; title: string; detail: string }> = [
  { key: "gain_glutes_4", title: "Recommended Gain · Glutes + Legs", detail: "4 أيام · السبت Lower A · الأحد Upper · الاثنين Lower B · الأربعاء Lower C" },
  { key: "full_body_3", title: "فل بادي · 3 أيام", detail: "بسيط ومتوازن والراحة فيه سهلة" },
  { key: "upper_lower_4", title: "أبر / لوور · 4 أيام", detail: "تمرينتين أبر وتمرينتين لوور" },
  { key: "ppl_ul_5", title: "بوش بول رجل + أبر لوور · 5 أيام", detail: "تكرار أعلى ومعاه يومين راحة" },
  { key: "ppl_6", title: "بوش / بول / رجل · 6 أيام", detail: "دورة كاملة من 6 أيام" },
];

export function SplitSetupChooser({ onChanged }: SplitSetupChooserProps) {
  const [starterOpen, setStarterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<StarterPlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply(key: StarterPlanKey) {
    const warning = key === "manual"
      ? "تبدأ بأسبوع فاضي؟ التمارين الحالية هتتمسح."
      : "تبدّل جدولك الحالي بالجدول الجاهز ده؟";
    if (!window.confirm(warning)) return;
    setBusyKey(key);
    setError(null);
    try {
      await applySplitTemplate(key);
      await onChanged();
      setStarterOpen(false);
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نعمل الجدول."));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <section className="gc-hero-card relative overflow-hidden rounded-[28px] p-4 sm:p-5">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-indigo-300/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-200" /><p className="gc-eyebrow">اعمل جدولك أو غيّره</p></div>
          <h2 className="mt-2 text-xl font-bold">عايز تعمل جدولك إزاي؟</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-500">ابدأ من الصفر، اختار نظام جاهز، أو خلّي OVRLD يقرا الجدول اللي بتتمرّن عليه.</p>

          <button type="button" disabled={Boolean(busyKey)} onClick={() => void apply("gain_glutes_4")} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.08] p-4 text-start transition hover:border-emerald-300/45">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-300/12 text-emerald-200"><Sparkles className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><strong className="block">Recommended Gain · Glutes + Legs</strong><span className="mt-1 block text-xs leading-5 text-neutral-400">4 أيام · الخميس والجمعة راحة ثابتة · متوصل تلقائي بـGain Mode.</span></span>
            {busyKey === "gain_glutes_4" ? <Loader2 className="h-5 w-5 animate-spin text-emerald-200" /> : <ChevronLeft className="h-5 w-5 text-emerald-200" />}
          </button>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button type="button" disabled={Boolean(busyKey)} onClick={() => void apply("manual")} className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 text-start transition hover:border-indigo-300/30 hover:bg-indigo-300/[0.07]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] text-indigo-200"><PencilRuler className="h-5 w-5" /></span>
              <strong className="mt-3 flex items-center justify-between">اعمل جدولك بنفسك {busyKey === "manual" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronLeft className="h-4 w-4 text-neutral-600 group-hover:text-indigo-200" />}</strong>
              <span className="mt-1 block text-xs leading-5 text-neutral-500">أسبوع فاضي تشكّله براحتك.</span>
            </button>
            <button type="button" disabled={Boolean(busyKey)} onClick={() => setStarterOpen(true)} className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 text-start transition hover:border-indigo-300/30 hover:bg-indigo-300/[0.07]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] text-indigo-200"><LayoutTemplate className="h-5 w-5" /></span>
              <strong className="mt-3 flex items-center justify-between">استخدم جدول جاهز <ChevronLeft className="h-4 w-4 text-neutral-600 group-hover:text-indigo-200" /></strong>
              <span className="mt-1 block text-xs leading-5 text-neutral-500">اختار 3 أو 4 أو 5 أو 6 أيام تمرين.</span>
            </button>
            <button type="button" disabled={Boolean(busyKey)} onClick={() => setImportOpen(true)} className="group rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.07] p-4 text-start transition hover:border-indigo-300/40 hover:bg-indigo-300/[0.11]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-300/12 text-indigo-200"><FileUp className="h-5 w-5" /></span>
              <strong className="mt-3 flex items-center justify-between">استورد جدولك <ChevronLeft className="h-4 w-4 text-indigo-200" /></strong>
              <span className="mt-1 block text-xs leading-5 text-neutral-400">صورة أو PDF أو Excel أو CSV أو نص منسوخ.</span>
            </button>
          </div>
          {error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-300">{error}</p> : null}
        </div>
      </section>

      {starterOpen ? (
        <div className="gc-modal-backdrop fixed inset-0 z-[85] flex items-end p-2 sm:items-center sm:justify-center sm:p-3" role="dialog" aria-modal="true" aria-label="اختار جدول جاهز">
          <section className="gc-modal-card w-full max-w-lg rounded-[24px] p-4 sm:rounded-[26px] sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="gc-eyebrow">جداول جاهزة</p><h3 className="mt-1 text-xl font-bold">اختار عدد أيام تمرينك</h3><p className="mt-1 text-sm text-neutral-500">تقدر تعدّل كل اسم ويوم وتمرين وهدف براحتك.</p></div><button type="button" onClick={() => setStarterOpen(false)} className="gc-icon-button rounded-full"><X className="h-5 w-5" /></button></div>
            <div className="mt-4 space-y-2">
              {STARTERS.filter((starter) => starter.key !== "gain_glutes_4").map((starter) => (
                <button key={starter.key} type="button" disabled={Boolean(busyKey)} onClick={() => void apply(starter.key)} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-start transition hover:border-indigo-300/30">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-300/10 text-indigo-200"><LayoutTemplate className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><strong className="block">{starter.title}</strong><span className="mt-0.5 block text-xs text-neutral-500">{starter.detail}</span></span>
                  {busyKey === starter.key ? <Loader2 className="h-5 w-5 animate-spin text-indigo-200" /> : <ChevronLeft className="h-5 w-5 text-neutral-600" />}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {importOpen ? <SplitImportWizard onClose={() => setImportOpen(false)} onImported={onChanged} /> : null}
    </>
  );
}
