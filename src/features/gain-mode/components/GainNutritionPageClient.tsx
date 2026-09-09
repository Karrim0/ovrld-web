"use client";

import { useEffect, useState } from "react";
import type { UUID } from "@/types";
import { fetchGainModeSnapshot } from "../services/gain-mode.service";
import type { GainModeSnapshot } from "../types";
import { GainModeActivationClient } from "./GainModeActivationClient";
import { GainNutritionPanel } from "./GainNutritionPanel";

export function GainNutritionPageClient({ userId }: { userId: UUID }) {
  const [snapshot, setSnapshot] = useState<GainModeSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetchGainModeSnapshot(userId)
      .then((next) => { if (active) setSnapshot(next); })
      .catch(() => { if (active) setSnapshot(null); });
    return () => { active = false; };
  }, [userId]);

  if (snapshot === undefined) return <div className="mt-4 h-64 animate-pulse rounded-[20px] bg-[var(--surface-elevated)]" />;
  if (!snapshot) return <GainModeActivationClient userId={userId} />;

  return <div className="pb-24 pt-3"><GainNutritionPanel userId={userId} snapshot={snapshot} /></div>;
}
