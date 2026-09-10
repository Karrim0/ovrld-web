"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpLeft,
  BellRing,
  CalendarClock,
  Check,
  ChevronDown,
  Gauge,
  Minus,
  Plus,
  Save,
  Scale,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { ProfileSex, UUID } from "@/types";
import { fetchProfile } from "@/features/profile/services/profile.service";
import { getArabicErrorMessage } from "@/lib/localization";
import { addBodyMeasurement, fetchBodyProgress, saveBodyGoal } from "../services/body-progress.service";
import type { BodyProgressSnapshot } from "../types";
import { BodyMeasurementsPanel } from "./BodyMeasurementsPanel";
import { BodyShapeOverview } from "./BodyShapeOverview";

function asNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatWeight(value: number | null) {
  if (value === null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} كجم`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(new Date(value));
}

function daysUntil(value: string | null) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function getBodyProgressLoadMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const bodySchemaMissing = /user_body_goals|body_measurements/iu.test(raw)
    && /schema cache|does not exist|could not find/iu.test(raw);
  if (bodySchemaMissing) {
    return "متابعة الجسم محتاجة تحديث قاعدة البيانات مرة واحدة قبل ما تشتغل.";
  }
  return getArabicErrorMessage(error, "معرفناش نحمّل متابعة جسمك.");
}

function WeightSparkline({ snapshot }: { snapshot: BodyProgressSnapshot }) {
  const points = [...snapshot.measurements].reverse().slice(-12);
  if (points.length < 2) {
    return (
      <div className="grid h-28 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 text-center text-xs leading-5 text-neutral-500">
        سجّل وزنك مرتين عشان نبدأ نرسم الاتجاه الحقيقي بدل ما نحكم من قراءة واحدة.
      </div>
    );
  }

  const weights = points.map((point) => point.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = Math.max(0.5, max - min);
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 78 - ((point.weightKg - min) / span) * 58;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
      <svg viewBox="0 0 100 88" className="h-32 w-full overflow-visible" role="img" aria-label="اتجاه الوزن">
        <defs>
          <linearGradient id="weightArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,82 ${coords} 100,82`} fill="url(#weightArea)" stroke="none" className="text-emerald-300" />
        <polyline points={coords} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300" />
        {points.map((point, index) => {
          const [x, y] = coords.split(" ")[index].split(",");
          return <circle key={point.id} cx={x} cy={y} r="2.2" fill="currentColor" className="text-emerald-200" />;
        })}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-neutral-500">
        <span>{formatShortDate(points[0].measuredAt)}</span>
        <span>{formatShortDate(points.at(-1)!.measuredAt)}</span>
      </div>
    </div>
  );
}

