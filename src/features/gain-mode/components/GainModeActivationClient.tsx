"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save, ShieldCheck, Sparkles } from "lucide-react";
import type { UUID } from "@/types";
import { getArabicErrorMessage } from "@/lib/localization";
import { addBodyMeasurement, fetchBodyProgress, saveBodyGoal } from "@/features/body-progress/services/body-progress.service";
import { fetchGainModeProfile, saveGainModeProfile } from "../services/gain-mode.service";
import type { GainActivityLevel, GainAppetiteLevel, GainDietPattern } from "../types";

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function GainModeActivationClient({ userId, compact = false }: { userId: UUID; compact?: boolean }) {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [activityLevel, setActivityLevel] = useState<GainActivityLevel>("moderate");
  const [appetiteLevel, setAppetiteLevel] = useState<GainAppetiteLevel>("average");
  const [mealSizeDifficulty, setMealSizeDifficulty] = useState(false);
  const [dietPattern, setDietPattern] = useState<GainDietPattern>("mixed");
  const [intervalDays, setIntervalDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchGainModeProfile(userId), fetchBodyProgress(userId)]).then(([profile, body]) => {
      if (!active) return;
      if (profile) {
        setAge(String(profile.ageYears)); setActivityLevel(profile.activityLevel); setAppetiteLevel(profile.appetiteLevel); setMealSizeDifficulty(profile.mealSizeDifficulty); setDietPattern(profile.dietPattern);
      }
      if (body.latest) setWeight(String(body.latest.weightKg));
      if (body.goal) { setHeight(body.goal.heightCm ? String(body.goal.heightCm) : ""); setTargetWeight(body.goal.targetWeightKg ? String(body.goal.targetWeightKg) : ""); setIntervalDays(body.goal.weighInIntervalDays); }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [userId]);

  async function save() {
    setError(null); setMessage(null);
    const currentWeight = numberOrNull(weight); const target = numberOrNull(targetWeight); const heightCm = numberOrNull(height); const ageYears = numberOrNull(age);
    if (!currentWeight || !heightCm || !ageYears) { setError("الوزن الحالي والطول والسن مطلوبين لتفعيل Gain Mode."); return; }
    if (ageYears < 18 || ageYears > 80 || heightCm < 120 || heightCm > 220 || currentWeight < 20 || currentWeight > 300) { setError("راجع الأرقام. Gain Mode الحالي للبالغين 18+."); return; }
    if (target !== null && target <= currentWeight) { setError("خلي الوزن المستهدف أعلى من وزنك الحالي أو سيبيه فاضي."); return; }
    setBusy(true);
    try {
      const before = await fetchBodyProgress(userId);
      await Promise.all([
        saveBodyGoal(userId, { goalType: "gain_weight", targetWeightKg: target, heightCm, targetDate: null, weighInIntervalDays: intervalDays }),
        saveGainModeProfile(userId, { ageYears: Math.round(ageYears), activityLevel, appetiteLevel, mealSizeDifficulty, dietPattern, nutritionMode: "simple" }),
      ]);
      if (!before.latest || Math.abs(before.latest.weightKg - currentWeight) >= 0.05) await addBodyMeasurement(userId, { weightKg: currentWeight });
      setMessage("Gain Mode اتفعّل واتحفظ.");
      router.refresh();
    } catch (caught) { setError(getArabicErrorMessage(caught, "معرفناش نحفظ Gain Mode.")); }
    finally { setBusy(false); }
  }

  return (
    <div className={`space-y-4 ${compact ? "" : "pb-24 pt-4"}`}>
      {!compact ? (
        <section className="gc-hero-card rounded-[28px] p-5 sm:p-6">
          <p className="gc-eyebrow text-emerald-300">GOAL MODE · زيادة الوزن</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">خلي OVRLD يتابع الرحلة، مش الميزان بس.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">هنربط اتجاه الوزن، الشهية، التمرين والقوة. Simple Mode مش محتاج تسجيل كل لقمة.</p>
        </section>
      ) : null}

      <section className="gc-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-neutral-500">الوزن الحالي<input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className="gc-input mt-1" placeholder="50" /></label>
          <label className="text-xs font-bold text-neutral-500">الطول<input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" className="gc-input mt-1" placeholder="165" /></label>
          <label className="text-xs font-bold text-neutral-500">السن<input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" className="gc-input mt-1" placeholder="23" /></label>
          <label className="text-xs font-bold text-neutral-500">الوزن المستهدف<input value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} inputMode="decimal" className="gc-input mt-1" placeholder="اختياري" /></label>
        </div>
      </section>

      <section className="gc-card p-4 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <fieldset><legend className="text-xs font-bold text-neutral-500">النشاط اليومي</legend><div className="mt-2 grid grid-cols-3 gap-2">{([['light','هادي'],['moderate','متوسط'],['high','عالي']] as Array<[GainActivityLevel,string]>).map(([v,l]) => <button key={v} type="button" onClick={() => setActivityLevel(v)} className={`gc-choice-button ${activityLevel===v?'gc-choice-button-active':''}`}>{l}</button>)}</div></fieldset>
          <fieldset><legend className="text-xs font-bold text-neutral-500">الشهية</legend><div className="mt-2 grid grid-cols-3 gap-2">{([['low','ضعيفة'],['average','عادية'],['good','كويسة']] as Array<[GainAppetiteLevel,string]>).map(([v,l]) => <button key={v} type="button" onClick={() => setAppetiteLevel(v)} className={`gc-choice-button ${appetiteLevel===v?'gc-choice-button-active':''}`}>{l}</button>)}</div></fieldset>
          <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/[0.07] px-3.5 text-sm font-bold"><input type="checkbox" checked={mealSizeDifficulty} onChange={(e) => setMealSizeDifficulty(e.target.checked)} /><span>الوجبات الكبيرة بتشبعني بسرعة</span></label>
          <label className="text-xs font-bold text-neutral-500">نمط الأكل<select value={dietPattern} onChange={(e) => setDietPattern(e.target.value as GainDietPattern)} className="gc-input mt-1"><option value="mixed">متنوع</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="other">غير كده</option></select></label>
          <fieldset className="lg:col-span-2"><legend className="text-xs font-bold text-neutral-500">ميعاد قياس الوزن</legend><div className="mt-2 grid grid-cols-3 gap-2">{[3,7,14].map((d) => <button key={d} type="button" onClick={() => setIntervalDays(d)} className={`gc-choice-button ${intervalDays===d?'gc-choice-button-active':''}`}>{d} أيام {intervalDays===d?<Check className="ms-1 inline h-3 w-3"/>:null}</button>)}</div></fieldset>
        </div>
      </section>

      <div className="gc-onboarding-skip-note"><ShieldCheck className="h-5 w-5 shrink-0 text-amber-300" /><p className="text-xs leading-5 text-neutral-500">لو في فقدان وزن غير مقصود، أعراض صحية مستمرة، أو علاقة مقلقة مع الأكل، الأفضل تقييم طبي/تغذوي. OVRLD أداة متابعة مش تشخيص.</p></div>
      {error ? <p className="rounded-xl bg-red-400/10 p-3 text-sm font-semibold text-red-300">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-300">{message}</p> : null}
      <button type="button" disabled={busy} onClick={() => void save()} className="gc-primary-button w-full"><Save className="h-4 w-4" /> {busy ? "بنحفظ…" : "فعّل / حدّث Gain Mode"}</button>
    </div>
  );
}
