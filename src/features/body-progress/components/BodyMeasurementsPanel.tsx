"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Check, ChevronDown, Info, Ruler, Save } from "lucide-react";
import type { UUID } from "@/types";
import { getArabicErrorMessage } from "@/lib/localization";
import { addBodyMeasurement, saveBodyGoal } from "../services/body-progress.service";
import type { BodyMeasurement, BodyProgressSnapshot } from "../types";

type MetricKey = "waistCm" | "hipsCm" | "chestCm" | "thighCm" | "upperArmCm" | "calfCm" | "neckCm";

type FormKey = "waist" | "hips" | "chest" | "thigh" | "arm" | "calf" | "neck";

const METRICS: Array<{ key: MetricKey; form: FormKey; label: string; short: string }> = [
  { key: "waistCm", form: "waist", label: "الوسط", short: "وسط" },
  { key: "hipsCm", form: "hips", label: "الأرداف", short: "أرداف" },
  { key: "chestCm", form: "chest", label: "الصدر", short: "صدر" },
  { key: "thighCm", form: "thigh", label: "الفخذ", short: "فخذ" },
  { key: "upperArmCm", form: "arm", label: "الذراع", short: "ذراع" },
  { key: "calfCm", form: "calf", label: "السمانة", short: "سمانة" },
  { key: "neckCm", form: "neck", label: "الرقبة", short: "رقبة" },
];

function asNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cm(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} سم`;
}

function delta(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null) return null;
  const value = Math.round((current - previous) * 10) / 10;
  return `${value > 0 ? "+" : ""}${value} سم`;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(new Date(value));
}

function daysUntil(value: string | null) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function measurementSummary(measurement: BodyMeasurement) {
  return METRICS
    .map((metric) => ({ label: metric.short, value: measurement[metric.key] }))
    .filter((item) => item.value != null)
    .slice(0, 3)
    .map((item) => `${item.label} ${Number(item.value).toFixed(Number(item.value) % 1 ? 1 : 0)}`)
    .join(" · ");
}

export function BodyMeasurementsPanel({
  userId,
  snapshot,
  onSaved,
}: {
  userId: UUID;
  snapshot: BodyProgressSnapshot;
  onSaved: () => Promise<void>;
}) {
  const latest = snapshot.latestCircumference;
  const dueInDays = daysUntil(snapshot.nextBodyMeasurementAt);
  const [cadence, setCadence] = useState(String(snapshot.goal?.bodyMeasurementIntervalDays ?? 28));
  const [weight, setWeight] = useState(snapshot.latest?.weightKg ? String(snapshot.latest.weightKg) : "");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [chest, setChest] = useState("");
  const [thigh, setThigh] = useState("");
  const [arm, setArm] = useState("");
  const [calf, setCalf] = useState("");
  const [neck, setNeck] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const circumferenceMeasurements = useMemo(
    () => snapshot.measurements.filter((measurement) => METRICS.some((metric) => measurement[metric.key] != null)),
    [snapshot.measurements],
  );
  const circumferenceHistory = circumferenceMeasurements.slice(0, 5);

  function currentMetric(key: MetricKey) {
    return circumferenceMeasurements.find((measurement) => measurement[key] != null)?.[key] ?? null;
  }

  function baselineMetric(key: MetricKey) {
    return [...circumferenceMeasurements].reverse().find((measurement) => measurement[key] != null)?.[key] ?? null;
  }

  const formValues: Record<FormKey, string> = { waist, hips, chest, thigh, arm, calf, neck };
  const setters: Record<FormKey, (value: string) => void> = {
    waist: setWaist,
    hips: setHips,
    chest: setChest,
    thigh: setThigh,
    arm: setArm,
    calf: setCalf,
    neck: setNeck,
  };

  async function logMeasurements() {
    setError(null); setMessage(null);
    const weightKg = asNumber(weight);
    if (weightKg === null || weightKg < 20 || weightKg > 500) {
      setError("اكتب الوزن وقت القياس.");
      return;
    }

    const values = Object.fromEntries(Object.entries(formValues).map(([key, value]) => [key, asNumber(value)])) as Record<FormKey, number | null>;
    if (!Object.values(values).some((value) => value !== null)) {
      setError("سجّل قياس واحد على الأقل.");
      return;
    }
    if (Object.values(values).some((value) => value !== null && (value < 10 || value > 400))) {
      setError("راجع القياسات بالسنتيمتر قبل الحفظ.");
      return;
    }

    setBusy(true);
    try {
      await addBodyMeasurement(userId, {
        weightKg,
        bodyFatPercentage: asNumber(bodyFat),
        waistCm: values.waist,
        hipsCm: values.hips,
        chestCm: values.chest,
        thighCm: values.thigh,
        upperArmCm: values.arm,
        calfCm: values.calf,
        neckCm: values.neck,
        note,
      });
      setWaist(""); setHips(""); setChest(""); setThigh(""); setArm(""); setCalf(""); setNeck(""); setBodyFat(""); setNote("");
      setMessage("اتسجلت قياسات الجسم.");
      await onSaved();
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "";
      if (/chest_cm|hips_cm|thigh_cm|upper_arm_cm|body_measurement_interval_days|schema cache|could not find/iu.test(raw)) {
        setError("قياسات الجسم محتاجة تحديث قاعدة بيانات Phase 9 مرة واحدة.");
      } else {
        setError(getArabicErrorMessage(caught, "معرفناش نحفظ قياسات الجسم."));
      }
    } finally { setBusy(false); }
  }

  async function saveCadence() {
    const days = Number(cadence);
    if (!Number.isInteger(days) || days < 7 || days > 90) {
      setError("اختار فترة قياسات من أسبوع لـ 90 يوم.");
      return;
    }
    setBusy(true); setError(null); setMessage(null);
    try {
      await saveBodyGoal(userId, {
        goalType: snapshot.goal?.goalType ?? "track_only",
        targetWeightKg: snapshot.goal?.targetWeightKg ?? null,
        heightCm: snapshot.goal?.heightCm ?? null,
        targetDate: snapshot.goal?.targetDate ?? null,
        weighInIntervalDays: snapshot.goal?.weighInIntervalDays ?? 7,
        bodyMeasurementIntervalDays: days,
      });
      setMessage("ميعاد قياسات الجسم اتحفظ.");
      await onSaved();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نحفظ ميعاد القياسات."));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <section className="gc-measurements-hero">
        <div className="flex items-center gap-3">
          <span className="gc-measurements-icon"><Ruler className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">تطور الجسم</p>
            <h2 className="mt-0.5 text-xl font-black">القياسات</h2>
          </div>
          <span className={`gc-day-status ${dueInDays !== null && dueInDays <= 0 ? "gc-day-status-due" : ""}`}>
            {!latest ? "أول قياس" : dueInDays === null ? "كل 4 أسابيع" : dueInDays <= 0 ? "مستحق" : `بعد ${dueInDays} يوم`}
          </span>
        </div>

        {latest ? (
          <div className="gc-body-metric-grid mt-4">
            {METRICS.slice(0, 5).map((metric) => {
              const current = currentMetric(metric.key);
              const change = delta(current, baselineMetric(metric.key));
              return (
                <div key={metric.key} className="gc-body-metric">
                  <span>{metric.label}</span>
                  <strong>{cm(current)}</strong>
                  <small>{change === null ? "—" : `${change} من البداية`}</small>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="gc-measurements-empty mt-4">
            <strong>سجّل نقطة البداية</strong>
            <span>بعد القياس الجاي هنقارن التغيرات بدل الاعتماد على الوزن لوحده.</span>
          </div>
        )}
      </section>

      <section className="gc-list-panel">
        <details open={!latest} className="group">
          <summary className="gc-list-row list-none [&::-webkit-details-marker]:hidden">
            <Ruler className="h-4 w-4 text-emerald-500" />
            <span className="min-w-0 flex-1 font-bold">سجّل قياسات جديدة</span>
            <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-[var(--border)] p-3">
            <label className="text-[10px] font-black text-neutral-500">الوزن وقت القياس · كجم
              <input value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" className="gc-input mt-1" placeholder="52.0" />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {METRICS.slice(0, 5).map((metric) => (
                <label key={metric.key} className="text-[10px] font-black text-neutral-500">{metric.label} · سم
                  <input value={formValues[metric.form]} onChange={(event) => setters[metric.form](event.target.value)} inputMode="decimal" className="gc-input mt-1" placeholder="—" />
                </label>
              ))}
            </div>

            <details className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] p-3 group/extra">
              <summary className="flex list-none items-center gap-2 text-xs font-black [&::-webkit-details-marker]:hidden"><span className="min-w-0 flex-1">قياسات إضافية</span><ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open/extra:rotate-180" /></summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {METRICS.slice(5).map((metric) => (
                  <label key={metric.key} className="text-[10px] font-black text-neutral-500">{metric.label} · سم
                    <input value={formValues[metric.form]} onChange={(event) => setters[metric.form](event.target.value)} inputMode="decimal" className="gc-input mt-1" placeholder="—" />
                  </label>
                ))}
                <label className="text-[10px] font-black text-neutral-500">دهون الجسم % · اختياري
                  <input value={bodyFat} onChange={(event) => setBodyFat(event.target.value)} inputMode="decimal" className="gc-input mt-1" placeholder="—" />
                </label>
                <label className="col-span-2 text-[10px] font-black text-neutral-500">ملاحظة · اختياري
                  <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className="gc-input mt-1" placeholder="مثال: صباحًا قبل الفطار" />
                </label>
              </div>
            </details>

            <button type="button" disabled={busy} onClick={() => void logMeasurements()} className="gc-primary-button mt-3 w-full min-h-11 disabled:opacity-50"><Check className="h-4 w-4" /> {busy ? "بنسجّل…" : "احفظ القياسات"}</button>
          </div>
        </details>
      </section>

      {circumferenceHistory.length ? (
        <section className="gc-list-panel">
          <div className="flex items-center justify-between px-4 py-3"><strong className="text-sm">آخر القياسات</strong><span className="text-[10px] font-bold text-neutral-500">سم</span></div>
          {circumferenceHistory.map((measurement) => (
            <div key={measurement.id} className="gc-list-row">
              <span className="min-w-0 flex-1"><strong className="block text-xs">{shortDate(measurement.measuredAt)}</strong><span className="mt-0.5 block truncate text-[10px] text-neutral-500">{measurementSummary(measurement)}</span></span>
              <strong className="text-xs tabular-nums">{measurement.weightKg.toFixed(measurement.weightKg % 1 ? 1 : 0)} كجم</strong>
            </div>
          ))}
        </section>
      ) : null}

      <section className="gc-list-panel">
        <details className="group">
          <summary className="gc-list-row list-none [&::-webkit-details-marker]:hidden"><CalendarClock className="h-4 w-4 text-indigo-400" /><span className="min-w-0 flex-1 font-bold">ميعاد القياسات</span><span className="text-[10px] font-bold text-neutral-500">{cadence === "28" ? "كل 4 أسابيع" : `كل ${cadence} يوم`}</span><ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-[var(--border)] p-3">
            <div className="grid grid-cols-4 gap-2">
              {[14, 28, 42, 56].map((days) => <button key={days} type="button" onClick={() => setCadence(String(days))} className={`gc-choice-button ${cadence === String(days) ? "gc-choice-button-active" : ""}`}>{days === 14 ? "أسبوعين" : days === 28 ? "4 أسابيع" : days === 42 ? "6 أسابيع" : "8 أسابيع"}</button>)}
            </div>
            <button type="button" disabled={busy} onClick={() => void saveCadence()} className="gc-secondary-button mt-2 w-full"><Save className="h-4 w-4" /> حفظ</button>
          </div>
        </details>
        <details className="group border-t border-[var(--border)]">
          <summary className="gc-list-row list-none [&::-webkit-details-marker]:hidden"><Info className="h-4 w-4 text-neutral-500" /><span className="min-w-0 flex-1 font-bold">إزاي آخد قياس ثابت؟</span><ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" /></summary>
          <div className="px-4 pb-4 text-xs leading-6 text-neutral-500">نفس مكان الشريط ونفس الوقت قدر الإمكان، من غير شدّ زائد. لو قراءتين مختلفين بوضوح، خد القياس مرة تانية.</div>
        </details>
      </section>

      {error ? <p className="rounded-lg bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-500">{message}</p> : null}
    </div>
  );
}
