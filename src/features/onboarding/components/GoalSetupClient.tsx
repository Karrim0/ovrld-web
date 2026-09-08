"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Dumbbell,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { UUID } from "@/types";
import { getArabicErrorMessage } from "@/lib/localization";
import {
  addBodyMeasurement,
  fetchBodyProgress,
  saveBodyGoal,
} from "@/features/body-progress/services/body-progress.service";
import {
  completeOnboarding,
  saveGainModeProfile,
} from "@/features/gain-mode/services/gain-mode.service";
import type {
  GainActivityLevel,
  GainAppetiteLevel,
  GainDietPattern,
} from "@/features/gain-mode/types";

type SetupChoice = "training_only" | "gain_mode";

function parsePositive(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function GoalSetupClient({ userId }: { userId: UUID }) {
  const router = useRouter();
  const [choice, setChoice] = useState<SetupChoice>("training_only");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [intervalDays, setIntervalDays] = useState(7);
  const [activityLevel, setActivityLevel] = useState<GainActivityLevel>("moderate");
  const [appetiteLevel, setAppetiteLevel] = useState<GainAppetiteLevel>("average");
  const [mealSizeDifficulty, setMealSizeDifficulty] = useState(false);
  const [dietPattern, setDietPattern] = useState<GainDietPattern>("mixed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gainMode = choice === "gain_mode";

  function nudgeWeight(delta: number) {
    const current = parsePositive(weight) ?? 50;
    setWeight(formatNumber(Math.max(20, Math.round((current + delta) * 10) / 10)));
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
  }

  async function continueSetup() {
    setError(null);
    setBusy(true);

    try {
      if (!gainMode) {
        await completeOnboarding(userId);
        router.replace("/split/personal");
        router.refresh();
        return;
      }

      const currentWeight = parsePositive(weight);
      const heightCm = parsePositive(height);
      const ageYears = parsePositive(age);
      const target = parsePositive(targetWeight);

      if (!currentWeight || !heightCm || !ageYears) {
        setError("في Gain Mode محتاجين الوزن الحالي والطول والسن عشان نبني نقطة بداية مفيدة.");
        return;
      }
      if (currentWeight < 20 || currentWeight > 300 || heightCm < 120 || heightCm > 220 || ageYears < 18 || ageYears > 80) {
        setError("راجع الوزن والطول والسن. Gain Mode الحالي معمول للبالغين 18+.");
        return;
      }
      if (target !== null && target <= currentWeight) {
        setError("بما إن الهدف زيادة وزن، خلي الوزن المستهدف أكبر من وزنك الحالي أو سيبيه فاضي دلوقتي.");
        return;
      }

      await Promise.all([
        saveBodyGoal(userId, {
          goalType: "gain_weight",
          targetWeightKg: target,
          heightCm,
          targetDate: null,
          weighInIntervalDays: intervalDays,
        }),
        saveGainModeProfile(userId, {
          ageYears: Math.round(ageYears),
          activityLevel,
          appetiteLevel,
          mealSizeDifficulty,
          dietPattern,
          nutritionMode: "simple",
        }),
      ]);

      const existingBody = await fetchBodyProgress(userId);
      if (!existingBody.latest || Math.abs(existingBody.latest.weightKg - currentWeight) >= 0.05) {
        await addBodyMeasurement(userId, { weightKg: currentWeight });
      }
      await completeOnboarding(userId);

      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([16, 35, 16]);
      router.replace("/split/personal");
      router.refresh();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نكمّل إعداد البداية دلوقتي. جرّب تاني."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="gc-onboarding-progress" aria-label="خطوات البداية">
        <span className="gc-onboarding-step gc-onboarding-step-active"><strong>1</strong><small>هدفك</small></span>
        <span className="gc-onboarding-progress-line" />
        <span className="gc-onboarding-step"><strong>2</strong><small>جدولك</small></span>
        <span className="gc-onboarding-progress-line" />
        <span className="gc-onboarding-step"><strong>3</strong><small>ابدأ</small></span>
      </div>

      <section>
        <p className="gc-eyebrow">اختار التجربة اللي تناسبك</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.055em]">OVRLD يفضل Gym Tracker. وإنت تختار الـMode.</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          النسخة العادية كاملة لو عايز جدول وتسجيل وتقدم. ولو هدفك زيادة الوزن، Gain Mode يضيف رحلة متابعة مخصصة فوق نفس التمرين.
        </p>
      </section>

      <div className="grid gap-3" role="radiogroup" aria-label="اختار طريقة استخدام OVRLD">
        <button
          type="button"
          role="radio"
          aria-checked={!gainMode}
          onClick={() => { setChoice("training_only"); setError(null); }}
          className={`gc-goal-choice ${!gainMode ? "gc-goal-choice-active" : ""}`}
        >
          <span className="gc-goal-choice-icon"><Dumbbell className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1 text-start"><strong className="block text-sm">OVRLD العادي</strong><span className="mt-0.5 block text-xs leading-5 text-neutral-500">جدولك، Gym Mode، الأوزان والعدات، والتقدم. من غير هدف جسم إجباري.</span></span>
          <span className="gc-goal-radio">{!gainMode ? <Check className="h-3.5 w-3.5" /> : null}</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={gainMode}
          onClick={() => { setChoice("gain_mode"); setError(null); }}
          className={`gc-goal-choice relative overflow-hidden ${gainMode ? "gc-goal-choice-active" : ""}`}
        >
          <span className="absolute end-3 top-2 rounded-full bg-emerald-300/12 px-2 py-1 text-[9px] font-black text-emerald-300">GOAL MODE · NEW</span>
          <span className="gc-goal-choice-icon"><TrendingUp className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1 pe-16 text-start"><strong className="block text-sm">Gain Mode · زيادة الوزن للبنات</strong><span className="mt-0.5 block text-xs leading-5 text-neutral-500">الوزن + التمرين + الشهية + مراجعة دورية، من غير ما نحول التطبيق كله لبرنامج أكل.</span></span>
          <span className="gc-goal-radio">{gainMode ? <Check className="h-3.5 w-3.5" /> : null}</span>
        </button>
      </div>

      {gainMode ? (
        <>
          <section className="gc-card overflow-hidden">
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="gc-eyebrow">Gain Mode · نقطة البداية</p><h2 className="mt-1 text-xl font-bold">هنحتاج كام حاجة بس عشان نتابع صح</h2><p className="mt-1 text-xs leading-5 text-neutral-500">مش بنشخّص ولا بنوصف علاج. البيانات دي عشان نخصص المتابعة داخل التطبيق.</p></div>
                <Sparkles className="h-5 w-5 text-emerald-300" />
              </div>

              <div className="mt-5 flex items-center justify-center gap-3" dir="ltr">
                <button type="button" onClick={() => nudgeWeight(-0.5)} className="gc-weight-nudge" aria-label="قلل نصف كيلو"><Minus className="h-5 w-5" /></button>
                <div className="flex items-end justify-center gap-1.5"><input value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" aria-label="الوزن الحالي بالكيلو" placeholder="50" className="gc-weight-input" /><span className="mb-1.5 text-sm font-bold text-neutral-500">kg</span></div>
                <button type="button" onClick={() => nudgeWeight(0.5)} className="gc-weight-nudge" aria-label="زود نصف كيلو"><Plus className="h-5 w-5" /></button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-bold text-neutral-500">الطول <div className="relative mt-1"><input value={height} onChange={(event) => setHeight(event.target.value)} inputMode="decimal" placeholder="165" className="gc-input pe-10" /><span className="absolute inset-y-0 end-3 grid place-items-center text-xs">سم</span></div></label>
                <label className="text-xs font-bold text-neutral-500">السن <div className="relative mt-1"><input value={age} onChange={(event) => setAge(event.target.value)} inputMode="numeric" placeholder="23" className="gc-input pe-12" /><span className="absolute inset-y-0 end-3 grid place-items-center text-xs">سنة</span></div></label>
                <label className="text-xs font-bold text-neutral-500">الوزن المستهدف <div className="relative mt-1"><input value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} inputMode="decimal" placeholder="اختياري" className="gc-input pe-12" /><span className="absolute inset-y-0 end-3 grid place-items-center text-xs">كجم</span></div></label>
              </div>
            </div>
          </section>

          <section className="gc-card p-4 sm:p-5">
            <p className="gc-eyebrow">نظبط الاستراتيجية</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <fieldset><legend className="text-xs font-bold text-neutral-500">نشاطك برا الجيم</legend><div className="mt-2 grid grid-cols-3 gap-2">{([
                ["light", "هادي"], ["moderate", "متوسط"], ["high", "عالي"],
              ] as Array<[GainActivityLevel, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setActivityLevel(value)} className={`gc-choice-button ${activityLevel === value ? "gc-choice-button-active" : ""}`}>{label}</button>)}</div></fieldset>
              <fieldset><legend className="text-xs font-bold text-neutral-500">شهيتك للأكل غالبًا</legend><div className="mt-2 grid grid-cols-3 gap-2">{([
                ["low", "ضعيفة"], ["average", "عادية"], ["good", "كويسة"],
              ] as Array<[GainAppetiteLevel, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setAppetiteLevel(value)} className={`gc-choice-button ${appetiteLevel === value ? "gc-choice-button-active" : ""}`}>{label}</button>)}</div></fieldset>
              <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3.5 text-sm font-bold sm:col-span-2"><input type="checkbox" checked={mealSizeDifficulty} onChange={(event) => setMealSizeDifficulty(event.target.checked)} className="h-4 w-4" /><span>بتشبعي بسرعة أو الوجبات الكبيرة صعبة عليكي</span></label>
              <label className="text-xs font-bold text-neutral-500">نمط الأكل<select value={dietPattern} onChange={(event) => setDietPattern(event.target.value as GainDietPattern)} className="gc-input mt-1"><option value="mixed">عادي / متنوع</option><option value="vegetarian">نباتي مع ألبان/بيض</option><option value="vegan">Vegan</option><option value="other">غير كده</option></select></label>
              <fieldset><legend className="text-xs font-bold text-neutral-500">فكّريني أوزن كل</legend><div className="mt-2 grid grid-cols-3 gap-2">{[3, 7, 14].map((days) => <button key={days} type="button" onClick={() => setIntervalDays(days)} className={`gc-choice-button ${intervalDays === days ? "gc-choice-button-active" : ""}`}>{days} أيام</button>)}</div></fieldset>
            </div>
          </section>

          <div className="gc-onboarding-skip-note">
            <ShieldCheck className="h-5 w-5 shrink-0 text-amber-300" />
            <p className="text-xs leading-5 text-neutral-500"><strong className="text-neutral-300">Safety:</strong> Gain Mode الحالي للبالغين 18+. لو في فقدان وزن غير مقصود، مشكلة أكل مقلقة، أو أعراض صحية مستمرة، التطبيق مش بديل لطبيب أو أخصائي تغذية.</p>
          </div>
        </>
      ) : (
        <div className="gc-onboarding-skip-note"><Dumbbell className="h-5 w-5 shrink-0 text-indigo-200" /><p className="text-sm leading-6">تمام. هنكمّل OVRLD كـGym Tracker كامل، وتقدر تفعّل Gain Mode بعدين من صفحة تقدمك.</p></div>
      )}

      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-300">{error}</p> : null}

      <button type="button" disabled={busy} onClick={() => void continueSetup()} className="gc-primary-button w-full min-h-12 disabled:opacity-50">
        {busy ? "بنجهّز تجربتك…" : gainMode ? "فعّل Gain Mode وكمل" : "كمل بـ OVRLD العادي"}
      </button>
    </div>
  );
}
