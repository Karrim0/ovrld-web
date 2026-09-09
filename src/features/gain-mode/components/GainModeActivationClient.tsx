"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { UUID } from "@/types";
import { getArabicErrorMessage } from "@/lib/localization";
import { addBodyMeasurement, fetchBodyProgress, saveBodyGoal } from "@/features/body-progress/services/body-progress.service";
import { fetchGainModeProfile, saveGainModeProfile } from "../services/gain-mode.service";
import type { GainActivityLevel, GainAppetiteLevel, GainDietPattern, GainEquationSex, GainPhysiqueFocus } from "../types";

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function GainModeActivationClient({ userId, compact = false }: { userId: UUID; compact?: boolean }) {
  const router = useRouter();
  const { language } = useLanguage();
  const ar = language === "ar";
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [equationSex, setEquationSex] = useState<GainEquationSex | null>(null);
  const [activityLevel, setActivityLevel] = useState<GainActivityLevel>("moderate");
  const [physiqueFocus, setPhysiqueFocus] = useState<GainPhysiqueFocus>("balanced");
  const [supportName, setSupportName] = useState("");
  const [supportNote, setSupportNote] = useState("");
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
        setAge(String(profile.ageYears));
        setEquationSex(profile.equationSex);
        setActivityLevel(profile.activityLevel);
        setPhysiqueFocus(profile.physiqueFocus);
        setSupportName(profile.supportName ?? "");
        setSupportNote(profile.supportNote ?? "");
        setAppetiteLevel(profile.appetiteLevel);
        setMealSizeDifficulty(profile.mealSizeDifficulty);
        setDietPattern(profile.dietPattern);
      }
      if (body.latest) setWeight(String(body.latest.weightKg));
      if (body.goal) {
        setHeight(body.goal.heightCm ? String(body.goal.heightCm) : "");
        setTargetWeight(body.goal.targetWeightKg ? String(body.goal.targetWeightKg) : "");
        setIntervalDays(body.goal.weighInIntervalDays);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [userId]);

  async function save() {
    setError(null);
    setMessage(null);
    const currentWeight = numberOrNull(weight);
    const target = numberOrNull(targetWeight);
    const heightCm = numberOrNull(height);
    const ageYears = numberOrNull(age);
    if (!currentWeight || !heightCm || !ageYears) {
      setError(ar ? "الوزن الحالي والطول والسن مطلوبين لتفعيل Gain Mode." : "Current weight, height and age are required for Gain Mode.");
      return;
    }
    if (!equationSex) {
      setError(ar ? "اختار أنثى أو ذكر عشان نحسب تقدير البداية بشكل صحيح." : "Choose female or male so the starting estimate can be calculated correctly.");
      return;
    }
    if (ageYears < 18 || ageYears > 80 || heightCm < 120 || heightCm > 220 || currentWeight < 20 || currentWeight > 300) {
      setError(ar ? "راجع الأرقام. Gain Mode الحالي للبالغين 18+." : "Check your numbers. Gain Mode is currently for adults 18+.");
      return;
    }
    if (target !== null && target <= currentWeight) {
      setError(ar ? "خلي الوزن المستهدف أعلى من الوزن الحالي أو سيبه فاضي." : "Set a target above your current weight, or leave it blank.");
      return;
    }

    setBusy(true);
    try {
      const before = await fetchBodyProgress(userId);
      await Promise.all([
        saveBodyGoal(userId, { goalType: "gain_weight", targetWeightKg: target, heightCm, targetDate: null, weighInIntervalDays: intervalDays }),
        saveGainModeProfile(userId, { ageYears: Math.round(ageYears), activityLevel, appetiteLevel, mealSizeDifficulty, dietPattern, equationSex, physiqueFocus, supportName, supportNote, nutritionMode: "simple" }),
      ]);
      if (!before.latest || Math.abs(before.latest.weightKg - currentWeight) >= 0.05) await addBodyMeasurement(userId, { weightKg: currentWeight });
      setMessage(ar ? "Gain Mode اتحفظ." : "Gain Mode saved.");
      router.refresh();
    } catch (caught) {
      setError(ar ? getArabicErrorMessage(caught, "معرفناش نحفظ Gain Mode.") : "We could not save Gain Mode. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const sexOptions: Array<[GainEquationSex, string]> = [
    ["female", ar ? "أنثى" : "Female"],
    ["male", ar ? "ذكر" : "Male"],
  ];
  const activityOptions: Array<[GainActivityLevel, string]> = [
    ["light", ar ? "هادي" : "Light"],
    ["moderate", ar ? "متوسط" : "Moderate"],
    ["high", ar ? "عالي" : "High"],
  ];
  const focusOptions: Array<[GainPhysiqueFocus, string]> = [
    ["balanced", ar ? "متوازن" : "Balanced"],
    ["lower_body", "Lower body"],
    ["glutes_legs", "Glutes + legs"],
  ];
  const appetiteOptions: Array<[GainAppetiteLevel, string]> = [
    ["low", ar ? "ضعيفة" : "Low"],
    ["average", ar ? "عادية" : "Average"],
    ["good", ar ? "كويسة" : "Good"],
  ];

  return (
    <div data-no-localize className={`space-y-3 ${compact ? "" : "pb-24 pt-3"}`}>
      {!compact ? <div><p className="gc-eyebrow">Gain Mode</p><h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">{ar ? "إعدادات الزيادة" : "Gain settings"}</h2></div> : null}

      <section className="gc-list-panel overflow-hidden">
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-neutral-500">{ar ? "الوزن الحالي" : "Current weight"}<input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className="gc-input mt-1" placeholder="50" /></label>
          <label className="text-xs font-bold text-neutral-500">{ar ? "الطول" : "Height"}<input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" className="gc-input mt-1" placeholder="165" /></label>
          <label className="text-xs font-bold text-neutral-500">{ar ? "السن" : "Age"}<input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" className="gc-input mt-1" placeholder="23" /></label>
          <label className="text-xs font-bold text-neutral-500">{ar ? "الهدف" : "Target weight"}<input value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} inputMode="decimal" className="gc-input mt-1" placeholder={ar ? "اختياري" : "Optional"} /></label>
        </div>
      </section>

      <section className="gc-list-panel overflow-hidden p-3">
        <div className="grid gap-4 lg:grid-cols-2">
          <fieldset><legend className="text-xs font-bold text-neutral-500">{ar ? "معادلة السعرات" : "Calorie equation"}</legend><div className="mt-2 grid grid-cols-2 gap-2">{sexOptions.map(([value,label]) => <button key={value} type="button" onClick={() => setEquationSex(value)} className={`gc-choice-button ${equationSex===value?'gc-choice-button-active':''}`}>{label}</button>)}</div><p className="mt-1 text-[10px] text-neutral-600">{ar ? "للتقدير الأولي للسعرات فقط." : "Used only for the starting calorie estimate."}</p></fieldset>
          <fieldset><legend className="text-xs font-bold text-neutral-500">{ar ? "النشاط اليومي" : "Daily activity"}</legend><div className="mt-2 grid grid-cols-3 gap-2">{activityOptions.map(([value,label]) => <button key={value} type="button" onClick={() => setActivityLevel(value)} className={`gc-choice-button ${activityLevel===value?'gc-choice-button-active':''}`}>{label}</button>)}</div></fieldset>
          <fieldset className="lg:col-span-2"><legend className="text-xs font-bold text-neutral-500">{ar ? "تركيز الشكل" : "Physique focus"}</legend><div className="mt-2 grid grid-cols-3 gap-2">{focusOptions.map(([value,label]) => <button key={value} type="button" onClick={() => setPhysiqueFocus(value)} className={`gc-choice-button ${physiqueFocus===value?'gc-choice-button-active':''}`}>{label}</button>)}</div><p className="mt-1 text-[10px] text-neutral-600">{ar ? "بيغيّر تحليل الجدول فقط؛ مش بيغيّر السعرات لوحده." : "This changes plan analysis only; it does not change calories by itself."}</p></fieldset>
          <fieldset><legend className="text-xs font-bold text-neutral-500">{ar ? "الشهية" : "Appetite"}</legend><div className="mt-2 grid grid-cols-3 gap-2">{appetiteOptions.map(([value,label]) => <button key={value} type="button" onClick={() => setAppetiteLevel(value)} className={`gc-choice-button ${appetiteLevel===value?'gc-choice-button-active':''}`}>{label}</button>)}</div></fieldset>
          <label className="text-xs font-bold text-neutral-500">{ar ? "نمط الأكل" : "Diet pattern"}<select value={dietPattern} onChange={(e) => setDietPattern(e.target.value as GainDietPattern)} className="gc-input mt-1"><option value="mixed">{ar ? "متنوع" : "Mixed"}</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="other">{ar ? "غير كده" : "Other"}</option></select></label>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/[0.07] px-3 text-sm font-bold lg:col-span-2"><input type="checkbox" checked={mealSizeDifficulty} onChange={(e) => setMealSizeDifficulty(e.target.checked)} /><span>{ar ? "الوجبات الكبيرة بتشبعني بسرعة" : "Large meals fill me up quickly"}</span></label>
          <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <p className="text-xs font-bold text-neutral-500">{ar ? "رسالة دعم اختيارية" : "Optional support note"}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr]">
              <input value={supportName} onChange={(e) => setSupportName(e.target.value)} maxLength={40} className="gc-input" placeholder={ar ? "من: كريم" : "From: Kareem"} />
              <input value={supportNote} onChange={(e) => setSupportNote(e.target.value)} maxLength={240} className="gc-input" placeholder={ar ? "مثال: أنا شايف تعبك وتطورك، كملي واحدة واحدة ❤️" : "Example: I see your effort and progress. Keep going one step at a time ❤️"} />
            </div>
            <p className="mt-1 text-[10px] text-neutral-600">{ar ? "بتظهر كرسالة خاصة جوه Gain Mode. سيبها فاضية لو مش محتاجها." : "Shown privately inside Gain Mode. Leave it blank if you do not need it."}</p>
          </div>
          <fieldset className="lg:col-span-2"><legend className="text-xs font-bold text-neutral-500">{ar ? "ميعاد قياس الوزن" : "Weigh-in interval"}</legend><div className="mt-2 grid grid-cols-3 gap-2">{[3,7,14].map((days) => <button key={days} type="button" onClick={() => setIntervalDays(days)} className={`gc-choice-button ${intervalDays===days?'gc-choice-button-active':''}`}>{days} {ar ? "أيام" : "days"} {intervalDays===days?<Check className="ms-1 inline h-3 w-3"/>:null}</button>)}</div></fieldset>
        </div>
      </section>

      {!compact ? <div className="gc-onboarding-skip-note"><ShieldCheck className="h-5 w-5 shrink-0 text-amber-300" /><p className="text-xs leading-5 text-neutral-500">{ar ? "OVRLD أداة متابعة، مش تشخيص أو بديل لمختص." : "OVRLD is a tracking tool, not a diagnosis or a replacement for a professional."}</p></div> : null}
      {error ? <p className="rounded-xl bg-red-400/10 p-3 text-sm font-semibold text-red-300">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-300">{message}</p> : null}
      <button type="button" disabled={busy} onClick={() => void save()} className="gc-primary-button w-full"><Save className="h-4 w-4" /> {busy ? (ar ? "بنحفظ…" : "Saving…") : (ar ? "احفظ" : "Save")}</button>
    </div>
  );
}
