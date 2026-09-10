"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Loader2,
  Scale,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { createSoloWorkspace } from "@/features/groups/services/group.service";
import { STARTER_PLANS, isGainPlanCompatibleGoal } from "@/features/splits/constants/starter-plans";
import type { StarterPlanKey } from "@/features/splits/types";
import type { ProfileSex, TrainingLevel, UUID } from "@/types";
import { getArabicErrorMessage } from "@/lib/localization";
import { clearLocalUserProductData } from "@/lib/offline";
import { completeOnboarding, saveOnboardingSetup } from "../services/onboarding.service";
import type { OnboardingGoal, TrainingSetupPath } from "../types";

type Step = "welcome" | "basic" | "goal" | "training" | "ready";

const GOALS: Array<{ value: OnboardingGoal; ar: string; en: string; detailAr: string; detailEn: string }> = [
  { value: "muscle_gain", ar: "زيادة عضل", en: "Gain muscle", detailAr: "بناء عضل وتطور في الأداء.", detailEn: "Build muscle and progress your performance." },
  { value: "lose_weight", ar: "خسارة وزن", en: "Lose weight", detailAr: "تابع التمرين والوزن أثناء النزول.", detailEn: "Track training and body weight as you cut." },
  { value: "recomposition", ar: "إعادة تشكيل الجسم", en: "Body recomposition", detailAr: "تطور في القوة وشكل الجسم مع متابعة هادئة.", detailEn: "Improve strength and body composition with steady tracking." },
  { value: "maintain_weight", ar: "الحفاظ على الوزن", en: "Maintain weight", detailAr: "ثبت روتينك وحافظ على الأداء.", detailEn: "Keep a stable routine and maintain performance." },
  { value: "track_only", ar: "لياقة عامة", en: "General fitness", detailAr: "تابع تمرينك ولياقتك وتقدمك.", detailEn: "Track your training, fitness, and progress." },
];

const LEVELS: Array<{ value: TrainingLevel; ar: string; en: string; detailAr: string; detailEn: string }> = [
  { value: "beginner", ar: "مبتدئ", en: "Beginner", detailAr: "لسه ببني الأساس أو راجع بعد انقطاع.", detailEn: "Building the basics or returning after a break." },
  { value: "intermediate", ar: "متوسط", en: "Intermediate", detailAr: "عندي أساس ثابت وبطوّر أوزاني بانتظام.", detailEn: "I have a stable base and progress loads regularly." },
  { value: "advanced", ar: "متقدم", en: "Advanced", detailAr: "خبرة طويلة وبرمجة التمرين عندي أدق.", detailEn: "Long training experience with more deliberate programming." },
];

