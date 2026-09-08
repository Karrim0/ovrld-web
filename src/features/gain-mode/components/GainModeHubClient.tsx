"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpLeft,
  Dumbbell,
  Scale,
  Settings2,
  Sparkles,
  Target,
  Utensils,
} from "lucide-react";
import type { UUID } from "@/types";
import { fetchGainModeSnapshot } from "../services/gain-mode.service";
import type { GainModeSnapshot } from "../types";
import { GainModeActivationClient } from "./GainModeActivationClient";

function kg(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} كجم`;
}

function appetiteLabel(value: GainModeSnapshot["profile"]["appetiteLevel"]) {
  if (value === "low") return "شهية ضعيفة";
  if (value === "good") return "شهية كويسة";
  return "شهية عادية";
}

export function GainModeHubClient({ userId }: { userId: UUID }) {
  const [snapshot, setSnapshot] = useState<GainModeSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetchGainModeSnapshot(userId)
      .then((next) => { if (active) setSnapshot(next); })
      .catch(() => { if (active) setSnapshot(null); });
    return () => { active = false; };
  }, [userId]);

  if (snapshot === undefined) {
    return <div className="mt-4 h-56 animate-pulse rounded-[28px] border border-white/[0.06] bg-white/[0.035]" />;
  }

  if (!snapshot) return <GainModeActivationClient userId={userId} />;

  const latest = snapshot.body.latest;
  const start = snapshot.body.start;
  const target = snapshot.body.goal?.targetWeightKg ?? null;
  const delta = latest && start ? latest.weightKg - start.weightKg : null;

  return (
    <div className="space-y-4 pb-24 pt-4">
      <section className="gc-body-hero relative overflow-hidden rounded-[30px] p-5 sm:p-7">
        <div className="absolute -left-12 -top-16 h-44 w-44 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-300/12 text-emerald-300"><Sparkles className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><p className="gc-eyebrow text-emerald-300">GAIN MODE</p><span className="gc-chip">زيادة الوزن للبنات</span></div>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">رحلتك في مكان واحد</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">OVRLD بيربط اتجاه الوزن بأدائك في الجيم والتزامك، ويغيّر الخطوة الجاية من الداتا بدل التخمين.</p>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <div className="gc-glass-stat"><span>البداية</span><strong>{kg(start?.weightKg)}</strong></div>
          <div className="gc-glass-stat"><span>دلوقتي</span><strong>{kg(latest?.weightKg)}</strong><small>{delta == null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} كجم`}</small></div>
          <div className="gc-glass-stat"><span>الهدف</span><strong>{kg(target)}</strong></div>
        </div>
      </section>

      <section className="gc-card overflow-hidden p-0">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-300/10 text-indigo-300"><Target className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">مراجعة الـprocess</p>
            <h3 className="mt-1 text-xl font-black">{snapshot.review.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-neutral-500">{snapshot.review.detail}</p>
          </div>
        </div>
        <div className="border-t border-white/[0.055] p-3.5 sm:p-4">
          <Link href={snapshot.review.href} className="gc-primary-button w-full">{snapshot.review.cta}<ArrowUpLeft className="h-4 w-4" /></Link>
        </div>
      </section>

      <section className="gc-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-300/10 text-amber-300"><Utensils className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">الأكل · Simple Mode</p>
            <h3 className="mt-1 text-xl font-black">{snapshot.primaryNutritionAction}</h3>
            <p className="mt-1.5 text-sm leading-6 text-neutral-500">{snapshot.supportDetail}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="gc-glass-stat"><span>مرجع البروتين</span><strong>{snapshot.proteinTargetGrams ? `${snapshot.proteinTargetGrams} جم/يوم` : "—"}</strong><small>≈ 1.6 جم/كجم كبداية</small></div>
          <div className="gc-glass-stat"><span>الشهية</span><strong>{appetiteLabel(snapshot.profile.appetiteLevel)}</strong><small>{snapshot.profile.mealSizeDifficulty ? "الوجبات الكبيرة صعبة" : "من غير مشكلة حجم وجبة"}</small></div>
        </div>
        {snapshot.dietSupportDetail ? <p className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs leading-5 text-neutral-500">{snapshot.dietSupportDetail}</p> : null}
        <p className="mt-3 text-[10px] leading-5 text-neutral-600">ده مرجع متابعة عام، مش وصفة علاجية أو نظام غذائي طبي. Simple Mode متعمد ما يحولش OVRLD لعداد سعرات.</p>
      </section>

      <section className="gc-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-300/10 text-sky-300"><Dumbbell className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="gc-eyebrow">التمرين جزء من الهدف</p><h3 className="mt-1 text-lg font-black">مش بنطارد رقم الميزان لوحده</h3><p className="mt-1 text-sm leading-6 text-neutral-500">سجّلي الأوزان والعدات. مع الوقت هنقارن زيادة الوزن بتحسن القوة والأداء عشان الصورة تبقى أذكى.</p></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Link href="/workout/today" className="gc-secondary-button">افتحي تمرينك<ArrowUpLeft className="h-4 w-4" /></Link><Link href="/progress/body" className="gc-secondary-button"><Scale className="h-4 w-4" />اتجاه الوزن</Link></div>
      </section>

      <details className="gc-card p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.04]"><Settings2 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block">إعدادات Gain Mode</strong><span className="block text-xs text-neutral-500">الوزن المستهدف، الطول، الشهية ومواعيد القياس</span></span><span className="text-xs font-bold text-indigo-300">تعديل</span></summary>
        <div className="mt-4 border-t border-white/[0.06] pt-4"><GainModeActivationClient userId={userId} compact /></div>
      </details>
    </div>
  );
}
