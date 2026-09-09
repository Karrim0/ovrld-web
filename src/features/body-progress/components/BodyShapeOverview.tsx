"use client";

import { useMemo, useState } from "react";
import { Ruler, Scale, Sparkles, TrendingUp } from "lucide-react";
import type { BodyMeasurement, BodyProgressSnapshot } from "../types";

type MetricKey = "chestCm" | "waistCm" | "hipsCm" | "thighCm" | "upperArmCm";

const METRICS: Array<{ key: MetricKey; label: string; short: string; y: number }> = [
  { key: "chestCm", label: "الصدر", short: "صدر", y: 78 },
  { key: "waistCm", label: "الوسط", short: "وسط", y: 112 },
  { key: "hipsCm", label: "الأرداف", short: "أرداف", y: 142 },
  { key: "thighCm", label: "الفخذ", short: "فخذ", y: 177 },
  { key: "upperArmCm", label: "الذراع", short: "ذراع", y: 96 },
];

function valueText(value: number | null) {
  if (value === null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} سم`;
}

function deltaText(current: number | null, start: number | null) {
  if (current === null || start === null) return "—";
  const delta = Math.round((current - start) * 10) / 10;
  return `${delta > 0 ? "+" : ""}${delta} سم`;
}

function metricValue(measurement: BodyMeasurement, key: MetricKey) {
  return measurement[key];
}

function MeasurementTrend({ points }: { points: Array<{ date: string; value: number }> }) {
  if (points.length < 2) return <div className="grid h-24 place-items-center rounded-xl border border-dashed border-[var(--border)] text-center text-[10px] leading-4 text-neutral-500">قياسين لنفس المنطقة هيظهروا الاتجاه هنا.</div>;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? 50 : 5 + (index / (points.length - 1)) * 90;
    const y = 72 - ((point.value - min) / span) * 50;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 80" className="h-24 w-full" role="img" aria-label="اتجاه القياس">
      <polyline points={coords} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400" />
      {coords.split(" ").map((point, index) => {
        const [x, y] = point.split(",");
        return <circle key={`${point}-${index}`} cx={x} cy={y} r="2.3" fill="currentColor" className="text-emerald-300" />;
      })}
    </svg>
  );
}

export function BodyShapeOverview({ snapshot }: { snapshot: BodyProgressSnapshot }) {
  const [selected, setSelected] = useState<MetricKey>("hipsCm");
  const circumference = useMemo(() => snapshot.measurements.filter((measurement) => METRICS.some((metric) => measurement[metric.key] != null)), [snapshot.measurements]);
  const latestByMetric = useMemo(() => Object.fromEntries(METRICS.map((metric) => [metric.key, circumference.find((measurement) => metricValue(measurement, metric.key) != null)?.[metric.key] ?? null])) as Record<MetricKey, number | null>, [circumference]);
  const baselineByMetric = useMemo(() => Object.fromEntries(METRICS.map((metric) => [metric.key, [...circumference].reverse().find((measurement) => metricValue(measurement, metric.key) != null)?.[metric.key] ?? null])) as Record<MetricKey, number | null>, [circumference]);
  const metric = METRICS.find((item) => item.key === selected)!;
  const trend = useMemo(() => [...circumference].reverse().flatMap((measurement) => {
    const value = metricValue(measurement, selected);
    return value == null ? [] : [{ date: measurement.measuredAt, value }];
  }).slice(-12), [circumference, selected]);
  const current = latestByMetric[selected];
  const baseline = baselineByMetric[selected];
  const whr = latestByMetric.waistCm && latestByMetric.hipsCm ? latestByMetric.waistCm / latestByMetric.hipsCm : null;

  return (
    <div className="space-y-3">
      <section className="gc-shape-hero">
        <div className="flex items-center gap-3"><span className="gc-shape-icon"><Sparkles className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="gc-eyebrow">تطور الجسم</p><h2 className="mt-0.5 text-xl font-black">خريطة القياسات</h2></div></div>
        <p className="mt-2 text-xs leading-5 text-neutral-500">الرسم بيوضح مكان القياس فقط؛ التغير الحقيقي هو الأرقام والشارت، مش شكل silhouette.</p>

        <div className="gc-shape-layout mt-4">
          <div className="gc-body-silhouette" aria-hidden="true">
            <svg viewBox="0 0 180 250" className="h-full w-full">
              <defs>
                <linearGradient id="bodyFill" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".18" /><stop offset="100%" stopColor="currentColor" stopOpacity=".05" /></linearGradient>
              </defs>
              <circle cx="90" cy="30" r="20" fill="url(#bodyFill)" stroke="currentColor" strokeOpacity=".35" />
              <path d="M66 53 C58 64 55 82 58 101 C61 117 66 128 64 146 C61 168 52 192 55 231 L78 231 C80 202 83 180 89 159 C95 180 99 202 101 231 L124 231 C127 192 118 168 115 146 C113 128 119 117 122 101 C125 82 122 64 114 53 C105 58 98 61 90 61 C82 61 75 58 66 53Z" fill="url(#bodyFill)" stroke="currentColor" strokeOpacity=".45" />
              <path d="M63 66 C46 76 40 100 39 128" fill="none" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
              <path d="M117 66 C134 76 140 100 141 128" fill="none" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
              {METRICS.filter((item) => item.key !== "upperArmCm").map((item) => <line key={item.key} x1={item.key === "waistCm" ? 65 : item.key === "thighCm" ? 61 : 59} x2={item.key === "waistCm" ? 115 : item.key === "thighCm" ? 119 : 121} y1={item.y} y2={item.y} stroke="currentColor" strokeWidth={selected === item.key ? 3 : 1.4} strokeOpacity={selected === item.key ? .9 : .22} strokeLinecap="round" />)}
              <line x1="42" x2="63" y1="96" y2="96" stroke="currentColor" strokeWidth={selected === "upperArmCm" ? 3 : 1.4} strokeOpacity={selected === "upperArmCm" ? .9 : .22} strokeLinecap="round" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="gc-shape-selected"><span>{metric.label}</span><strong>{valueText(current)}</strong><small>{deltaText(current, baseline)} من البداية</small></div>
            <div className="mt-2"><MeasurementTrend points={trend} /></div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {METRICS.map((item) => <button key={item.key} type="button" onClick={() => setSelected(item.key)} className={`gc-shape-metric-button ${selected === item.key ? "gc-shape-metric-active" : ""}`}><span>{item.short}</span><strong>{latestByMetric[item.key] == null ? "—" : Number(latestByMetric[item.key]!).toFixed(Number(latestByMetric[item.key]!) % 1 ? 1 : 0)}</strong></button>)}
        </div>
      </section>

      <section className="gc-list-panel overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-[var(--border)]">
          <div className="gc-plan-stat"><Scale className="h-4 w-4" /><span>الوزن</span><strong>{snapshot.latest ? `${snapshot.latest.weightKg.toFixed(snapshot.latest.weightKg % 1 ? 1 : 0)} كجم` : "—"}</strong></div>
          <div className="gc-plan-stat"><Ruler className="h-4 w-4" /><span>قياسات</span><strong>{circumference.length}</strong></div>
          <div className="gc-plan-stat"><TrendingUp className="h-4 w-4" /><span>وسط/أرداف</span><strong>{whr === null ? "—" : whr.toFixed(2)}</strong></div>
        </div>
      </section>
    </div>
  );
}
