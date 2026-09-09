"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import { LanguageSwitcher } from "@/components/localization/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { useLanguage } from "@/contexts/language-context";
import { useEffect, useState } from "react";
import { Camera, Dumbbell, Save, UserRound } from "lucide-react";
import type { TrainingLevel, UUID, UserProfile } from "@/types";
import type { BodyGoalType, BodyProgressSnapshot } from "@/features/body-progress/types";
import { addBodyMeasurement, fetchBodyProgress, saveBodyGoal } from "@/features/body-progress/services/body-progress.service";
import {
  fetchProfile,
  updateProfile,
  updateTrainingProfileBasics,
  uploadProfileAvatar,
} from "../services/profile.service";

interface ProfileSettingsClientProps { userId: UUID }

const GOAL_OPTIONS: Array<{ value: BodyGoalType; ar: string; en: string }> = [
  { value: "muscle_gain", ar: "زيادة عضل", en: "Gain muscle" },
  { value: "gain_weight", ar: "Gain Mode · زيادة وزن", en: "Gain Mode · Gain weight" },
  { value: "lose_weight", ar: "خسارة وزن", en: "Lose weight" },
  { value: "recomposition", ar: "إعادة تشكيل الجسم", en: "Body recomposition" },
  { value: "maintain_weight", ar: "الحفاظ على الوزن", en: "Maintain weight" },
  { value: "track_only", ar: "لياقة عامة / متابعة فقط", en: "General fitness / track only" },
];

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProfileSettingsClient({ userId }: ProfileSettingsClientProps) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [body, setBody] = useState<BodyProgressSnapshot | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<BodyGoalType>("track_only");
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel | "">("");
  const [weeklyDays, setWeeklyDays] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchProfile(userId), fetchBodyProgress(userId)])
      .then(([profileValue, bodyValue]) => {
        if (!active) return;
        setProfile(profileValue);
        setBody(bodyValue);
        setDisplayName(profileValue?.displayName ?? "");
        setAvatarUrl(profileValue?.avatarUrl ?? null);
        setAge(profileValue?.ageYears ? String(profileValue.ageYears) : "");
        setTrainingLevel(profileValue?.trainingLevel ?? "");
        setWeeklyDays(profileValue?.weeklyTrainingDays ?? null);
        setHeight(bodyValue.goal?.heightCm ? String(bodyValue.goal.heightCm) : "");
        setWeight(bodyValue.latest?.weightKg ? String(bodyValue.latest.weightKg) : "");
        setGoal(bodyValue.goal?.goalType ?? "track_only");
      })
      .catch((caught) => {
        if (active) setError(getArabicErrorMessage(caught, "معرفناش نحمّل الحساب."));
      });
    return () => { active = false; };
  }, [userId]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setIsSaving(true);
    setError(null);
    try {
      const url = await uploadProfileAvatar(userId, file);
      setAvatarUrl(url);
      setMessage(ar ? "الصورة اترفعت. اضغط حفظ عشان تحدّث حسابك." : "Photo uploaded. Save your account to apply it.");
    } catch (caught) {
      setError(ar ? getArabicErrorMessage(caught, "معرفناش نرفع الصورة.") : "We could not upload the photo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAccount() {
    if (displayName.trim().length < 2) {
      setError(ar ? "الاسم لازم يبقى حرفين على الأقل." : "Display name must be at least two characters.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateProfile(userId, { displayName, avatarUrl });
      setProfile(updated);
      setMessage(ar ? "الحساب اتحفظ." : "Account saved.");
    } catch (caught) {
      setError(ar ? getArabicErrorMessage(caught, "معرفناش نحفظ الحساب.") : "We could not save the account.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveFitnessProfile() {
    const ageYears = numberOrNull(age);
    const heightCm = numberOrNull(height);
    const currentWeightKg = numberOrNull(weight);
    if (!ageYears || ageYears < 13 || ageYears > 100) {
      setError(ar ? "راجع السن." : "Check your age.");
      return;
    }
    if (!heightCm || heightCm < 120 || heightCm > 230) {
      setError(ar ? "راجع الطول بالسنتيمتر." : "Check your height in centimeters.");
      return;
    }
    if (!currentWeightKg || currentWeightKg < 20 || currentWeightKg > 500) {
      setError(ar ? "راجع الوزن الحالي." : "Check your current weight.");
      return;
    }
    if (!trainingLevel || !weeklyDays) {
      setError(ar ? "حدد مستوى التدريب وعدد الأيام." : "Set your training level and weekly availability.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updatedProfile = await updateTrainingProfileBasics(userId, {
        ageYears,
        trainingLevel,
        weeklyTrainingDays: weeklyDays,
      });
      await saveBodyGoal(userId, {
        goalType: goal,
        targetWeightKg: body?.goal?.targetWeightKg ?? null,
        heightCm,
        targetDate: body?.goal?.targetDate ?? null,
        weighInIntervalDays: body?.goal?.weighInIntervalDays ?? 7,
        bodyMeasurementIntervalDays: body?.goal?.bodyMeasurementIntervalDays ?? 28,
      });
      if (!body?.latest || Math.abs(body.latest.weightKg - currentWeightKg) >= 0.05) {
        await addBodyMeasurement(userId, { weightKg: currentWeightKg });
      }
      const refreshedBody = await fetchBodyProgress(userId);
      setProfile(updatedProfile);
      setBody(refreshedBody);
      setWeight(refreshedBody.latest?.weightKg ? String(refreshedBody.latest.weightKg) : weight);
      setMessage(ar ? "بيانات التدريب والجسم اتحفظت." : "Training and body profile saved.");
    } catch (caught) {
      setError(ar ? getArabicErrorMessage(caught, "معرفناش نحفظ بيانات الملف.") : "We could not save the profile details.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!profile && !error) return <p className="py-8 text-center text-sm text-neutral-500">{ar ? "بنحمّل الحساب…" : "Loading account…"}</p>;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <LanguageSwitcher variant="panel" />
        <ThemeSwitcher variant="panel" />
      </div>

      <section className="gc-card p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full border object-cover shadow-sm" />
            ) : (
              <span className="gc-avatar-placeholder grid h-20 w-20 place-items-center rounded-full border"><UserRound className="h-9 w-9" /></span>
            )}
            <label className="gc-brand-mark absolute bottom-0 end-0 cursor-pointer rounded-full p-2">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{ar ? "الاسم الظاهر" : "Display name"}</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} className="gc-input" />
            </label>
          </div>
        </div>
        <button type="button" disabled={isSaving} onClick={() => void saveAccount()} className="gc-secondary-button mt-4 w-full disabled:opacity-50">
          <Save className="h-4 w-4" /> {isSaving ? (ar ? "بنحفظ…" : "Saving…") : (ar ? "احفظ الحساب" : "Save account")}
        </button>
      </section>

      <section id="fitness-profile" data-no-localize className="gc-card scroll-mt-24 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300"><Dumbbell className="h-5 w-5" /></span>
          <div>
            <p className="gc-eyebrow">{ar ? "ملف التدريب" : "Training profile"}</p>
            <h2 className="mt-1 text-lg font-black">{ar ? "البيانات اللي بتخلي OVRLD يفهم سياقك" : "The basics OVRLD uses for context"}</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">{ar ? "دي نفس مصادر الداتا المستخدمة في الـonboarding؛ مفيش نسخة تانية مخزنة." : "These are the same data sources used by onboarding; there is no duplicate profile copy."}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label id="profile-age" className="scroll-mt-24 text-xs font-bold text-neutral-500">{ar ? "السن" : "Age"}<input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" className="gc-input mt-1" /></label>
          <label id="profile-height" className="scroll-mt-24 text-xs font-bold text-neutral-500">{ar ? "الطول" : "Height"}<input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" className="gc-input mt-1" /></label>
          <label className="text-xs font-bold text-neutral-500">{ar ? "الوزن الحالي" : "Current weight"}<input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className="gc-input mt-1" /></label>
        </div>

        <label id="profile-goal" className="mt-3 block scroll-mt-24 text-xs font-bold text-neutral-500">
          {ar ? "الهدف الأساسي" : "Primary goal"}
          <select value={goal} onChange={(e) => setGoal(e.target.value as BodyGoalType)} className="gc-input mt-1">
            {GOAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{ar ? option.ar : option.en}</option>)}
          </select>
        </label>

        <div id="profile-training-level" className="mt-3 scroll-mt-24">
          <p className="text-xs font-bold text-neutral-500">{ar ? "مستوى التدريب" : "Training level"}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["beginner", "intermediate", "advanced"] as TrainingLevel[]).map((level) => (
              <button key={level} type="button" onClick={() => setTrainingLevel(level)} className={`gc-choice-button ${trainingLevel === level ? "gc-choice-button-active" : ""}`}>
                {level === "beginner" ? (ar ? "مبتدئ" : "Beginner") : level === "intermediate" ? (ar ? "متوسط" : "Intermediate") : (ar ? "متقدم" : "Advanced")}
              </button>
            ))}
          </div>
        </div>

        <div id="profile-weekly-availability" className="mt-3 scroll-mt-24">
          <p className="text-xs font-bold text-neutral-500">{ar ? "الأيام المتاحة أسبوعيًا" : "Weekly availability"}</p>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((days) => <button key={days} type="button" onClick={() => setWeeklyDays(days)} className={`gc-choice-button px-0 ${weeklyDays === days ? "gc-choice-button-active" : ""}`}>{days}</button>)}
          </div>
        </div>

        <button type="button" disabled={isSaving} onClick={() => void saveFitnessProfile()} className="gc-primary-button mt-4 w-full disabled:opacity-50">
          <Save className="h-4 w-4" /> {isSaving ? (ar ? "بنحفظ…" : "Saving…") : (ar ? "احفظ ملف التدريب" : "Save training profile")}
        </button>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
    </div>
  );
}