export function BodyProgressClient({ userId }: { userId: UUID }) {
  const [snapshot, setSnapshot] = useState<BodyProgressSnapshot | null>(null);
  const [profileSex, setProfileSex] = useState<ProfileSex | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [intervalDays, setIntervalDays] = useState("7");
  const [activeView, setActiveView] = useState<"overview" | "weight" | "measurements">("overview");

  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [next, profile] = await Promise.all([fetchBodyProgress(userId), fetchProfile(userId)]);
      setProfileSex(profile?.sex ?? null);
      setSnapshot(next);
      if (next.goal) {
        setIntervalDays(next.goal.weighInIntervalDays.toString());
      }
      setWeight(next.latest?.weightKg.toString() ?? "");
    } catch (caught) {
      setError(getBodyProgressLoadMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchBodyProgress(userId), fetchProfile(userId)])
      .then(([next, profile]) => {
        if (!active) return;
        setProfileSex(profile?.sex ?? null);
        setSnapshot(next);
        if (next.goal) setIntervalDays(next.goal.weighInIntervalDays.toString());
        setWeight(next.latest?.weightKg.toString() ?? "");
      })
      .catch((caught) => {
        if (active) setError(getBodyProgressLoadMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const frame = window.requestAnimationFrame(() => {
      if (window.location.hash === "#measurements") setActiveView("measurements");
      else if (window.location.hash === "#weight") setActiveView("weight");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function selectView(view: "overview" | "weight" | "measurements") {
    setActiveView(view);
    if (typeof window !== "undefined") {
      const next = view === "measurements" ? `${window.location.pathname}#measurements` : view === "weight" ? `${window.location.pathname}#weight` : window.location.pathname;
      window.history.replaceState(null, "", next);
    }
  }

  useEffect(() => {
    if (!snapshot?.nextWeighInAt || typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted" || new Date(snapshot.nextWeighInAt).getTime() > Date.now()) return;
    const dateKey = new Date().toISOString().slice(0, 10);
    const key = `ovrld:weigh-in-notified:${dateKey}`;
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
    const show = async () => {
      try {
        const registration = await navigator.serviceWorker?.ready;
        if (registration) {
          await registration.showNotification("معاد متابعة وزنك", {
            body: "سجّل قراءة سريعة وخلي OVRLD يتابع الاتجاه بدل التخمين.",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-192x192.png",
            tag: "ovrld-weigh-in",
            data: { url: "/progress/body" },
          });
          return;
        }
        new Notification("معاد متابعة وزنك", { body: "سجّل قراءة سريعة وخلي OVRLD يتابع الاتجاه." });
      } catch { /* notification is an enhancement */ }
    };
    void show();
  }, [snapshot?.nextWeighInAt]);

  const targetProgress = useMemo(() => {
    if (!snapshot?.start || !snapshot.latest || !snapshot.goal?.targetWeightKg) return null;
    const start = snapshot.start.weightKg;
    const current = snapshot.latest.weightKg;
    const target = snapshot.goal.targetWeightKg;
    if (Math.abs(target - start) < 0.05) return 100;
    const raw = ((current - start) / (target - start)) * 100;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }, [snapshot]);

  const dueInDays = daysUntil(snapshot?.nextWeighInAt ?? null);
  const currentDelta = snapshot?.latest && snapshot.previous
    ? round(snapshot.latest.weightKg - snapshot.previous.weightKg)
    : null;
  const totalDelta = snapshot?.latest && snapshot.start
    ? round(snapshot.latest.weightKg - snapshot.start.weightKg)
    : null;

  async function saveTrackingCadence() {
    const interval = Number(intervalDays);
    if (!Number.isInteger(interval) || interval < 1 || interval > 30) {
      setError("اختار فترة متابعة من يوم لـ 30 يوم.");
      return;
    }
    setBusy(true); setError(null); setMessage(null);
    try {
      await saveBodyGoal(userId, {
        goalType: snapshot?.goal?.goalType === "gain_weight" ? "gain_weight" : "track_only",
        targetWeightKg: snapshot?.goal?.targetWeightKg ?? null,
        heightCm: snapshot?.goal?.heightCm ?? null,
        targetDate: snapshot?.goal?.targetDate ?? null,
        weighInIntervalDays: interval,
        bodyMeasurementIntervalDays: snapshot?.goal?.bodyMeasurementIntervalDays ?? 28,
      });
      setMessage("اتحفظ ميعاد متابعة الوزن.");
      await load();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نحفظ ميعاد المتابعة."));
    } finally { setBusy(false); }
  }

  async function logWeight() {
    const value = asNumber(weight);
    const fat = asNumber(bodyFat);
    if (value === null || value < 20 || value > 500) {
      setError("اكتب وزنك الحالي بالكيلوجرام.");
      return;
    }
    setBusy(true); setError(null); setMessage(null);
    try {
      await addBodyMeasurement(userId, {
        weightKg: value,
        bodyFatPercentage: fat,
        note,
      });
      setBodyFat(""); setNote("");
      setMessage("اتسجلت القراءة. هنستخدم الاتجاه، مش رقم يوم واحد.");
      await load();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نسجّل الوزن."));
    } finally { setBusy(false); }
  }

  function nudgeWeight(delta: number) {
    const base = asNumber(weight) ?? snapshot?.latest?.weightKg ?? 70;
    setWeight(round(Math.max(20, base + delta)).toString());
  }

  async function enableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setError("المتصفح ده مش بيدعم إشعارات الويب.");
      return;
    }
    const permission = await Notification.requestPermission();
    setMessage(permission === "granted" ? "الإشعارات اتفعلت. هنفكّرك لما يحين موعد المتابعة." : "تقدر تفعّل الإشعارات بعدين من إعدادات المتصفح.");
  }

  if (loading) {
    return <div className="space-y-3 py-5"><div className="h-56 animate-pulse rounded-[30px] bg-white/[0.04]" /><div className="h-48 animate-pulse rounded-[24px] bg-white/[0.035]" /></div>;
  }

  // A failed fetch leaves the snapshot empty. Do not continue into charts/cards that
  // require a loaded snapshot (the old non-null assertion here caused a runtime crash).
  if (!snapshot) {
    return (
      <div className="space-y-4 pb-28 pt-4">
        <section className="gc-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-300/10 text-amber-300">
              <Scale className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="gc-eyebrow">متابعة الجسم</p>
              <h2 className="mt-1 text-xl font-black">الميزة مش جاهزة للتحميل دلوقتي</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {error ?? "معرفناش نحمّل بيانات متابعة الجسم. جرّب تاني بعد لحظة."}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} className="gc-secondary-button mt-4 w-full">
            جرّب التحميل تاني
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28 pt-4">
      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-semibold text-red-300">{error}</p> : null}
      {message ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-300">{message}</p> : null}

      <div className="gc-body-view-tabs gc-body-view-tabs-three">
        <button type="button" onClick={() => selectView("overview")} className={activeView === "overview" ? "gc-body-view-tab-active" : ""}>نظرة عامة</button>
        <button type="button" onClick={() => selectView("weight")} className={activeView === "weight" ? "gc-body-view-tab-active" : ""}>الوزن</button>
        <button type="button" onClick={() => selectView("measurements")} className={activeView === "measurements" ? "gc-body-view-tab-active" : ""}>القياسات</button>
      </div>

      {activeView === "overview" ? (
        <BodyShapeOverview snapshot={snapshot} sex={profileSex} />
      ) : activeView === "measurements" ? (
        <BodyMeasurementsPanel userId={userId} snapshot={snapshot} onSaved={load} />
      ) : (
        <>
      <section className="gc-body-hero relative overflow-hidden rounded-[30px] p-5 sm:p-7">
        <div className="absolute -left-12 -top-16 h-44 w-44 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="gc-eyebrow">الوزن الحالي</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{formatWeight(snapshot?.latest?.weightKg ?? null)}</h2>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-emerald-300/10 text-emerald-300"><Scale className="h-7 w-7" /></span>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <div className="gc-glass-stat"><span>آخر تغيير</span><strong className={currentDelta && currentDelta > 0 ? "text-emerald-300" : currentDelta && currentDelta < 0 ? "text-sky-300" : ""}>{currentDelta === null ? "—" : `${currentDelta > 0 ? "+" : ""}${currentDelta} كجم`}</strong></div>
          <div className="gc-glass-stat"><span>من البداية</span><strong>{totalDelta === null ? "—" : `${totalDelta > 0 ? "+" : ""}${totalDelta} كجم`}</strong></div>
          <div className="gc-glass-stat"><span>المستهدف</span><strong>{formatWeight(snapshot?.goal?.targetWeightKg ?? null)}</strong></div>
        </div>

        {targetProgress !== null ? (
          <div className="relative mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-bold"><span>المسافة للهدف</span><span>{targetProgress}%</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${targetProgress}%` }} /></div>
          </div>
        ) : null}
      </section>

      <section className="gc-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><p className="gc-eyebrow">قياس جديد</p><h3 className="mt-1 text-lg font-black">الوزن</h3></div>
          <Gauge className="h-5 w-5 text-emerald-300" />
        </div>

        <div className="mt-4 rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => nudgeWeight(-0.1)} className="gc-weight-nudge" aria-label="نقص 0.1 كجم"><Minus className="h-5 w-5" /></button>
            <label className="min-w-0 flex-1 text-center">
              <span className="sr-only">الوزن الحالي</span>
              <div className="flex items-end justify-center gap-1">
                <input inputMode="decimal" type="number" step="0.1" min="20" max="500" value={weight} onChange={(event) => setWeight(event.target.value)} className="gc-weight-input" placeholder="70.0" />
                <span className="pb-2 text-sm font-bold text-neutral-500">كجم</span>
              </div>
            </label>
            <button type="button" onClick={() => nudgeWeight(0.1)} className="gc-weight-nudge" aria-label="زود 0.1 كجم"><Plus className="h-5 w-5" /></button>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {[-0.5, -0.2, 0.2, 0.5].map((delta) => <button key={delta} type="button" onClick={() => nudgeWeight(delta)} className="gc-quick-chip">{delta > 0 ? "+" : ""}{delta}</button>)}
          </div>
        </div>

        <details className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
          <summary className="flex items-center justify-between gap-3 text-sm font-bold"><span>تفاصيل اختيارية</span><ChevronDown className="h-4 w-4 text-neutral-500" /></summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label><span className="mb-1 block text-xs font-bold text-neutral-500">دهون الجسم %</span><input type="number" inputMode="decimal" value={bodyFat} onChange={(event) => setBodyFat(event.target.value)} className="gc-input" placeholder="اختياري" /></label>
            <label><span className="mb-1 block text-xs font-bold text-neutral-500">ملاحظة</span><input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className="gc-input" placeholder="مثلاً: صباحًا قبل الفطار" /></label>
          </div>
        </details>

        <button type="button" disabled={busy} onClick={() => void logWeight()} className="gc-primary-button mt-4 w-full disabled:opacity-50"><Check className="h-5 w-5" /> {busy ? "بنسجّل…" : "سجّل القراءة"}</button>
      </section>

      <section className="gc-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="gc-eyebrow">الاتجاه</p><h3 className="mt-1 text-lg font-black">تغير الوزن</h3></div>{totalDelta !== null && totalDelta !== 0 ? (totalDelta > 0 ? <TrendingUp className="h-5 w-5 text-emerald-300" /> : <TrendingDown className="h-5 w-5 text-sky-300" />) : <Sparkles className="h-5 w-5 text-emerald-300" />}</div>
        <div className="mt-4"><WeightSparkline snapshot={snapshot} /></div>
      </section>

      <section className="gc-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300"><Target className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{snapshot.goal?.goalType === "gain_weight" ? "Gain Mode شغال" : "الهدف"}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{snapshot.goal?.goalType === "gain_weight" ? "زيادة الوزن" : "مفيش Goal Mode متفعل"}</p>
          </div>
        </div>

        {snapshot.goal?.goalType === "gain_weight" ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="gc-glass-stat"><span>الطول</span><strong>{snapshot.goal.heightCm ? `${snapshot.goal.heightCm} سم` : "—"}</strong></div>
            <div className="gc-glass-stat"><span>هدف الوزن</span><strong>{formatWeight(snapshot.goal.targetWeightKg)}</strong></div>
          </div>
        ) : null}

        <div className="mt-4">
          <span className="mb-2 block text-xs font-bold text-neutral-500">فكّرني أوزن كل</span>
          <div className="grid grid-cols-4 gap-2">
            {[3, 7, 14, 30].map((days) => (
              <button key={days} type="button" onClick={() => setIntervalDays(String(days))} className={`gc-choice-button ${intervalDays === String(days) ? "gc-choice-button-active" : ""}`}>
                {days === 7 ? "أسبوع" : days === 14 ? "أسبوعين" : days === 30 ? "شهر" : "3 أيام"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-2 min-[390px]:grid-cols-2">
          <button type="button" disabled={busy} onClick={() => void saveTrackingCadence()} className="gc-secondary-button w-full"><Save className="h-4 w-4" /> احفظ التذكير</button>
          <Link href="/progress/gain" className="gc-secondary-button w-full"><Sparkles className="h-4 w-4 text-emerald-300" /> {snapshot.goal?.goalType === "gain_weight" ? "إعداد Gain Mode" : "فعّل Gain Mode"} <ArrowUpLeft className="h-4 w-4" /></Link>
        </div>
      </section>

      <section className="gc-card p-4 sm:p-5">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-300/10 text-amber-300"><CalendarClock className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="font-bold">القياس الجاي</p><p className="mt-1 text-sm text-neutral-500">{dueInDays === null ? "حدد فترة المتابعة" : dueInDays <= 0 ? "النهارده" : `بعد ${dueInDays} يوم`}</p></div></div>
        <button type="button" onClick={() => void enableNotifications()} className="gc-secondary-button mt-4 w-full"><BellRing className="h-4 w-4" /> فعّل تذكير المتابعة</button>
      </section>
        </>
      )}
    </div>
  );
}
