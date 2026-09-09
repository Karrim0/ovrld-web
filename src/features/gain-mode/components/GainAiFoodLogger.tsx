"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookmarkPlus, ChevronDown, Crown, LockKeyhole, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import type { UUID } from "@/types";
import { getArabicErrorMessage } from "@/lib/localization";
import {
  deleteGainSavedMeal,
  fetchGainSavedMeals,
  logGainSavedMeal,
  saveGainMeal,
} from "../services/nutrition.service";
import type { GainSavedMeal } from "../types";

function numberText(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function GainAiFoodLogger({ userId, onLogged }: { userId: UUID; onLogged: () => Promise<void> | void }) {
  const [savedMeals, setSavedMeals] = useState<GainSavedMeal[]>([]);
  const [savedMealsAvailable, setSavedMealsAvailable] = useState(true);
  const [manualMealName, setManualMealName] = useState("");
  const [manualMealCalories, setManualMealCalories] = useState("");
  const [manualMealProtein, setManualMealProtein] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshSavedMeals = useCallback(async () => {
    try {
      const meals = await fetchGainSavedMeals(userId);
      setSavedMeals(meals);
      setSavedMealsAvailable(true);
    } catch {
      setSavedMealsAvailable(false);
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    void fetchGainSavedMeals(userId)
      .then((meals) => {
        if (!active) return;
        setSavedMeals(meals);
        setSavedMealsAvailable(true);
      })
      .catch(() => {
        if (active) setSavedMealsAvailable(false);
      });
    return () => { active = false; };
  }, [userId]);

  const quickMeals = useMemo(() => savedMeals.slice(0, 6), [savedMeals]);

  async function logSavedMeal(meal: GainSavedMeal) {
    setError(null); setMessage(null); setBusy(true);
    try {
      await logGainSavedMeal(meal.id);
      setMessage("الوجبة المحفوظة اتسجلت.");
      await Promise.all([refreshSavedMeals(), Promise.resolve(onLogged())]);
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نسجّل الوجبة المحفوظة."));
    } finally { setBusy(false); }
  }

  async function createManualSavedMeal() {
    setError(null); setMessage(null); setBusy(true);
    try {
      await saveGainMeal(userId, {
        label: manualMealName,
        caloriesKcal: Number(manualMealCalories || 0),
        proteinGrams: Number(manualMealProtein || 0),
      });
      setManualMealName(""); setManualMealCalories(""); setManualMealProtein("");
      await refreshSavedMeals();
      setMessage("الوجبة اتحفظت.");
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نحفظ الوجبة."));
    } finally { setBusy(false); }
  }

  async function removeSavedMeal(mealId: UUID) {
    setError(null); setMessage(null); setBusy(true);
    try {
      await deleteGainSavedMeal(userId, mealId);
      await refreshSavedMeals();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نمسح الوجبة المحفوظة."));
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-3 space-y-3">
      {savedMealsAvailable ? (
        <div className="gc-saved-meals-box">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-black">وجبات محفوظة</p><p className="mt-0.5 text-[10px] font-semibold text-neutral-500">ضغطة واحدة للتسجيل</p></div>
            <span className="text-[10px] font-black tabular-nums text-neutral-500">{savedMeals.length}</span>
          </div>

          {quickMeals.length ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {quickMeals.map((meal) => (
                <button key={meal.id} type="button" disabled={busy} onClick={() => void logSavedMeal(meal)} className="gc-saved-meal-chip disabled:opacity-50">
                  <Plus className="h-3.5 w-3.5" />
                  <span><strong>{meal.label}</strong><small>{meal.caloriesKcal} kcal · {numberText(meal.proteinGrams)}g</small></span>
                </button>
              ))}
            </div>
          ) : <p className="mt-2 text-[10px] font-semibold text-neutral-500">احفظ وجبة بتتكرر، وهتلاقيها هنا.</p>}

          <details className="mt-2 group">
            <summary className="flex min-h-9 list-none items-center gap-2 text-[10px] font-black text-neutral-500 [&::-webkit-details-marker]:hidden"><BookmarkPlus className="h-3.5 w-3.5" /><span className="min-w-0 flex-1">إدارة الوجبات المحفوظة</span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-overlay)] p-2.5">
                <label className="col-span-2 text-[9px] font-black text-neutral-500">اسم الوجبة<input value={manualMealName} onChange={(event) => setManualMealName(event.target.value.slice(0, 80))} className="gc-input mt-1" placeholder="مثال: فطار ثابت" /></label>
                <label className="text-[9px] font-black text-neutral-500">kcal<input value={manualMealCalories} onChange={(event) => setManualMealCalories(event.target.value)} inputMode="numeric" className="gc-input mt-1 text-center" /></label>
                <label className="text-[9px] font-black text-neutral-500">بروتين g<input value={manualMealProtein} onChange={(event) => setManualMealProtein(event.target.value)} inputMode="decimal" className="gc-input mt-1 text-center" /></label>
                <button type="button" disabled={busy} onClick={() => void createManualSavedMeal()} className="gc-secondary-button col-span-2 min-h-9 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> احفظ الوجبة</button>
              </div>
              {savedMeals.map((meal) => (
                <div key={meal.id} className="gc-food-entry">
                  <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{meal.label}</strong><span className="text-[10px] tabular-nums text-neutral-500">{meal.caloriesKcal} kcal · {numberText(meal.proteinGrams)}g · استُخدمت {meal.useCount}</span></span>
                  <button type="button" disabled={busy} onClick={() => void removeSavedMeal(meal.id)} aria-label="امسح الوجبة المحفوظة" className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-red-400/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : <p className="gc-inline-error">الوجبات المحفوظة محتاجة تحديث قاعدة البيانات Phase 11.</p>}

      <details className="gc-ai-premium-lock gc-ai-premium-secondary group">
        <summary className="flex min-h-11 list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
          <span className="gc-ai-premium-icon"><Sparkles className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1 text-start">
            <span className="flex flex-wrap items-center gap-2"><strong className="text-xs">AI Food Logging</strong><span className="gc-premium-badge"><Crown className="h-3 w-3" /> Premium</span></span>
            <small className="mt-0.5 block text-[10px] font-semibold text-neutral-500">اختياري · التسجيل اليدوي فوق، وافتح ده لو عايز تقدير AI</small>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 border-t border-[var(--border)] pt-3">
          <div className="flex items-start gap-2">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-xs leading-5 text-neutral-500">اكتب الوجبة بطريقتك، وOVRLD يقدّر السعرات والبروتين قبل ما تسجلها. الميزة محجوزة لـ OVRLD Premium ولسه مش متاحة للتفعيل في النسخة الحالية.</p>
          </div>
          <button type="button" className="gc-secondary-button mt-3 w-full" disabled aria-disabled="true"><Crown className="h-4 w-4" /> Premium · قريبًا</button>
        </div>
      </details>

      {error ? <p className="gc-inline-error">{error}</p> : null}
      {message ? <p className="gc-inline-success">{message}</p> : null}
    </div>
  );
}
