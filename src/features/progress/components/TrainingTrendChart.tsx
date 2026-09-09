"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Dumbbell, Layers3 } from "lucide-react";
import { formatWeight } from "@/lib/utils/format";
import type { UUID } from "@/types";
import { fetchTrainingTrend, type TrainingTrendPoint } from "../services/progress.service";
import { TrendLineChart } from "./TrendLineChart";

type Metric = "volume" | "sets" | "sessions";

const METRICS: Array<{ key: Metric; label: string; icon: React.ReactNode }> = [
  { key: "volume", label: "حجم التمرين", icon: <Dumbbell className="h-4 w-4" /> },
  { key: "sets", label: "السِتات", icon: <Layers3 className="h-4 w-4" /> },
  { key: "sessions", label: "التمرينات", icon: <Activity className="h-4 w-4" /> },
];

export function TrainingTrendChart({ userId }: { userId: UUID }) {
  const [metric, setMetric] = useState<Metric>("volume");
  const [points, setPoints] = useState<TrainingTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchTrainingTrend(userId, 8)
      .then((next) => { if (active) setPoints(next); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  const chartPoints = useMemo(() => points.map((point) => ({
    label: point.label,
    value: metric === "volume" ? point.volumeKg : metric === "sets" ? point.workingSets : point.sessions,
  })), [metric, points]);

  const format = metric === "volume" ? (value: number) => formatWeight(value) : (value: number) => Math.round(value).toString();

  return (
    <section className="gc-card p-4 sm:p-5">
      <div>
        <p className="gc-eyebrow">8 أسابيع</p>
        <h3 className="mt-1 text-lg font-black">الاتجاه</h3>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {METRICS.map((item) => (
          <button key={item.key} type="button" onClick={() => setMetric(item.key)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${metric === item.key ? "bg-emerald-300 text-neutral-950" : "border border-white/[0.07] bg-white/[0.035] text-neutral-400"}`}>
            {item.icon}{item.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {loading ? <div className="h-56 animate-pulse rounded-2xl bg-white/[0.035]" /> : error ? <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-red-400/20 text-sm text-red-300">معرفناش نحمّل بيانات التقدم.</div> : <TrendLineChart points={chartPoints} valueLabel={metric} formatValue={format} />}
      </div>
    </section>
  );
}