const STEP_ORDER: Step[] = ["welcome", "basic", "goal", "training", "ready"];

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function OnboardingWizard({
  userId,
  initialHasWorkspace,
}: {
  userId: UUID;
  initialHasWorkspace: boolean;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const ar = language === "ar";
  const [step, setStep] = useState<Step>("welcome");
  const [hasWorkspace, setHasWorkspace] = useState(initialHasWorkspace);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<ProfileSex | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel | null>(null);
  const [weeklyDays, setWeeklyDays] = useState<number | null>(null);
  const [setupPath, setSetupPath] = useState<TrainingSetupPath | null>(null);
  const [readyPlanKey, setReadyPlanKey] = useState<Exclude<StarterPlanKey, "manual"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);
  const matchingPlans = useMemo(() => {
    if (!weeklyDays) return [];
    const plans = STARTER_PLANS.filter((plan) => plan.days === weeklyDays);
    if (!goal || !isGainPlanCompatibleGoal(goal)) return plans;
    return [...plans].sort((a, b) => Number(Boolean(b.recommendedForGain)) - Number(Boolean(a.recommendedForGain)));
  }, [goal, weeklyDays]);
  const selectedPlan = STARTER_PLANS.find((plan) => plan.key === readyPlanKey) ?? null;
  const selectedGoal = GOALS.find((item) => item.value === goal) ?? null;
  const selectedLevel = LEVELS.find((item) => item.value === trainingLevel) ?? null;

  useEffect(() => {
    void clearLocalUserProductData(userId);
  }, [userId]);

  function goBack() {
    setError(null);
    if (step === "basic") setStep("welcome");
    if (step === "goal") setStep("basic");
    if (step === "training") setStep("goal");
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      if (!hasWorkspace) {
        await createSoloWorkspace();
        setHasWorkspace(true);
      }
      setStep("basic");
    } catch (caught) {
      setError(ar ? getArabicErrorMessage(caught, "معرفناش نجهّز مساحة التدريب.") : "We could not prepare your training workspace.");
    } finally {
      setBusy(false);
    }
  }

  function continueBasic() {
    const ageYears = numberOrNull(age);
    const heightCm = numberOrNull(height);
    const currentWeightKg = numberOrNull(weight);
    if (!ageYears || ageYears < 13 || ageYears > 100) {
      setError(ar ? "اكتب سن صحيح بين 13 و100." : "Enter a valid age between 13 and 100.");
      return;
    }
    if (!sex) {
      setError(ar ? "اختار الجنس." : "Choose sex.");
      return;
    }
    if (!heightCm || heightCm < 120 || heightCm > 230) {
      setError(ar ? "اكتب طول صحيح بالسنتيمتر." : "Enter a valid height in centimeters.");
      return;
    }
    if (!currentWeightKg || currentWeightKg < 20 || currentWeightKg > 500) {
      setError(ar ? "اكتب وزنك الحالي بالكيلوجرام." : "Enter your current weight in kilograms.");
      return;
    }
    setError(null);
    setStep("goal");
  }

  function continueGoal() {
    if (!goal) {
      setError(ar ? "اختار هدفك الأساسي عشان نكمّل." : "Choose your main goal to continue.");
      return;
    }
    setError(null);
    setStep("training");
  }

  async function finishSetup() {
    const ageYears = numberOrNull(age);
    const heightCm = numberOrNull(height);
    const currentWeightKg = numberOrNull(weight);
    if (!ageYears || !sex || !heightCm || !currentWeightKg || !goal || !trainingLevel || !weeklyDays || !setupPath) {
      setError(ar ? "كمّل بيانات البداية المطلوبة." : "Complete the required setup details.");
      return;
    }
    if (setupPath === "ready_plan" && !readyPlanKey) {
      setError(ar ? "اختار خطة جاهزة تناسب عدد أيامك." : "Choose a ready plan that matches your weekly availability.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await saveOnboardingSetup(userId, {
        ageYears,
        sex,
        heightCm,
        currentWeightKg,
        goal,
        trainingLevel,
        weeklyTrainingDays: weeklyDays,
        trainingSetupPath: setupPath,
        readyPlanKey,
      });
      setStep("ready");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([14, 28, 14]);
    } catch (caught) {
      setError(ar ? getArabicErrorMessage(caught, "معرفناش نحفظ إعداد البداية.") : "We could not save your setup. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function goHome() {
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding(userId);
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(ar ? getArabicErrorMessage(caught, "الإعداد اتحفظ، لكن معرفناش نقفل الـonboarding.") : "Your setup is saved, but onboarding could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-no-localize className="space-y-5">
      <div className="gc-onboarding-progress" aria-label={ar ? "خطوات البداية" : "Onboarding steps"}>
        {STEP_ORDER.map((item, index) => (
          <div key={item} className="contents">
            <span className={`gc-onboarding-step ${index <= stepIndex ? "gc-onboarding-step-active" : ""}`}>
              <strong>{index + 1}</strong>
              <small>{ar ? ["أهلاً", "بياناتك", "هدفك", "التمرين", "جاهز"][index] : ["Welcome", "Basics", "Goal", "Training", "Ready"][index]}</small>
            </span>
            {index < STEP_ORDER.length - 1 ? <span className="gc-onboarding-progress-line" /> : null}
          </div>
        ))}
      </div>

      {step === "welcome" ? (
        <>
          <section>
            <p className="gc-eyebrow">OVRLD</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.055em]">{ar ? "أهلاً بيك في OVRLD." : "Welcome to OVRLD."}</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-400">{ar ? "ظبّط بياناتك وخطتك ونبدأ." : "Set up your profile and training plan to get started."}</p>
          </section>

          <button type="button" onClick={() => void start()} disabled={busy} className="gc-primary-button w-full min-h-12 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {busy ? (ar ? "بنجهّز…" : "Getting ready…") : (ar ? "ابدأ" : "Get started")}
          </button>

          {!hasWorkspace ? (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/create-group" className="gc-secondary-button">{ar ? "اعمل Crew" : "Create Crew"}</Link>
              <Link href="/join-group" className="gc-secondary-button">{ar ? "ادخل Crew" : "Join Crew"}</Link>
            </div>
          ) : null}
        </>
      ) : null}

      {step === "basic" ? (
        <>
          <section>
            <p className="gc-eyebrow">{ar ? "Basic info" : "Basic info"}</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.055em]">{ar ? "بياناتك الأساسية" : "Your basics"}</h1>
          </section>

          <div className="gc-card space-y-3 p-4">
            <div>
              <p className="mb-2 text-xs font-black text-neutral-500">{ar ? "الجنس" : "Sex"}</p>
              <div className="grid grid-cols-2 gap-2">
                {([["female", ar ? "بنت" : "Female"], ["male", ar ? "ولد" : "Male"]] as Array<[ProfileSex, string]>).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => { setSex(value); setError(null); }} className={`gc-choice-button ${sex === value ? "gc-choice-button-active" : ""}`}>
                    <UserRound className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-bold text-neutral-500">{ar ? "السن" : "Age"}<input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" className="gc-input mt-1" placeholder="23" /></label>
            <label className="text-xs font-bold text-neutral-500">{ar ? "الطول" : "Height"}<div className="relative mt-1"><input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" className="gc-input pe-10" placeholder="165" /><span className="absolute inset-y-0 end-3 grid place-items-center text-xs text-neutral-500">cm</span></div></label>
            <label className="text-xs font-bold text-neutral-500">{ar ? "الوزن الحالي" : "Current weight"}<div className="relative mt-1"><input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className="gc-input pe-10" placeholder="60" /><span className="absolute inset-y-0 end-3 grid place-items-center text-xs text-neutral-500">kg</span></div></label>
            </div>
          </div>
        </>
      ) : null}

      {step === "goal" ? (
        <>
          <section>
            <p className="gc-eyebrow">{ar ? "Goal" : "Goal"}</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.055em]">{ar ? "إيه أهم حاجة بتتمرّن عشانها؟" : "What are you mainly training for?"}</h1>
          </section>
          <div className="grid gap-2" role="radiogroup" aria-label={ar ? "الهدف" : "Goal"}>
            {GOALS.map((item) => {
              const active = goal === item.value;
              return (
                <button key={item.value} type="button" role="radio" aria-checked={active} onClick={() => { setGoal(item.value); setReadyPlanKey(null); setError(null); }} className={`gc-goal-choice ${active ? "gc-goal-choice-active" : ""}`}>
                  <span className="gc-goal-choice-icon">{item.value === "muscle_gain" ? <Dumbbell className="h-5 w-5" /> : item.value === "lose_weight" ? <Scale className="h-5 w-5" /> : <Target className="h-5 w-5" />}</span>
                  <span className="min-w-0 flex-1 text-start"><strong className="block text-sm">{ar ? item.ar : item.en}</strong><span className="mt-0.5 block text-xs text-neutral-500">{ar ? item.detailAr : item.detailEn}</span></span>
                  <span className="gc-goal-radio">{active ? <Check className="h-3.5 w-3.5" /> : null}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {step === "training" ? (
        <>
          <section>
            <p className="gc-eyebrow">{ar ? "Training setup" : "Training setup"}</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.055em]">{ar ? "ظبّط مستوى التدريب وأيامك." : "Set your training level and weekly availability."}</h1>
          </section>

          <section className="gc-card p-4">
            <p className="text-xs font-black text-neutral-500">{ar ? "مستوى التدريب" : "Training level"}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {LEVELS.map((item) => (
                <button key={item.value} type="button" onClick={() => { setTrainingLevel(item.value); setError(null); }} className={`gc-choice-button min-h-16 ${trainingLevel === item.value ? "gc-choice-button-active" : ""}`}>
                  <span><strong className="block">{ar ? item.ar : item.en}</strong><small className="mt-1 block text-[10px] leading-4 text-neutral-500">{ar ? item.detailAr : item.detailEn}</small></span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs font-black text-neutral-500">{ar ? "أقدر أتمرن كام يوم في الأسبوع؟" : "How many days can you train each week?"}</p>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                <button key={days} type="button" onClick={() => { setWeeklyDays(days); setReadyPlanKey(null); setError(null); }} className={`gc-choice-button px-0 ${weeklyDays === days ? "gc-choice-button-active" : ""}`}>{days}</button>
              ))}
            </div>
          </section>

          <section className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => { setSetupPath("ready_plan"); setError(null); }} className={`gc-goal-choice ${setupPath === "ready_plan" ? "gc-goal-choice-active" : ""}`}>
              <span className="gc-goal-choice-icon"><Sparkles className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1 text-start"><strong className="block text-sm">{ar ? "استخدم خطة جاهزة من OVRLD" : "Use an OVRLD ready plan"}</strong><span className="mt-0.5 block text-xs text-neutral-500">{ar ? "اختار هيكل مناسب لأيامك وعدّله بعدين." : "Pick a structure for your availability and edit it later."}</span></span>
              <span className="gc-goal-radio">{setupPath === "ready_plan" ? <Check className="h-3.5 w-3.5" /> : null}</span>
            </button>
            <button type="button" onClick={() => { setSetupPath("own_split"); setReadyPlanKey(null); setError(null); }} className={`gc-goal-choice ${setupPath === "own_split" ? "gc-goal-choice-active" : ""}`}>
              <span className="gc-goal-choice-icon"><UserRound className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1 text-start"><strong className="block text-sm">{ar ? "ابني / استخدم جدولي" : "Build / use my own split"}</strong><span className="mt-0.5 block text-xs text-neutral-500">{ar ? "نجهزلك أسبوع فاضي وتبنيه بطريقتك." : "Start with an empty week and build it your way."}</span></span>
              <span className="gc-goal-radio">{setupPath === "own_split" ? <Check className="h-3.5 w-3.5" /> : null}</span>
            </button>
          </section>

          {setupPath === "ready_plan" ? (
            <section className="space-y-2">
              {!weeklyDays ? <p className="gc-onboarding-skip-note text-xs text-neutral-500">{ar ? "اختار عدد أيامك الأول عشان نعرض الخطط المناسبة." : "Choose your weekly availability first to see matching plans."}</p> : null}
              {weeklyDays && matchingPlans.length === 0 ? (
                <div className="gc-onboarding-skip-note"><Dumbbell className="h-4 w-4 text-amber-300" /><p className="text-xs leading-5 text-neutral-500">{ar ? `مفيش خطة OVRLD جاهزة لـ ${weeklyDays} يوم حاليًا. اختار جدولك الخاص.` : `There is no ${weeklyDays}-day OVRLD plan yet. Choose your own split.`}</p></div>
              ) : null}
              {matchingPlans.map((plan) => {
                const active = readyPlanKey === plan.key;
                const recommended = Boolean(plan.recommendedForGain && goal && isGainPlanCompatibleGoal(goal));
                return (
                  <button key={plan.key} type="button" onClick={() => { setReadyPlanKey(plan.key); setError(null); }} className={`gc-ready-plan-row ${recommended ? "gc-ready-plan-row-recommended" : ""} ${active ? "ring-1 ring-[var(--accent)]" : ""}`}>
                    <span className="gc-ready-plan-days"><strong>{plan.days}</strong><small>{ar ? "أيام" : "days"}</small></span>
                    <span className="min-w-0 flex-1 text-start">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <strong className="text-sm">{ar ? plan.titleAr : plan.titleEn}</strong>
                        {recommended ? <span className="gc-plan-recommended-badge">{ar ? "مقترح" : "Recommended"}</span> : null}
                        {plan.womenFocused ? <span className="gc-plan-women-badge">{ar ? "موجّه للبنات" : "Women-focused"}</span> : null}
                      </span>
                      <small className="mt-1 block text-xs leading-5 text-neutral-500">
                        {plan.key === "gain_glutes_4" ? (ar ? "Women-focused physique plan · Glutes + Legs" : "Women-focused physique plan · Glutes + Legs") : (ar ? plan.detailAr : plan.detailEn)}
                      </small>
                    </span>
                    {active ? <Check className="h-4 w-4 shrink-0 text-emerald-300" /> : null}
                  </button>
                );
              })}
            </section>
          ) : null}
        </>
      ) : null}

      {step === "ready" ? (
        <>
          <section className="text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-300 text-neutral-950"><Check className="h-8 w-8" /></span>
            <p className="gc-eyebrow mt-4">{ar ? "Ready" : "Ready"}</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.055em]">{ar ? "كله جاهز." : "You’re ready."}</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-400">{ar ? "ابدأ أول يوم مع OVRLD." : "Start your first day with OVRLD."}</p>
          </section>

          <section className="gc-list-panel overflow-hidden">
            <div className="gc-list-row"><Target className="h-4 w-4 text-emerald-300" /><span className="min-w-0 flex-1 font-bold">{selectedGoal ? (ar ? selectedGoal.ar : selectedGoal.en) : "—"}</span></div>
            <div className="gc-list-row"><Dumbbell className="h-4 w-4 text-emerald-300" /><span className="min-w-0 flex-1 font-bold">{selectedLevel ? (ar ? selectedLevel.ar : selectedLevel.en) : "—"}</span></div>
            <div className="gc-list-row"><Scale className="h-4 w-4 text-neutral-400" /><span className="min-w-0 flex-1 font-bold">{weeklyDays} {ar ? "أيام / أسبوع" : "days / week"}</span></div>
            <div className="gc-list-row"><Sparkles className="h-4 w-4 text-neutral-400" /><span className="min-w-0 flex-1 font-bold">{setupPath === "ready_plan" ? (selectedPlan ? (ar ? selectedPlan.titleAr : selectedPlan.titleEn) : "—") : (ar ? "جدولي الخاص" : "My own split")}</span></div>
          </section>

          <button type="button" disabled={busy} onClick={() => void goHome()} className="gc-primary-button w-full min-h-12 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {busy ? (ar ? "بنفتح Home…" : "Opening Home…") : (ar ? "روح للـHome" : "Go to Home")}
          </button>
        </>
      ) : null}

      {error ? <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-300">{error}</p> : null}

      {step !== "welcome" && step !== "ready" ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={goBack} disabled={busy} className="gc-secondary-button"><ArrowLeft className="h-4 w-4" /> {ar ? "رجوع" : "Back"}</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (step === "basic") continueBasic();
              else if (step === "goal") continueGoal();
              else void finishSetup();
            }}
            className="gc-primary-button disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {busy ? (ar ? "بنحفظ…" : "Saving…") : (step === "training" ? (ar ? "راجع الإعداد" : "Review setup") : (ar ? "التالي" : "Continue"))}
          </button>
        </div>
      ) : null}
    </div>
  );
}
