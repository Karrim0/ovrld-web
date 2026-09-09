"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, CheckCircle2, Clock3, Gauge, Sparkles } from "lucide-react";
import type { UUID } from "@/types";
import { fetchGainReviewSnapshot } from "../services/review.service";
import type { GainReviewSnapshot } from "../types";

function iconFor(state: GainReviewSnapshot["decision"]["state"]) {
  if (state === "suggest") return <Gauge className="h-4 w-4" />;
  if (state === "observe") return <Clock3 className="h-4 w-4" />;
  if (state === "on_track") return <CheckCircle2 className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
}

export function GainReviewPreview({ userId }: { userId: UUID }) {
  const [review, setReview] = useState<GainReviewSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetchGainReviewSnapshot(userId)
      .then((next) => { if (active) setReview(next); })
      .catch(() => { if (active) setReview(null); });
    return () => { active = false; };
  }, [userId]);

  if (review === undefined) return <div className="h-28 animate-pulse rounded-[16px] bg-[var(--surface-elevated)]" />;
  if (!review) return null;

  return (
    <section className={`gc-gain-review gc-review-${review.decision.state}`}>
      <div className="flex items-start gap-3">
        <span className="gc-review-icon">{iconFor(review.decision.state)}</span>
        <div className="min-w-0 flex-1">
          <p className="gc-eyebrow">مراجعة الأسبوع</p>
          <h3 className="mt-0.5 text-sm font-black">{review.decision.title}</h3>
          <p className="mt-1 text-xs leading-5 text-neutral-500">{review.decision.detail}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 border-t border-[var(--border)] pt-3 text-center">
        <div><span className="gc-mini-label">أيام الأكل</span><strong className="block text-sm">{review.weekly.nutrition.daysLogged}/7</strong></div>
        <div className="border-x border-[var(--border)]"><span className="gc-mini-label">التمرين</span><strong className="block text-sm">{review.weekly.workoutsCompleted}{review.weekly.workoutsScheduled === null ? "" : `/${review.weekly.workoutsScheduled}`}</strong></div>
        <div><span className="gc-mini-label">الوزن</span><strong className="block text-sm">{review.weekly.weightChangeKg === null ? "—" : `${review.weekly.weightChangeKg >= 0 ? "+" : ""}${review.weekly.weightChangeKg.toFixed(2)}`}</strong></div>
      </div>
      <Link href="/progress/gain/review" className="gc-review-action mt-3">راجع الأسبوع<ArrowUpLeft className="h-4 w-4" /></Link>
    </section>
  );
}
