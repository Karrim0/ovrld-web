"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, BarChart3, CheckCircle2, Dumbbell, Gauge, HeartHandshake, Loader2, ShieldAlert, Sparkles, Target, TrendingUp } from "lucide-react";
import type { UUID } from "@/types";
import { useLanguage } from "@/contexts/language-context";
import { fetchGainModeSnapshot } from "../services/gain-mode.service";
import { applySplitTemplate } from "@/features/splits/services/split.service";
import type { GainModeSnapshot } from "../types";
import { GainModeActivationClient } from "./GainModeActivationClient";

function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

export function GainTrainingIntegrationClient({ userId }: { userId: UUID }) {
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const [snapshot, setSnapshot] = useState<GainModeSnapshot | null | undefined>(undefined);
  const [applyingPlan, setApplyingPlan] = useState(false);
  const [planMessage, setPlanMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchGainModeSnapshot(userId)
      .then((next) => { if (active) setSnapshot(next); })
      .catch(() => { if (active) setSnapshot(null); });
    return () => { active = false; };
  }, [userId]);

  async function applyRecommendedPlan() {
    const confirmed = window.confirm(ar
      ? "تستخدم خطة Gain المقترحة؟ هتستبدل جدولك الأساسي الحالي، لكن تقدر تعدّلها بعدين."
      : "Use the recommended Gain plan? It will replace your current base plan, and you can edit it afterward.");
    if (!confirmed) return;

    setApplyingPlan(true);
    setPlanMessage(null);
    try {
      await applySplitTemplate("gain_glutes_4");
      const next = await fetchGainModeSnapshot(userId);
      setSnapshot(next);
      setPlanMessage(ar
        ? "الخطة اتربطت بـGain Mode: السبت/الاثنين/الأربعاء Lower، الأحد Upper، والثلاثاء/الخميس/الجمعة راحة."
        : "The plan is now linked to Gain Mode: Lower on Sat/Mon/Wed, Upper on Sun, and rest on Tue/Thu/Fri.");
    } catch {
      setPlanMessage(ar ? "معرفناش نطبّق الخطة دلوقتي. جرّب من صفحة جدولي." : "We couldn't apply the plan right now. Try again from My Plan.");
    } finally {
      setApplyingPlan(false);
    }
  }

  if (snapshot === undefined) return <div className="mt-4 h-64 animate-pulse rounded-[20px] bg-[var(--surface-elevated)]" />;
  if (!snapshot) return <GainModeActivationClient userId={userId} />;

  const training = snapshot.training;
  const compatibility = training.compatibility;
  const maxLoad = Math.max(1, ...compatibility.priorityLoads.map((item) => item.sets), ...compatibility.maintenanceLoads.map((item) => item.sets));

  return (
    <div className="space-y-3 pb-24 pt-3">
      <section className="gc-card gc-gain-recommended-plan p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-400"><Sparkles className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">Recommended Gain Plan</p>
            <h2 className="mt-1 text-base font-black">Glutes + Legs · {ar ? "4 أيام" : "4 days"}</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              {ar
                ? "السبت Lower A · الأحد Upper · الاثنين Lower B · الثلاثاء راحة · الأربعاء Lower C · الخميس والجمعة راحة."
                : "Sat Lower A · Sun Upper · Mon Lower B · Tue Rest · Wed Lower C · Thu/Fri Rest."}
            </p>
          </div>
        </div>
        <button type="button" disabled={applyingPlan} onClick={() => void applyRecommendedPlan()} className="gc-primary-button mt-3 w-full">
          {applyingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dumbbell className="h-4 w-4" />}
          {applyingPlan ? (ar ? "بنجهز الخطة…" : "Preparing plan…") : (ar ? "استخدم الخطة المقترحة" : "Use recommended plan")}
        </button>
        {planMessage ? <p className="mt-2 text-xs leading-5 text-neutral-500" aria-live="polite">{planMessage}</p> : null}
      </section>

      <section className={`gc-gain-plan-score gc-gain-plan-${compatibility.state}`}>
        <div className="flex items-start gap-3">
          <span className="gc-gain-plan-score-ring">{compatibility.score === null ? "—" : compatibility.score}</span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">{ar ? "توافق الجدول" : "Plan match"} · {t(compatibility.focusLabel)}</p>
            <h2 className="mt-1 text-lg font-black">{t(compatibility.title)}</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">{t(compatibility.detail)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-[10px] font-bold text-neutral-500">
          <span>{ar ? "مؤشر داخلي لتوزيع الخطة، مش درجة طبية أو ضمان للنتيجة." : "An internal plan-distribution indicator, not a medical score or a guarantee of results."}</span>
          <Link href="/split/personal" className="gc-compact-link shrink-0">{ar ? "عدّل الجدول" : "Edit plan"}<ArrowUpLeft className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      <section className="gc-list-panel overflow-hidden">
        <div className="grid grid-cols-4 divide-x divide-[var(--border)] rtl:divide-x-reverse">
          <div className="gc-plan-stat"><Dumbbell className="h-4 w-4" /><span>{ar ? "الأيام" : "Days"}</span><strong>{training.trainingDays}</strong></div>
          <div className="gc-plan-stat"><Gauge className="h-4 w-4" /><span>{ar ? "السِتات" : "Sets"}</span><strong>{training.plannedSets}</strong></div>
          <div className="gc-plan-stat"><CheckCircle2 className="h-4 w-4" /><span>{ar ? "الأسبوع" : "Week"}</span><strong>{training.workoutsCompleted}/{training.workoutsScheduled || training.trainingDays}</strong></div>
          <div className="gc-plan-stat"><Target className="h-4 w-4" /><span>{ar ? "الالتزام" : "Adherence"}</span><strong>{percent(training.adherence)}</strong></div>
        </div>
      </section>

      {compatibility.priorityLoads.length ? (
        <section className="gc-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div><p className="gc-eyebrow">{ar ? "أولوية الخطة" : "Plan priority"}</p><h3 className="mt-1 text-base font-black">{ar ? "الحمل الأسبوعي" : "Weekly volume"}</h3></div>
            {compatibility.lowerBodyShare !== null ? <span className="gc-mini-badge">Lower {compatibility.lowerBodyShare}%</span> : null}
          </div>
          <div className="mt-4 space-y-3">
            {compatibility.priorityLoads.map((item) => (
              <div key={item.muscle} className="gc-plan-load-row">
                <div className="flex items-center justify-between gap-3 text-xs"><strong>{t(item.muscle)}</strong><span className="tabular-nums text-neutral-500">{item.sets} {ar ? "سِت" : "sets"} · {item.exposureDays} {ar ? "يوم" : item.exposureDays === 1 ? "day" : "days"}</span></div>
                <div className="gc-progress-track mt-1.5"><span style={{ width: `${Math.min(100, (item.sets / maxLoad) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {compatibility.maintenanceLoads.length ? (
        <section className="gc-card p-4">
          <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-neutral-500" /><h3 className="text-sm font-black">{ar ? "الحفاظ على التوازن" : "Maintain balance"}</h3></div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {compatibility.maintenanceLoads.map((item) => (
              <div key={item.muscle} className="gc-mini-plan-load"><span>{t(item.muscle)}</span><strong>{item.sets}</strong><small>{item.exposureDays} {ar ? "يوم" : item.exposureDays === 1 ? "day" : "days"}</small></div>
            ))}
          </div>
        </section>
      ) : null}

      {compatibility.insights.length ? (
        <section className="gc-list-panel overflow-hidden">
          <div className="gc-list-row"><TrendingUp className="h-4 w-4 text-emerald-400" /><strong className="min-w-0 flex-1 text-sm">{ar ? "ملاحظات التوزيع" : "Distribution notes"}</strong></div>
          {compatibility.insights.map((insight, index) => <div key={`${insight}-${index}`} className="gc-list-row border-t border-[var(--border)]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--surface-overlay)] text-[10px] font-black">{index + 1}</span><span className="min-w-0 flex-1 text-xs leading-5 text-neutral-500">{t(insight)}</span></div>)}
        </section>
      ) : null}

      <section className="gc-card p-4">
        <p className="gc-eyebrow">{ar ? "الأداء الحقيقي" : "Actual performance"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="gc-mini-plan-load"><span>{ar ? "بيتحسن" : "Improving"}</span><strong>{training.improvingExercises}</strong><small>{ar ? "تمرين" : "exercises"}</small></div>
          <div className="gc-mini-plan-load"><span>Plateau</span><strong>{training.plateauExercises}</strong><small>{ar ? "تمرين" : "exercises"}</small></div>
          <div className="gc-mini-plan-load"><span>{ar ? "نازل" : "Declining"}</span><strong>{training.slippingExercises}</strong><small>{ar ? "تمرين" : "exercises"}</small></div>
        </div>
        <Link href="/progress" className="gc-secondary-button mt-3 w-full">{ar ? "شوف تقدم التمرين" : "View training progress"}<ArrowUpLeft className="h-4 w-4" /></Link>
      </section>

      <section className="gc-list-panel overflow-hidden">
        <div className="gc-list-row"><HeartHandshake className="h-4 w-4 text-rose-300" /><strong className="min-w-0 flex-1 text-sm">{ar ? "قواعد التطور" : "Progress rules"}</strong></div>
        <div className="gc-list-row border-t border-[var(--border)]"><span className="text-xs leading-5 text-neutral-500">{ar ? "1–2 RIR في أغلب السِتات · 2–3 دقايق راحة في التمارين الأساسية · زوّد عدة الأول وبعدها الوزن." : "Keep most sets at 1–2 RIR · rest 2–3 minutes on compounds · add reps first, then load."}</span></div>
        <div className="gc-list-row border-t border-[var(--border)]"><span className="text-xs leading-5 text-neutral-500">{ar ? "لو عندك مشوار أو محتاجة يوم زيادة راحة، عدّلي «الأسبوع ده» بس. الخطة الأساسية تفضل محفوظة وGain Mode هيقرأ اللي حصل فعلاً." : "If real life forces an extra rest day, edit only this week. Your base plan stays saved and Gain Mode reads what actually happened."}</span></div>
        <div className="gc-list-row border-t border-[var(--border)]"><span className="text-xs leading-5 text-neutral-500">{ar ? "Warm-up 5–10 دقايق + سِتات تسخين لأول compound. نامي 7–9 ساعات، وما تقلليش الأكل أو البروتين في يوم الراحة." : "Warm up for 5–10 minutes plus ramp-up sets for the first compound. Aim for 7–9 hours of sleep and do not cut food or protein on rest days."}</span></div>
        <div className="gc-list-row border-t border-[var(--border)]"><ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" /><span className="text-xs leading-5 text-neutral-500">{ar ? "ألم حاد/مفصلي أو تعب غير طبيعي = وقفي التمرين المسبب وراجعي التكنيك أو مختص. الوجع مش مقياس لجودة التمرين." : "Sharp or joint pain, or unusual fatigue: stop the provoking exercise and review technique or a professional. Pain is not a measure of workout quality."}</span></div>
      </section>
    </div>
  );
}
