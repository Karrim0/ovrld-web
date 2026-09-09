import Link from "next/link";
import { ArrowUpLeft, BarChart3, Dumbbell, Rows3, TrendingUp } from "lucide-react";
import type { GainTrainingSummary } from "../types";

function adherenceText(value: number | null) {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

export function GainTrainingCard({ training }: { training: GainTrainingSummary }) {
  const toneClass = training.state === "attention" || training.state === "setup" ? "gc-gain-training-attention" : training.state === "on_track" ? "gc-gain-training-good" : "";
  return (
    <section className={`gc-gain-training ${toneClass}`}>
      <div className="flex items-center gap-3">
        <span className="gc-gain-training-icon"><Dumbbell className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="gc-eyebrow">التمرين</p>
          <h3 className="mt-0.5 text-sm font-black">{training.title}</h3>
        </div>
        <Link href={training.href} className="gc-compact-link">{training.cta}<ArrowUpLeft className="h-3.5 w-3.5" /></Link>
      </div>

      <div className="gc-gain-training-grid mt-3">
        <div><Rows3 className="h-3.5 w-3.5" /><span>الخطة</span><strong>{training.trainingDays} أيام</strong><small>{training.plannedSets} سِت</small></div>
        <div><Dumbbell className="h-3.5 w-3.5" /><span>الأسبوع</span><strong>{training.workoutsCompleted}/{training.workoutsScheduled}</strong><small>{adherenceText(training.adherence)}</small></div>
        <div><TrendingUp className="h-3.5 w-3.5" /><span>بيتحسن</span><strong>{training.improvingExercises}</strong><small>{training.trackedExercises} متابع</small></div>
        <div><BarChart3 className="h-3.5 w-3.5" /><span>محتاج عين</span><strong>{training.plateauExercises + training.slippingExercises}</strong><small>أداء</small></div>
      </div>
    </section>
  );
}
