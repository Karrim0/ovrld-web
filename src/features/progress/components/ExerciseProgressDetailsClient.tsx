"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Trophy } from "lucide-react";
import { formatWorkoutDate } from "@/lib/dates";
import { formatDateArEg, muscleLabelAr, translateExerciseName } from "@/lib/localization";
import { formatWeight } from "@/lib/utils/format";
import type { UUID } from "@/types";
import { fetchExerciseProgressDetails, type ExerciseProgressDetails } from "../services/progress.service";
import { TrendLineChart } from "./TrendLineChart";

type Metric = "e1rm" | "load" | "volume";

export function ExerciseProgressDetailsClient({ userId, exerciseId }: { userId: UUID; exerciseId: UUID }) {
  const [details, setDetails] = useState<ExerciseProgressDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>("e1rm");

  useEffect(() => {
    fetchExerciseProgressDetails(userId, exerciseId).then(setDetails).finally(() => setIsLoading(false));
  }, [exerciseId, userId]);

  const chartPoints = useMemo(() => (details?.sessions ?? []).map((point) => ({
    label: formatDateArEg(point.date, { month: "short", day: "numeric" }),
    value: metric === "e1rm" ? point.estimatedOneRepMaxKg : metric === "load" ? point.maxWeightKg : point.volume,
  })), [details, metric]);

  if (isLoading) return <div className="space-y-3"><div className="h-40 animate-pulse rounded-[28px] bg-neutral-200 dark:bg-neutral-800" /><div className="h-64 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" /></div>;
  if (!details?.summary) return <p className="rounded-2xl border p-6 text-center text-sm text-neutral-500">مفيش سجل مكتمل للتمرين ده.</p>;

  const recentSessions = [...details.sessions].reverse().slice(0, 12);

  return (
    <div className="space-y-5 pb-24">
      <section className="gc-hero-card rounded-[30px] p-5">
        <p className="text-sm capitalize opacity-65">{muscleLabelAr(details.summary.primaryMuscle)}</p>
        <h2 className="mt-1 text-2xl font-bold">{translateExerciseName(details.summary.exerciseName)}</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 text-center min-[360px]:grid-cols-3">
          <div><strong className="block text-lg">{formatWeight(details.summary.maxWeightKg)}</strong><span className="text-xs opacity-60">أعلى وزن</span></div>
          <div><strong className="block text-lg">{formatWeight(details.summary.estimatedOneRepMaxKg)}</strong><span className="text-xs opacity-60">أقصى عدة متوقعة</span></div>
          <div><strong className="block text-lg">{details.summary.sessionCount}</strong><span className="text-xs opacity-60">التمرينات</span></div>
        </div>
      </section>

      <section className="rounded-[26px] border bg-white p-4 dark:bg-neutral-950">
        <div><h3 className="font-bold">منحنى التقدم</h3><p className="text-sm text-neutral-500">قارن القوة والوزن وحجم الشغل بين التمرينات.</p></div>
        <div className="mt-4 flex rounded-xl border p-1">
          {([['e1rm', 'أقصى عدة متوقعة'], ['load', 'أعلى وزن'], ['volume', 'حجم التمرين']] as Array<[Metric, string]>).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setMetric(key)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold ${metric === key ? "bg-emerald-300 text-neutral-950" : "text-neutral-500"}`}>{label}</button>
          ))}
        </div>
        <div className="mt-4"><TrendLineChart points={chartPoints} valueLabel={metric} formatValue={(value) => formatWeight(value)} /></div>
      </section>

      <section className="rounded-[26px] border bg-white p-4 dark:bg-neutral-950">
        <div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" /><h3 className="font-bold">أفضل عدات مع كل وزن</h3></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {details.bestRepsByWeight.slice(0, 12).map((item) => <div key={item.weightKg} className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900"><strong className="block">{formatWeight(item.weightKg)}</strong><span className="text-sm text-neutral-500">{item.reps} عدة</span></div>)}
        </div>
      </section>

      <section className="rounded-[26px] border bg-white p-4 dark:bg-neutral-950">
        <h3 className="font-bold">سجل تمرينة بتمرينة</h3>
        <div className="mt-3 space-y-3">
          {recentSessions.map((session) => (
            <article key={session.sessionId} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{formatWorkoutDate(session.date)}</p><p className="text-xs text-neutral-500">حجم التمرين {formatWeight(session.volume)} · أقصى عدة متوقعة {formatWeight(session.estimatedOneRepMaxKg)}</p></div><Link href={`/workout/${session.sessionId}`} className="rounded-lg p-2" aria-label="افتح التمرينة"><ExternalLink className="h-4 w-4" /></Link></div>
              <div className="mt-3 flex flex-wrap gap-2">{session.sets.map((set) => <span key={set.id} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs dark:bg-neutral-800">{set.weightKg ?? "—"} كجم × {set.reps ?? "—"}{set.isPersonalRecord ? " · رقم شخصي" : ""}</span>)}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
