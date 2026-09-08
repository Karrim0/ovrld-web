"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Gauge, RefreshCcw, Scale, TrendingUp, Utensils, Dumbbell, Ruler, History } from "lucide-react";
import type { UUID } from "@/types";
import { getArabicErrorMessage } from "@/lib/localization";
import { applyGainCalorieAdjustment, fetchGainReviewSnapshot } from "../services/review.service";
import type { GainCalorieAdjustment, GainReviewSnapshot, GainReviewWindow } from "../types";

function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function signed(value: number | null, suffix = "") {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}${suffix}`;
}

function WindowMetrics({ title, window }: { title: string; window: GainReviewWindow }) {
  return (
    <section className="gc-review-section">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black">{title}</h3><span className="gc-mini-label">{window.startDate} → {window.endDate}</span></div>
      <div className="gc-review-metric-grid mt-3">
        <div><Utensils className="h-4 w-4" /><span>تسجيل الأكل</span><strong>{window.nutrition.daysLogged}/{window.nutrition.daysTotal}</strong></div>
        <div><Gauge className="h-4 w-4" /><span>متوسط السعرات</span><strong>{window.nutrition.averageCaloriesKcal === null ? "—" : Math.round(window.nutrition.averageCaloriesKcal).toLocaleString("en-US")}</strong></div>
        <div><Dumbbell className="h-4 w-4" /><span>التمرين</span><strong>{window.workoutsCompleted}{window.workoutsScheduled === null ? "" : `/${window.workoutsScheduled}`}</strong></div>
        <div><Scale className="h-4 w-4" /><span>تغير الوزن</span><strong>{signed(window.weightChangeKg, " كجم")}</strong></div>
        <div><TrendingUp className="h-4 w-4" /><span>قريب من السعرات</span><strong>{percent(window.nutrition.averageCalorieTargetRatio)}</strong></div>
        <div><CheckCircle2 className="h-4 w-4" /><span>قريب من البروتين</span><strong>{percent(window.nutrition.averageProteinTargetRatio)}</strong></div>
      </div>
    </section>
  );
}

export function GainReviewClient({ userId }: { userId: UUID }) {
  const [review, setReview] = useState<GainReviewSnapshot | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const next = await fetchGainReviewSnapshot(userId);
    setReview(next);
  }, [userId]);

  useEffect(() => {
    void load().catch((caught: unknown) => {
      setReview(null);
      setError(getArabicErrorMessage(caught, "معرفناش نحمّل المراجعة."));
    });
  }, [load]);

  const measurementRows = useMemo(() => {
    if (!review) return [];
    return [
      ["الوسط", review.measurements.waistDeltaCm],
      ["الأرداف", review.measurements.hipsDeltaCm],
      ["الفخذ", review.measurements.thighDeltaCm],
    ] as const;
  }, [review]);

  async function applySuggestion() {
    if (!review?.decision.canApply || review.decision.suggestedCalorieTargetKcal === null) return;
    setBusy(true); setError(null); setSaved(null);
    try {
      await applyGainCalorieAdjustment(userId, {
        targetCalorieKcal: review.decision.suggestedCalorieTargetKcal,
        reason: review.decision.title,
        periodStart: review.weekly.startDate,
        periodEnd: review.weekly.endDate,
      });
      setSaved(`اتطبق الهدف الجديد: ${review.decision.suggestedCalorieTargetKcal} kcal`);
      await load();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نطبّق تعديل السعرات."));
    } finally {
      setBusy(false);
    }
  }

  if (review === undefined) return <div className="mt-4 h-72 animate-pulse rounded-[18px] bg-[var(--surface-elevated)]" />;
  if (!review) return <div className="gc-empty-state mt-4"><p>{error ?? "Gain Mode مش مفعّل."}</p></div>;

  const DecisionIcon = review.decision.state === "suggest" ? Gauge : review.decision.state === "observe" ? Clock3 : CheckCircle2;

  return (
    <div className="space-y-3 pb-24 pt-3">
      <section className={`gc-review-decision gc-review-${review.decision.state}`}>
        <div className="flex items-start gap-3">
          <span className="gc-review-icon"><DecisionIcon className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">قرار الأسبوع</p>
            <h2 className="mt-1 text-lg font-black">{review.decision.title}</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-500">{review.decision.detail}</p>
          </div>
        </div>
        {review.decision.suggestedCalorieTargetKcal !== null ? (
          <div className="gc-calorie-change mt-4">
            <div><span>الحالي</span><strong>{review.calorieTargetKcal ?? "—"}</strong></div>
            <span>→</span>
            <div><span>المقترح</span><strong>{review.decision.suggestedCalorieTargetKcal}</strong></div>
            <small>kcal</small>
          </div>
        ) : null}
        {review.decision.canApply ? <button type="button" disabled={busy} onClick={() => void applySuggestion()} className="gc-primary-button mt-4 w-full">{busy ? "بنطبّق…" : "طبّقي التعديل"}</button> : null}
        <p className="mt-3 text-[11px] leading-5 text-neutral-500">OVRLD يقترح فقط. السعرات لا تتغير إلا بعد موافقتك.</p>
      </section>

      {error ? <p className="gc-inline-error">{error}</p> : null}
      {saved ? <p className="gc-inline-success">{saved}</p> : null}

      <WindowMetrics title="آخر 7 أيام مكتملة" window={review.weekly} />
      <WindowMetrics title="آخر 28 يوم" window={review.month28} />

      <section className="gc-review-section">
        <div className="flex items-center gap-2"><Ruler className="h-4 w-4 text-emerald-400" /><h3 className="text-sm font-black">القياسات</h3></div>
        <div className="mt-3 grid grid-cols-3 text-center">
          {measurementRows.map(([label, value]: readonly [string, number | null], index: number) => <div key={label} className={index === 1 ? "border-x border-[var(--border)]" : ""}><span className="gc-mini-label">{label}</span><strong className="mt-1 block text-sm">{signed(value, " سم")}</strong></div>)}
        </div>
        <p className="mt-3 text-[11px] text-neutral-500">الفرق بين أول وآخر قياس محيط متاحين في السجل الحالي.</p>
      </section>

      <section className="gc-review-section">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><History className="h-4 w-4 text-neutral-500" /><h3 className="text-sm font-black">تعديلات السعرات</h3></div><button type="button" onClick={() => void load()} className="gc-icon-button" aria-label="تحديث"><RefreshCcw className="h-4 w-4" /></button></div>
        {review.adjustments.length === 0 ? <p className="mt-3 text-xs text-neutral-500">لسه مفيش تعديلات محفوظة.</p> : <div className="mt-2 divide-y divide-[var(--border)]">{review.adjustments.map((item: GainCalorieAdjustment) => <div key={item.id} className="flex items-center gap-3 py-3 text-xs"><div className="min-w-0 flex-1"><strong className="block">{item.previousTargetKcal ?? "تقدير"} → {item.newTargetKcal} kcal</strong><span className="mt-0.5 block truncate text-neutral-500">{item.source === "manual" ? "تعديل يدوي" : "مراجعة Gain Mode"}</span></div><time className="shrink-0 text-neutral-500">{new Date(item.createdAt).toLocaleDateString("ar-EG")}</time></div>)}</div>}
      </section>
    </div>
  );
}
