"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Flame, Hash, Save, SlidersHorizontal, Trash2, Utensils } from "lucide-react";
import type { ISODateOnlyString, UUID } from "@/types";
import { getTodayISODate } from "@/lib/dates";
import { getArabicErrorMessage } from "@/lib/localization";
import {
  addGainNutritionEntry,
  deleteGainNutritionEntry,
  fetchGainNutritionDay,
  fetchGainNutritionWeek,
  saveGainNutritionTargets,
} from "../services/nutrition.service";
import { fetchGainModeSnapshot } from "../services/gain-mode.service";
import type { GainModeSnapshot, GainNutritionDaySummary } from "../types";
import { GainAiFoodLogger } from "./GainAiFoodLogger";

function clampProgress(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function numberText(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function dayLetter(date: string) {
  try {
    return new Intl.DateTimeFormat("ar-EG", { weekday: "narrow" }).format(new Date(`${date}T12:00:00`));
  } catch {
    return "•";
  }
}

function dayState(day: GainNutritionDaySummary) {
  if (day.entries.length === 0) return "empty" as const;
  const caloriesOk = day.calorieProgress === null || day.calorieProgress >= 0.9;
  const proteinOk = day.proteinProgress === null || day.proteinProgress >= 0.85;
  if (caloriesOk && proteinOk) return "good" as const;
  return "partial" as const;
}

export function GainNutritionPanel({ userId, snapshot }: { userId: UUID; snapshot: GainModeSnapshot }) {
  const actualToday = getTodayISODate();
  const [selectedDate, setSelectedDate] = useState<ISODateOnlyString>(actualToday);
  const [selectedDay, setSelectedDay] = useState(snapshot.todayNutrition);
  const [week, setWeek] = useState<GainNutritionDaySummary[]>([]);
  const [label, setLabel] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [targetCalories, setTargetCalories] = useState(snapshot.calorieTargetKcal ? String(snapshot.calorieTargetKcal) : "");
  const [targetProtein, setTargetProtein] = useState(snapshot.proteinTargetGrams ? String(snapshot.proteinTargetGrams) : "");
  const [busy, setBusy] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [targetsCustomized, setTargetsCustomized] = useState(!snapshot.calorieTargetIsEstimate && !snapshot.proteinTargetIsEstimate);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!snapshot.nutritionAvailable) return;
    const [nextDay, nextWeek] = await Promise.all([
      fetchGainNutritionDay(userId, selectedDate, snapshot.calorieTargetKcal, snapshot.proteinTargetGrams),
      fetchGainNutritionWeek(userId, snapshot.calorieTargetKcal, snapshot.proteinTargetGrams, selectedDate),
    ]);
    setSelectedDay(nextDay);
    setWeek(nextWeek);
  }, [selectedDate, snapshot.calorieTargetKcal, snapshot.nutritionAvailable, snapshot.proteinTargetGrams, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const frame = window.requestAnimationFrame(() => {
      if (window.location.hash === "#nutrition-targets") setTargetsOpen(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!snapshot.nutritionAvailable) return;
    let active = true;
    void Promise.all([
      fetchGainNutritionDay(userId, selectedDate, snapshot.calorieTargetKcal, snapshot.proteinTargetGrams),
      fetchGainNutritionWeek(userId, snapshot.calorieTargetKcal, snapshot.proteinTargetGrams, selectedDate),
    ])
      .then(([nextDay, nextWeek]) => {
        if (!active) return;
        setSelectedDay(nextDay);
        setWeek(nextWeek);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [selectedDate, snapshot.calorieTargetKcal, snapshot.nutritionAvailable, snapshot.proteinTargetGrams, userId]);

  const calorieLeft = useMemo(() => selectedDay.calorieTargetKcal === null ? null : Math.max(0, selectedDay.calorieTargetKcal - selectedDay.caloriesKcal), [selectedDay]);
  const proteinLeft = useMemo(() => selectedDay.proteinTargetGrams === null ? null : Math.max(0, Math.round(selectedDay.proteinTargetGrams - selectedDay.proteinGrams)), [selectedDay]);
  const closeToPlan = (selectedDay.calorieProgress ?? 0) >= 0.95 && (selectedDay.proteinProgress ?? 0) >= 0.9;
  const isTodaySelected = selectedDate === actualToday;

  async function addEntry() {
    setError(null); setSaved(null);
    const caloriesKcal = Number(calories || 0);
    const proteinGrams = Number(protein || 0);
    if ((!calories.trim() && !protein.trim()) || !Number.isFinite(caloriesKcal) || !Number.isFinite(proteinGrams)) {
      setError("اكتب السعرات أو البروتين على الأقل.");
      return;
    }
    setBusy(true);
    try {
      await addGainNutritionEntry(userId, { loggedOn: selectedDate, label, caloriesKcal, proteinGrams });
      setLabel(""); setCalories(""); setProtein(""); setSaved("اتسجلت في اليوم المختار.");
      await refresh();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نسجّل الأكل."));
    } finally { setBusy(false); }
  }

  async function removeEntry(entryId: UUID) {
    setError(null); setSaved(null); setBusy(true);
    try {
      await deleteGainNutritionEntry(userId, entryId);
      await refresh();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نمسح التسجيل."));
    } finally { setBusy(false); }
  }

  async function saveTargets() {
    setError(null); setSaved(null);
    const caloriesValue = targetCalories.trim() ? Number(targetCalories) : null;
    const proteinValue = targetProtein.trim() ? Number(targetProtein) : null;
    if (caloriesValue !== null && (!Number.isFinite(caloriesValue) || caloriesValue < 800 || caloriesValue > 6000)) {
      setError("هدف السعرات لازم يكون بين 800 و6000."); return;
    }
    if (proteinValue !== null && (!Number.isFinite(proteinValue) || proteinValue < 20 || proteinValue > 400)) {
      setError("هدف البروتين لازم يكون بين 20 و400 جم."); return;
    }
    setBusy(true);
    try {
      const nextCalories = caloriesValue === null ? null : Math.round(caloriesValue);
      const nextProtein = proteinValue === null ? null : Math.round(proteinValue * 10) / 10;
      await saveGainNutritionTargets(userId, nextCalories, nextProtein);
      const refreshed = await fetchGainModeSnapshot(userId);
      if (refreshed) {
        const [nextSelectedDay, nextWeek] = await Promise.all([
          fetchGainNutritionDay(userId, selectedDate, refreshed.calorieTargetKcal, refreshed.proteinTargetGrams),
          fetchGainNutritionWeek(userId, refreshed.calorieTargetKcal, refreshed.proteinTargetGrams, selectedDate),
        ]);
        setSelectedDay(nextSelectedDay);
        setWeek(nextWeek);
        setTargetCalories(refreshed.calorieTargetKcal ? String(refreshed.calorieTargetKcal) : "");
        setTargetProtein(refreshed.proteinTargetGrams ? String(refreshed.proteinTargetGrams) : "");
        setTargetsCustomized(!refreshed.calorieTargetIsEstimate || !refreshed.proteinTargetIsEstimate);
      }
      setSaved("الأهداف اتحفظت.");
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نحفظ أهداف الأكل."));
    } finally { setBusy(false); }
  }

  if (!snapshot.nutritionAvailable) {
    return (
      <section id="nutrition" className="gc-nutrition-panel">
        <div className="flex items-center gap-3">
          <span className="gc-nutrition-icon"><Utensils className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1"><p className="gc-eyebrow">النهارده</p><h3 className="mt-0.5 text-lg font-black">الأكل</h3></div>
        </div>
        <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2.5 text-xs font-semibold leading-5 text-amber-700 dark:text-amber-200">
          تسجيل الأكل محتاج تحديث قاعدة البيانات Phase 8 مرة واحدة.
        </div>
      </section>
    );
  }

  return (
    <section id="nutrition" className="gc-nutrition-panel scroll-mt-24">
      <div className="flex items-center gap-3">
        <span className="gc-nutrition-icon"><Utensils className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="gc-eyebrow">{isTodaySelected ? "النهارده" : "يوم سابق"}</p>
          <h3 className="mt-0.5 text-lg font-black">الأكل</h3>
        </div>
        <span className={`gc-day-status ${closeToPlan ? "gc-day-status-good" : ""}`}>{closeToPlan ? "قريب من الخطة" : selectedDay.entries.length ? "لسه فاضل" : "ابدأ التسجيل"}</span>
      </div>

      <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] p-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-4 w-4 shrink-0 text-emerald-400" />
          <label className="min-w-0 flex-1 text-[10px] font-black text-neutral-500">اليوم المختار
            <input
              type="date"
              value={selectedDate}
              max={actualToday}
              onChange={(event) => {
                const next = event.target.value as ISODateOnlyString;
                if (!next || next > actualToday) { setError("مينفعش تختار تاريخ في المستقبل."); return; }
                setError(null); setSaved(null); setSelectedDate(next);
              }}
              className="gc-input mt-1"
            />
          </label>
          {!isTodaySelected ? <button type="button" onClick={() => setSelectedDate(actualToday)} className="gc-secondary-button min-h-10 shrink-0 px-3 text-xs">النهارده</button> : null}
        </div>
        <p className="mt-2 text-[10px] font-semibold text-neutral-500">أي تسجيل أو وجبة محفوظة هتتضاف للتاريخ ده، والتواريخ المستقبلية مرفوضة.</p>
      </div>

      <div className="mt-4 space-y-3">
        <div className="gc-nutrition-metric">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-amber-400" /><span className="text-xs font-black">السعرات</span></div>
            <strong className="text-sm tabular-nums">{selectedDay.caloriesKcal.toLocaleString("en-US")} <span className="text-[10px] text-neutral-500">/ {selectedDay.calorieTargetKcal?.toLocaleString("en-US") ?? "—"} kcal</span></strong>
          </div>
          <div className="gc-progress-track mt-2"><span style={{ width: `${clampProgress(selectedDay.calorieProgress) * 100}%` }} /></div>
        </div>
        <div className="gc-nutrition-metric">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Utensils className="h-4 w-4 text-emerald-400" /><span className="text-xs font-black">البروتين</span></div>
            <strong className="text-sm tabular-nums">{numberText(selectedDay.proteinGrams)}g <span className="text-[10px] text-neutral-500">/ {selectedDay.proteinTargetGrams ? `${numberText(selectedDay.proteinTargetGrams)}g` : "—"}</span></strong>
          </div>
          <div className="gc-progress-track gc-progress-track-protein mt-2"><span style={{ width: `${clampProgress(selectedDay.proteinProgress) * 100}%` }} /></div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-overlay)] px-3 py-2.5 text-xs">
        <span className="font-bold text-neutral-500">المتبقي</span>
        <strong className="tabular-nums">{calorieLeft === null ? "—" : `${calorieLeft} kcal`} · {proteinLeft === null ? "—" : `${proteinLeft}g بروتين`}</strong>
      </div>

      <div className="gc-food-log-primary mt-3">
        <div className="flex items-start gap-3">
          <span className="gc-food-log-primary-icon"><Hash className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">إدخال أرقام يدويًا</p>
            <strong className="mt-0.5 block text-sm font-black">{isTodaySelected ? "سجّل أكلك دلوقتي" : "سجّل أكل اليوم المختار"}</strong>
            <p className="mt-0.5 text-[11px] font-semibold leading-5 text-neutral-500">اكتب السعرات أو البروتين مباشرة. الاسم اختياري.</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="col-span-2 text-[10px] font-black text-neutral-500">اسم سريع · اختياري<input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} className="gc-input mt-1" placeholder="مثال: فطار" /></label>
          <label className="text-[10px] font-black text-neutral-500">kcal<input value={calories} onChange={(event) => setCalories(event.target.value)} inputMode="numeric" className="gc-input mt-1 text-center font-black" placeholder="650" /></label>
          <label className="text-[10px] font-black text-neutral-500">بروتين g<input value={protein} onChange={(event) => setProtein(event.target.value)} inputMode="decimal" className="gc-input mt-1 text-center font-black" placeholder="32" /></label>
        </div>
        <button type="button" disabled={busy} onClick={() => void addEntry()} className="gc-primary-button mt-2 w-full min-h-11 disabled:opacity-50"><Save className="h-4 w-4" /> سجّل الأكل</button>
      </div>

      <GainAiFoodLogger userId={userId} loggedOn={selectedDate} onLogged={refresh} />

      {selectedDay.entries.length ? (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-black">{isTodaySelected ? "تسجيلات النهارده" : "تسجيلات اليوم المختار"}</h4><span className="text-[10px] font-bold text-neutral-500">{selectedDay.entries.length}</span></div>
          <div className="space-y-1.5">
            {selectedDay.entries.map((entry) => (
              <div key={entry.id} className="gc-food-entry">
                <span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-1.5"><strong className="block min-w-0 truncate text-xs">{entry.label || "تسجيل"}</strong>{entry.source !== "manual" ? <span className="gc-entry-source">{entry.source === "ai" ? "AI" : "محفوظة"}</span> : null}</span><span className="text-[10px] tabular-nums text-neutral-500">{entry.caloriesKcal} kcal · {numberText(entry.proteinGrams)}g protein</span></span>
                <button type="button" disabled={busy} onClick={() => void removeEntry(entry.id)} aria-label="امسح التسجيل" className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-red-400/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 border-t border-[var(--border)] pt-3">
        <div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-black">آخر 7 أيام لحد التاريخ المختار</h4><span className="text-[10px] font-bold text-neutral-500">سعرات + بروتين</span></div>
        <div className="gc-nutrition-week">
          {(week.length ? week : Array.from({ length: 7 }, (_, index) => ({ ...selectedDay, date: `${index}`, entries: [] }))).map((day, index) => {
            const state = week.length ? dayState(day) : "empty";
            return <div key={day.date || index} className="gc-nutrition-week-day"><span>{week.length ? dayLetter(day.date) : "•"}</span><i className={`gc-nutrition-day-dot gc-nutrition-day-dot-${state}`} /><small>{week.length && day.entries.length ? `${Math.round((day.calorieProgress ?? 0) * 100)}%` : "—"}</small></div>;
          })}
        </div>
      </div>

      <details
        id="nutrition-targets"
        open={targetsOpen}
        onToggle={(event) => setTargetsOpen(event.currentTarget.open)}
        className="mt-4 scroll-mt-24 border-t border-[var(--border)] pt-3 group"
      >
        <summary className="flex min-h-9 list-none items-center gap-2 text-xs font-black [&::-webkit-details-marker]:hidden"><SlidersHorizontal className="h-4 w-4 text-neutral-500" /><span className="min-w-0 flex-1">أهداف الأكل</span><span className="text-[10px] font-semibold text-neutral-500">{targetsCustomized ? "مخصص" : "تقدير بداية"}</span><ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" /></summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[10px] font-black text-neutral-500">kcal / يوم<input value={targetCalories} onChange={(event) => setTargetCalories(event.target.value)} inputMode="numeric" className="gc-input mt-1" /></label>
          <label className="text-[10px] font-black text-neutral-500">بروتين g / يوم<input value={targetProtein} onChange={(event) => setTargetProtein(event.target.value)} inputMode="decimal" className="gc-input mt-1" /></label>
          <button type="button" disabled={busy} onClick={() => void saveTargets()} className="gc-secondary-button col-span-2 min-h-10 disabled:opacity-50"><Save className="h-4 w-4" /> احفظ الأهداف</button>
          <p className="col-span-2 text-[10px] leading-4 text-neutral-500">السعرات تقدير بداية قابل للتعديل، والبروتين مرجع يومي. التطبيق بيتابع الاتجاه ولا يعتبرهم وصفة طبية.</p>
        </div>
      </details>

      {error ? <p className="mt-3 rounded-lg bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-400">{error}</p> : null}
      {saved ? <p className="mt-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-500">{saved}</p> : null}
    </section>
  );
}
