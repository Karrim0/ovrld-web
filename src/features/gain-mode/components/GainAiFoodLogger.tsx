"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookmarkPlus, BrainCircuit, ChevronDown, LoaderCircle, Plus, Save, Sparkles, Trash2, Utensils } from "lucide-react";
import type { UUID } from "@/types";
import { getArabicErrorMessage } from "@/lib/localization";
import {
  addGainNutritionEntry,
  deleteGainSavedMeal,
  fetchGainSavedMeals,
  logGainSavedMeal,
  saveGainMeal,
} from "../services/nutrition.service";
import type { GainAiFoodEstimate, GainSavedMeal } from "../types";

function numberText(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function confidenceLabel(value: GainAiFoodEstimate["confidence"]) {
  if (value === "high") return "ثقة أعلى";
  if (value === "medium") return "تقدير متوسط";
  return "تقريبي جدًا";
}

export function GainAiFoodLogger({ userId, onLogged }: { userId: UUID; onLogged: () => Promise<void> | void }) {
  const [foodText, setFoodText] = useState("");
  const [estimate, setEstimate] = useState<GainAiFoodEstimate | null>(null);
  const [reviewLabel, setReviewLabel] = useState("");
  const [reviewCalories, setReviewCalories] = useState("");
  const [reviewProtein, setReviewProtein] = useState("");
  const [savedMeals, setSavedMeals] = useState<GainSavedMeal[]>([]);
  const [savedMealsAvailable, setSavedMealsAvailable] = useState(true);
  const [manualMealName, setManualMealName] = useState("");
  const [manualMealCalories, setManualMealCalories] = useState("");
  const [manualMealProtein, setManualMealProtein] = useState("");
  const [estimating, setEstimating] = useState(false);
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
    void refreshSavedMeals();
  }, [refreshSavedMeals]);

  const quickMeals = useMemo(() => savedMeals.slice(0, 6), [savedMeals]);

  async function estimateFood() {
    const text = foodText.trim();
    if (text.length < 3) {
      setError("اكتبي أكلتي إيه الأول.");
      return;
    }
    setError(null);
    setMessage(null);
    setEstimate(null);
    setEstimating(true);
    try {
      const response = await fetch("/api/gain/food/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = await response.json().catch(() => null) as { estimate?: GainAiFoodEstimate; error?: string; message?: string } | null;
      if (!response.ok || !payload?.estimate) throw new Error(payload?.error || "معرفناش نقدّر الأكل.");
      setEstimate(payload.estimate);
      setReviewLabel(payload.estimate.label);
      setReviewCalories(String(payload.estimate.caloriesKcal));
      setReviewProtein(numberText(payload.estimate.proteinGrams));
      setMessage(payload.message || "راجعي التقدير قبل التسجيل.");
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نقدّر الأكل."));
    } finally {
      setEstimating(false);
    }
  }

  function reviewedNumbers() {
    const calories = Number(reviewCalories || 0);
    const protein = Number(reviewProtein || 0);
    if (!Number.isFinite(calories) || calories < 0 || calories > 5000) throw new Error("راجع سعرات الوجبة.");
    if (!Number.isFinite(protein) || protein < 0 || protein > 300) throw new Error("راجع بروتين الوجبة.");
    if (calories === 0 && protein === 0) throw new Error("سجّل سعرات أو بروتين على الأقل.");
    return { caloriesKcal: calories, proteinGrams: protein };
  }

  async function logEstimate() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const numbers = reviewedNumbers();
      await addGainNutritionEntry(userId, {
        label: reviewLabel || estimate?.label || "تقدير ذكي",
        ...numbers,
        source: "ai",
      });
      setFoodText("");
      setEstimate(null);
      setReviewLabel("");
      setReviewCalories("");
      setReviewProtein("");
      setMessage("اتسجل بعد مراجعتك.");
      await onLogged();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نسجّل التقدير."));
    } finally {
      setBusy(false);
    }
  }

  async function saveEstimateAsMeal() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const numbers = reviewedNumbers();
      const label = reviewLabel.trim() || estimate?.label || "وجبة محفوظة";
      await saveGainMeal(userId, { label, ...numbers });
      await refreshSavedMeals();
      setMessage("الوجبة اتحفظت للاستخدام السريع.");
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نحفظ الوجبة."));
    } finally {
      setBusy(false);
    }
  }

  async function logSavedMeal(meal: GainSavedMeal) {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await logGainSavedMeal(meal.id);
      setMessage("الوجبة المحفوظة اتسجلت.");
      await Promise.all([refreshSavedMeals(), Promise.resolve(onLogged())]);
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نسجّل الوجبة المحفوظة."));
    } finally {
      setBusy(false);
    }
  }

  async function createManualSavedMeal() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await saveGainMeal(userId, {
        label: manualMealName,
        caloriesKcal: Number(manualMealCalories || 0),
        proteinGrams: Number(manualMealProtein || 0),
      });
      setManualMealName("");
      setManualMealCalories("");
      setManualMealProtein("");
      await refreshSavedMeals();
      setMessage("الوجبة اتحفظت.");
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نحفظ الوجبة."));
    } finally {
      setBusy(false);
    }
  }

  async function removeSavedMeal(mealId: UUID) {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await deleteGainSavedMeal(userId, mealId);
      await refreshSavedMeals();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نمسح الوجبة المحفوظة."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="gc-ai-food-box">
        <div className="flex items-center gap-2">
          <span className="gc-ai-food-icon"><BrainCircuit className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black">اكتبي أكلتي إيه</p>
            <p className="mt-0.5 text-[10px] font-semibold text-neutral-500">OVRLD يقدّر السعرات والبروتين، وإنتِ تراجعي قبل الحفظ.</p>
          </div>
          <span className="gc-mini-badge">AI</span>
        </div>

        <textarea
          value={foodText}
          onChange={(event) => setFoodText(event.target.value.slice(0, 700))}
          rows={3}
          className="gc-input mt-3 min-h-20 resize-none leading-5"
          placeholder="مثال: أكلت 2 بيضة، رغيف بلدي، 50 جم جبنة وكوباية لبن"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[9px] font-bold tabular-nums text-neutral-500">{foodText.length}/700</span>
          <button type="button" disabled={estimating || busy} onClick={() => void estimateFood()} className="gc-secondary-button min-h-10 px-4 disabled:opacity-50">
            {estimating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {estimating ? "بنحسب…" : "احسبي تقريبًا"}
          </button>
        </div>
      </div>

      {estimate ? (
        <div className="gc-ai-review-box">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="gc-eyebrow">راجعي قبل التسجيل</p>
              <h4 className="mt-0.5 text-sm font-black">{estimate.label}</h4>
            </div>
            <span className={`gc-ai-confidence gc-ai-confidence-${estimate.confidence}`}>{confidenceLabel(estimate.confidence)}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-[10px] font-black text-neutral-500">اسم التسجيل<input value={reviewLabel} onChange={(event) => setReviewLabel(event.target.value.slice(0, 80))} className="gc-input mt-1" /></label>
            <div />
            <label className="text-[10px] font-black text-neutral-500">kcal<input value={reviewCalories} onChange={(event) => setReviewCalories(event.target.value)} inputMode="numeric" className="gc-input mt-1 text-center font-black" /></label>
            <label className="text-[10px] font-black text-neutral-500">بروتين g<input value={reviewProtein} onChange={(event) => setReviewProtein(event.target.value)} inputMode="decimal" className="gc-input mt-1 text-center font-black" /></label>
          </div>

          <details className="mt-3 group">
            <summary className="flex min-h-9 list-none items-center gap-2 text-[11px] font-black [&::-webkit-details-marker]:hidden">
              <Utensils className="h-3.5 w-3.5 text-neutral-500" />
              <span className="min-w-0 flex-1">تفاصيل التقدير · {estimate.items.length}</span>
              <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-1.5 pt-1">
              {estimate.items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="gc-ai-food-item">
                  <span className="min-w-0 flex-1"><strong>{item.name}</strong><small>{item.quantityText}</small></span>
                  <span className="text-left text-[10px] font-black tabular-nums">{item.caloriesKcal} kcal<br /><small className="font-bold text-neutral-500">{numberText(item.proteinGrams)}g</small></span>
                </div>
              ))}
              {estimate.assumptions.length ? (
                <div className="gc-ai-assumptions">
                  {estimate.assumptions.map((assumption, index) => <p key={`${assumption}-${index}`}>• {assumption}</p>)}
                </div>
              ) : null}
            </div>
          </details>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => void logEstimate()} className="gc-primary-button min-h-10 disabled:opacity-50"><Save className="h-4 w-4" /> سجّلي التقدير</button>
            <button type="button" disabled={busy || !savedMealsAvailable} onClick={() => void saveEstimateAsMeal()} className="gc-secondary-button min-h-10 disabled:opacity-50"><BookmarkPlus className="h-4 w-4" /> احفظي كوجبة</button>
          </div>
          <p className="mt-2 text-[9px] font-semibold leading-4 text-neutral-500">الأرقام تقريبية وبتتغير حسب الكمية والمكونات وطريقة التحضير. الحفظ بيتم فقط بعد مراجعتك.</p>
        </div>
      ) : null}

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
          ) : <p className="mt-2 text-[10px] font-semibold text-neutral-500">احفظي وجبة بتتكرر، وهتلاقيها هنا.</p>}

          <details className="mt-2 group">
            <summary className="flex min-h-9 list-none items-center gap-2 text-[10px] font-black text-neutral-500 [&::-webkit-details-marker]:hidden"><BookmarkPlus className="h-3.5 w-3.5" /><span className="min-w-0 flex-1">إدارة الوجبات المحفوظة</span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-overlay)] p-2.5">
                <label className="col-span-2 text-[9px] font-black text-neutral-500">اسم الوجبة<input value={manualMealName} onChange={(event) => setManualMealName(event.target.value.slice(0, 80))} className="gc-input mt-1" placeholder="مثال: فطار ثابت" /></label>
                <label className="text-[9px] font-black text-neutral-500">kcal<input value={manualMealCalories} onChange={(event) => setManualMealCalories(event.target.value)} inputMode="numeric" className="gc-input mt-1 text-center" /></label>
                <label className="text-[9px] font-black text-neutral-500">بروتين g<input value={manualMealProtein} onChange={(event) => setManualMealProtein(event.target.value)} inputMode="decimal" className="gc-input mt-1 text-center" /></label>
                <button type="button" disabled={busy} onClick={() => void createManualSavedMeal()} className="gc-secondary-button col-span-2 min-h-9 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> احفظي الوجبة</button>
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
      ) : (
        <p className="gc-inline-error">الوجبات المحفوظة محتاجة تحديث قاعدة البيانات Phase 11.</p>
      )}

      {error ? <p className="gc-inline-error">{error}</p> : null}
      {message ? <p className="gc-inline-success">{message}</p> : null}
    </div>
  );
}
