import { createClient } from "@/lib/supabase/client";
import { addDaysToDate, getTodayISODate, toISODateOnly } from "@/lib/dates";
import type { ISODateOnlyString, UUID } from "@/types";
import type { GainNutritionDaySummary, GainNutritionEntry } from "../types";

type NutritionRow = {
  id: string;
  user_id: string;
  logged_on: string;
  label: string;
  calories_kcal: number;
  protein_grams: number | string;
  created_at: string;
  updated_at: string;
};

function mapEntry(row: NutritionRow): GainNutritionEntry {
  return {
    id: row.id,
    userId: row.user_id,
    loggedOn: row.logged_on,
    label: row.label,
    caloriesKcal: Number(row.calories_kcal),
    proteinGrams: Number(row.protein_grams),
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
  return (data ?? []).map((row) => mapEntry(row as NutritionRow));
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
  const { data, error } = await supabase
    .from("gain_nutrition_entries")
    .insert({
      user_id: userId,
      logged_on: input.loggedOn ?? getTodayISODate(),
      label: input.label?.trim().slice(0, 80) ?? "",
      calories_kcal: caloriesKcal,
      protein_grams: proteinGrams,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapEntry(data as NutritionRow);
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

export async function saveGainNutritionTargets(
  userId: UUID,
  calorieTargetKcal: number | null,
  proteinTargetGrams: number | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("gain_mode_profiles")
    .update({
      calorie_target_kcal: calorieTargetKcal,
      protein_target_grams: proteinTargetGrams,
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
