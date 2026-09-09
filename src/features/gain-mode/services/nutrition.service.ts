import { createClient } from "@/lib/supabase/client";
import { addDaysToDate, getTodayISODate, toISODateOnly } from "@/lib/dates";
import type { ISODateOnlyString, UUID } from "@/types";
import type {
  GainNutritionDaySummary,
  GainNutritionEntry,
  GainNutritionEntrySource,
  GainSavedMeal,
} from "../types";

type NutritionRow = {
  id: string;
  user_id: string;
  logged_on: string;
  label: string;
  calories_kcal: number;
  protein_grams: number | string;
  source?: string | null;
  created_at: string;
  updated_at: string;
};

type SavedMealRow = {
  id: string;
  user_id: string;
  label: string;
  calories_kcal: number;
  protein_grams: number | string;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

function nutritionSource(value: string | null | undefined): GainNutritionEntrySource {
  if (value === "ai" || value === "saved") return value;
  return "manual";
}

function mapEntry(row: NutritionRow): GainNutritionEntry {
  return {
    id: row.id,
    userId: row.user_id,
    loggedOn: row.logged_on,
    label: row.label,
    caloriesKcal: Number(row.calories_kcal),
    proteinGrams: Number(row.protein_grams),
    source: nutritionSource(row.source),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSavedMeal(row: SavedMealRow): GainSavedMeal {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    caloriesKcal: Number(row.calories_kcal),
    proteinGrams: Number(row.protein_grams),
    useCount: Number(row.use_count),
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function ratio(value: number, target: number | null): number | null {
  if (!target || target <= 0) return null;
  return value / target;
}

export function summarizeNutritionDay(
  date: ISODateOnlyString,
  entries: GainNutritionEntry[],
  calorieTargetKcal: number | null,
  proteinTargetGrams: number | null,
): GainNutritionDaySummary {
  const caloriesKcal = entries.reduce((sum, entry) => sum + entry.caloriesKcal, 0);
  const proteinGrams = entries.reduce((sum, entry) => sum + entry.proteinGrams, 0);
  return {
    date,
    caloriesKcal,
    proteinGrams: Math.round(proteinGrams * 10) / 10,
    calorieTargetKcal,
    proteinTargetGrams,
    calorieProgress: ratio(caloriesKcal, calorieTargetKcal),
    proteinProgress: ratio(proteinGrams, proteinTargetGrams),
    entries,
  };
}

export async function fetchGainNutritionRange(
  userId: UUID,
  startDate: ISODateOnlyString,
  endDate: ISODateOnlyString,
): Promise<GainNutritionEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gain_nutrition_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_on", startDate)
    .lte("logged_on", endDate)
    .order("logged_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: unknown) => mapEntry(row as NutritionRow));
}

export async function fetchGainNutritionDay(
  userId: UUID,
  date: ISODateOnlyString = getTodayISODate(),
  calorieTargetKcal: number | null = null,
  proteinTargetGrams: number | null = null,
): Promise<GainNutritionDaySummary> {
  const entries = await fetchGainNutritionRange(userId, date, date);
  return summarizeNutritionDay(date, entries, calorieTargetKcal, proteinTargetGrams);
}

export async function fetchGainNutritionWeek(
  userId: UUID,
  calorieTargetKcal: number | null,
  proteinTargetGrams: number | null,
): Promise<GainNutritionDaySummary[]> {
  const today = new Date();
  const start = addDaysToDate(today, -6);
  const startDate = toISODateOnly(start);
  const endDate = getTodayISODate();
  const entries = await fetchGainNutritionRange(userId, startDate, endDate);

  return Array.from({ length: 7 }, (_, index) => {
    const date = toISODateOnly(addDaysToDate(start, index));
    return summarizeNutritionDay(
      date,
      entries.filter((entry) => entry.loggedOn === date),
      calorieTargetKcal,
      proteinTargetGrams,
    );
  });
}

export interface AddGainNutritionEntryInput {
  loggedOn?: ISODateOnlyString;
  label?: string;
  caloriesKcal: number;
  proteinGrams: number;
  source?: GainNutritionEntrySource;
}

export async function addGainNutritionEntry(
  userId: UUID,
  input: AddGainNutritionEntryInput,
): Promise<GainNutritionEntry> {
  const caloriesKcal = Math.round(input.caloriesKcal);
  const proteinGrams = Math.round(input.proteinGrams * 10) / 10;
  if (!Number.isFinite(caloriesKcal) || caloriesKcal < 0 || caloriesKcal > 5000) {
    throw new Error("راجع سعرات الوجبة.");
  }
  if (!Number.isFinite(proteinGrams) || proteinGrams < 0 || proteinGrams > 300) {
    throw new Error("راجع بروتين الوجبة.");
  }
  if (caloriesKcal === 0 && proteinGrams === 0) {
    throw new Error("سجّل سعرات أو بروتين على الأقل.");
  }

  const supabase = createClient();
  const basePayload = {
    user_id: userId,
    logged_on: input.loggedOn ?? getTodayISODate(),
    label: input.label?.trim().slice(0, 80) ?? "",
    calories_kcal: caloriesKcal,
    protein_grams: proteinGrams,
  };
  const first = await supabase
    .from("gain_nutrition_entries")
    .insert({ ...basePayload, source: input.source ?? "manual" })
    .select("*")
    .single();

  if (!first.error) return mapEntry(first.data as NutritionRow);

  // Keep Phase 8 manual logging usable during a short deploy window before the Phase 11 migration lands.
  const sourceColumnMissing = first.error.code === "PGRST204" || /source.*column|column.*source/i.test(first.error.message);
  if (!sourceColumnMissing) throw new Error(first.error.message);

  const fallback = await supabase
    .from("gain_nutrition_entries")
    .insert(basePayload)
    .select("*")
    .single();
  if (fallback.error) throw new Error(fallback.error.message);
  return mapEntry(fallback.data as NutritionRow);
}

export async function deleteGainNutritionEntry(userId: UUID, entryId: UUID): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("gain_nutrition_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function fetchGainSavedMeals(userId: UUID): Promise<GainSavedMeal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gain_saved_meals")
    .select("*")
    .eq("user_id", userId)
    .order("use_count", { ascending: false })
    .order("last_used_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: unknown) => mapSavedMeal(row as SavedMealRow));
}

export interface SaveGainMealInput {
  label: string;
  caloriesKcal: number;
  proteinGrams: number;
}

export async function saveGainMeal(userId: UUID, input: SaveGainMealInput): Promise<GainSavedMeal> {
  const label = input.label.trim().slice(0, 80);
  const caloriesKcal = Math.round(input.caloriesKcal);
  const proteinGrams = Math.round(input.proteinGrams * 10) / 10;
  if (!label) throw new Error("اكتب اسم للوجبة المحفوظة.");
  if (!Number.isFinite(caloriesKcal) || caloriesKcal < 0 || caloriesKcal > 5000) throw new Error("راجع سعرات الوجبة.");
  if (!Number.isFinite(proteinGrams) || proteinGrams < 0 || proteinGrams > 300) throw new Error("راجع بروتين الوجبة.");
  if (caloriesKcal === 0 && proteinGrams === 0) throw new Error("سجّل سعرات أو بروتين على الأقل.");

  const existing = await fetchGainSavedMeals(userId);
  const match = existing.find((meal) => meal.label.trim().toLocaleLowerCase("ar-EG") === label.toLocaleLowerCase("ar-EG"));
  const supabase = createClient();
  if (match) {
    const { data, error } = await supabase
      .from("gain_saved_meals")
      .update({ calories_kcal: caloriesKcal, protein_grams: proteinGrams })
      .eq("id", match.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapSavedMeal(data as SavedMealRow);
  }

  const { data, error } = await supabase
    .from("gain_saved_meals")
    .insert({ user_id: userId, label, calories_kcal: caloriesKcal, protein_grams: proteinGrams })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapSavedMeal(data as SavedMealRow);
}

export async function deleteGainSavedMeal(userId: UUID, mealId: UUID): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("gain_saved_meals")
    .delete()
    .eq("id", mealId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function logGainSavedMeal(mealId: UUID, loggedOn: ISODateOnlyString = getTodayISODate()): Promise<UUID> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("log_gain_saved_meal", {
    target_saved_meal_id: mealId,
    target_logged_on: loggedOn,
  });
  if (error) throw new Error(error.message);
  return data as UUID;
}

export async function saveGainNutritionTargets(
  userId: UUID,
  calorieTargetKcal: number | null,
  proteinTargetGrams: number | null,
): Promise<void> {
  const supabase = createClient();
  const { data: current, error: lookupError } = await supabase
    .from("gain_mode_profiles")
    .select("calorie_target_kcal")
    .eq("user_id", userId)
    .single();
  if (lookupError) throw new Error(lookupError.message);

  const previousCalories = current.calorie_target_kcal == null ? null : Number(current.calorie_target_kcal);
  if (calorieTargetKcal !== null && calorieTargetKcal !== previousCalories) {
    const { error: rpcError } = await supabase.rpc("apply_gain_calorie_adjustment", {
      target_calorie_kcal: Math.round(calorieTargetKcal),
      adjustment_reason: "تعديل يدوي لهدف السعرات",
      adjustment_source: "manual",
      period_start: undefined,
      period_end: undefined,
    });
    if (rpcError) throw new Error(rpcError.message);
  } else if (calorieTargetKcal === null && previousCalories !== null) {
    const { error: resetError } = await supabase
      .from("gain_mode_profiles")
      .update({ calorie_target_kcal: null })
      .eq("user_id", userId);
    if (resetError) throw new Error(resetError.message);
  }

  const { error } = await supabase
    .from("gain_mode_profiles")
    .update({ protein_target_grams: proteinTargetGrams })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
