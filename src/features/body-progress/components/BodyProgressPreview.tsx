"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, BellRing, Scale, Target } from "lucide-react";
import type { UUID } from "@/types";
import { fetchBodyProgress } from "../services/body-progress.service";
import type { BodyProgressSnapshot } from "../types";

function formatWeight(value: number | null) {
  if (value === null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} كجم`;
}

export function BodyProgressPreview({ userId }: { userId: UUID }) {
  const [data, setData] = useState<BodyProgressSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [weighInDue, setWeighInDue] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchBodyProgress(userId)
      .then((next) => {
        if (!active) return;
        setData(next);
        setWeighInDue(Boolean(next.nextWeighInAt && new Date(next.nextWeighInAt).getTime() <= Date.now()));
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [userId]);

  if (failed) return null;
  if (!data) return <div className="h-24 animate-pulse rounded-[22px] border border-white/[0.06] bg-white/[0.035]" />;

  if (!data.goal && !data.latest) {
    return (
      <Link href="/progress/body" className="gc-quiet-link">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300"><Scale className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><strong className="block text-sm">متابعة الوزن اختيارية</strong><span className="block text-xs text-neutral-500">فعّلها بس لو هي جزء من هدفك.</span></span>
        <ArrowUpLeft className="h-4 w-4 text-neutral-600" />
      </Link>
    );
  }

  const delta = data.latest && data.previous ? data.latest.weightKg - data.previous.weightKg : null;

  return (
    <Link href="/progress/body" className={`gc-card-interactive block overflow-hidden p-0 ${weighInDue ? "gc-body-checkin-due" : ""}`}>
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${weighInDue ? "bg-amber-300/12 text-amber-300" : "bg-emerald-300/10 text-emerald-300"}`}>
          {weighInDue ? <BellRing className="h-6 w-6" /> : <Scale className="h-6 w-6" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="gc-eyebrow">{weighInDue ? "معاد قياس جديد" : "متابعة الجسم · اختيارية"}</span>
          {data.latest ? (
            <><span className="mt-1 block text-xl font-black">{formatWeight(data.latest.weightKg)}</span><span className="mt-1 block text-xs text-neutral-500">{weighInDue ? "سجّل قراءة سريعة وخلي الاتجاه يتحدث." : delta === null ? "سجّل قراءة تانية عشان نشوف الاتجاه" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} كجم من آخر قراءة`}</span></>
          ) : (
            <><span className="mt-1 block text-lg font-bold">سجّل نقطة البداية</span><span className="mt-1 block text-xs text-neutral-500">الهدف محفوظ، ناقص أول قراءة بس.</span></>
          )}
        </span>
        <span className="shrink-0 text-end">
          {weighInDue ? <span className="gc-chip text-amber-300">سجّل دلوقتي</span> : data.goal?.targetWeightKg ? <><Target className="ms-auto h-4 w-4 text-emerald-300" /><span className="mt-1 block text-xs font-bold">{formatWeight(data.goal.targetWeightKg)}</span></> : <ArrowUpLeft className="h-5 w-5 text-neutral-500" />}
        </span>
      </div>
    </Link>
  );
}
