"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { formatDuration } from "@/lib/utils/format";
import { getSessionElapsedSeconds, isStaleActiveWorkout } from "../utils/session-time";

interface SessionElapsedTimeProps {
  startedAt: string;
  completedAt?: string | null;
  compact?: boolean;
}

export function SessionElapsedTime({ startedAt, completedAt, compact = false }: SessionElapsedTimeProps) {
  const fixedEnd = useMemo(() => completedAt ? new Date(completedAt).getTime() : null, [completedAt]);
  const stale = fixedEnd === null && isStaleActiveWorkout(startedAt);
  const [seconds, setSeconds] = useState(() => fixedEnd === null ? 0 : getSessionElapsedSeconds(startedAt, fixedEnd));

  useEffect(() => {
    if (stale) return;

    const tick = () => {
      setSeconds(getSessionElapsedSeconds(startedAt, fixedEnd ?? undefined));
    };

    const frame = window.requestAnimationFrame(tick);
    if (fixedEnd !== null) {
      return () => window.cancelAnimationFrame(frame);
    }

    const interval = window.setInterval(tick, 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [fixedEnd, stale, startedAt]);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums">
        <Clock3 className="h-4 w-4" /> {stale ? <span className="font-sans text-[11px]">جلسة قديمة</span> : formatDuration(seconds)}
      </span>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">وقت التمرينة</p>
      <p className="mt-1 inline-flex items-center gap-2 font-mono text-xl font-bold tabular-nums">
        <Clock3 className="h-5 w-5 text-emerald-500" /> {stale ? <span className="font-sans text-sm">جلسة قديمة</span> : formatDuration(seconds)}
      </p>
    </div>
  );
}
