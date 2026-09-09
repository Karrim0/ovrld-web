"use client";

import { useEffect, useState } from "react";
import { CircleAlert, ScanSearch, Sparkles, Target } from "lucide-react";
import { getArabicErrorMessage, muscleLabelAr } from "@/lib/localization";
import type { UUID } from "@/types";
import { fetchPlanAudit, type PlanAuditResult } from "../services/plan-audit.service";

const ALIGNMENT = {
  good: { label: "الخطة شكلها متماسك", detail: "التغطية الأساسية موجودة ومفيش فجوة كبيرة ظاهرة من تركيب الجدول." },
  partial: { label: "الخطة محتاجة نظرة", detail: "في شوية توزيع أو تغطية يستاهلوا مراجعة، من غير ما نفترض إن الخطة غلط." },
  needs_work: { label: "في فجوات واضحة", detail: "الجدول الحالي سايب كذا منطقة كبيرة برا الصورة أو لسه ناقص تمارين." },
  not_enough_data: { label: "كمّل الجدول الأول", detail: "التدقيق محتاج أيام تمرين وتمارين محفوظة عشان يقول حاجة مفيدة." },
} as const;

export function PlanAuditPanel({ userId, revision }: { userId: UUID; revision?: string }) {
  const [data, setData] = useState<PlanAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchPlanAudit(userId)
      .then((next) => {
        if (!active) return;
        setData(next);
        setError(null);
      })
      .catch((caught) => {
        if (active) setError(getArabicErrorMessage(caught, "معرفناش نراجع الجدول دلوقتي."));
      });
    return () => { active = false; };
  }, [revision, userId]);

  if (error) return <section className="gc-card p-4"><p className="text-sm text-neutral-500">{error}</p></section>;
  if (!data) return <section className="h-44 animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.035]" />;

  const meta = ALIGNMENT[data.alignment];
  const visibleMuscles = data.muscles.filter((item) => item.weightedSets > 0).slice(0, 8);
  const maxLoad = Math.max(1, ...visibleMuscles.map((item) => item.weightedSets));

  return (
    <section className="gc-card overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-300/10 text-indigo-200"><ScanSearch className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="gc-eyebrow">Plan Audit</p><h3 className="mt-1 text-lg font-black">{meta.label}</h3><p className="mt-1 text-xs leading-5 text-neutral-500">{meta.detail}</p></div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="gc-stat"><strong>{data.trainingDays}</strong><span className="mt-1 block text-[9px] font-bold text-neutral-600">أيام</span></div>
          <div className="gc-stat"><strong>{data.plannedSets}</strong><span className="mt-1 block text-[9px] font-bold text-neutral-600">سِتات</span></div>
          <div className="gc-stat"><strong>{data.exerciseSlots}</strong><span className="mt-1 block text-[9px] font-bold text-neutral-600">تمارين</span></div>
          <div className="gc-stat"><strong>{data.coveredMuscles}/10</strong><span className="mt-1 block text-[9px] font-bold text-neutral-600">تغطية</span></div>
        </div>
      </div>

      {visibleMuscles.length > 0 ? (
        <div className="border-t border-white/[0.06] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="gc-eyebrow">خريطة الخطة</p><h4 className="mt-1 font-bold">فين السِتات رايحة؟</h4></div><Target className="h-4 w-4 text-neutral-600" /></div>
          <div className="mt-4 space-y-2.5">
            {visibleMuscles.map((item) => (
              <div key={item.muscle} className="grid grid-cols-[70px_1fr_auto] items-center gap-2 text-xs">
                <span className="truncate font-bold text-neutral-400">{muscleLabelAr(item.muscle)}</span>
                <span className="h-2 overflow-hidden rounded-full bg-white/[0.05]"><span className="block h-full rounded-full bg-indigo-300/70" style={{ width: `${Math.max(7, (item.weightedSets / maxLoad) * 100)}%` }} /></span>
                <span className="min-w-10 text-end text-[10px] text-neutral-600">{item.exposureDays}×</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-5 text-neutral-600">الخريطة تقريبية: السِت الأساسي بيتحسب كامل، والعضلات المساعدة بوزن أقل. دي أداة مقارنة داخلية، مش وصفة تدريب جاهزة.</p>
        </div>
      ) : null}

      <div className="border-t border-white/[0.06] p-4 sm:p-5">
        <div className="space-y-2">
          {data.insights.map((insight) => (
            <div key={insight.id} className="flex items-start gap-3 rounded-2xl bg-white/[0.025] p-3">
              <span className={`mt-0.5 ${insight.tone === "positive" ? "text-emerald-200" : insight.tone === "watch" ? "text-amber-200" : "text-indigo-200"}`}>{insight.tone === "positive" ? <Sparkles className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}</span>
              <div><p className="text-sm font-bold">{insight.title}</p><p className="mt-1 text-[11px] leading-5 text-neutral-600">{insight.detail}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
