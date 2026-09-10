import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { cacheProfile, getCachedProfile } from "@/lib/offline";
import type { UUID, UserProfile } from "@/types";
import type { UpdateProfileInput } from "../schemas/update-profile.schema";

type ProfileRow = Tables<"profiles">;

export function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    ageYears: row.age_years,
    sex: row.sex === "male" ? "male" : row.sex === "female" ? "female" : null,
    trainingLevel: row.training_level as UserProfile["trainingLevel"],
    weeklyTrainingDays: row.weekly_training_days,
    additionalRestDays: row.additional_rest_days,
    shareWorkoutSummary: row.share_workout_summary,
    sharePersonalRecords: row.share_personal_records,
    shareWeights: row.share_weights,
    splitSetupMethod: row.split_setup_method as UserProfile["splitSetupMethod"],
    splitSetupCompletedAt: row.split_setup_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProfile(userId: UUID): Promise<UserProfile | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const profile = data ? mapProfile(data) : null;
    if (profile) await cacheProfile(profile);
    return profile;
  } catch (caught) {
    const cached = await getCachedProfile(userId);
    if (cached) return cached;
    throw caught;
  }
}

export async function updateProfile(userId: UUID, input: UpdateProfileInput): Promise<UserProfile> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName.trim(),
      avatar_url: input.avatarUrl ?? null,
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const profile = mapProfile(data);
  await cacheProfile(profile);
  return profile;
}

export async function uploadProfileAvatar(userId: UUID, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("اختار ملف صورة.");
  if (file.size > 2 * 1024 * 1024) throw new Error("الصورة لازم تبقى أقل من 2 ميجا.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) throw new Error(error.message);
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export interface SharingPreferencesInput {
  shareWorkoutSummary: boolean;
  sharePersonalRecords: boolean;
  shareWeights: boolean;
}

export async function updateSharingPreferences(
  userId: UUID,
  input: SharingPreferencesInput,
): Promise<UserProfile> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      share_workout_summary: input.shareWorkoutSummary,
      share_personal_records: input.sharePersonalRecords,
      share_weights: input.shareWeights,
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const profile = mapProfile(data);
  await cacheProfile(profile);
  return profile;
}

export interface TrainingProfileBasicsInput {
  ageYears: number;
  sex: NonNullable<UserProfile["sex"]>;
  trainingLevel: NonNullable<UserProfile["trainingLevel"]>;
  weeklyTrainingDays: number;
}

/**
 * Profiles are the canonical home for general fitness basics introduced in Pass 6.
 * gain_mode_profiles.age_years is kept in sync by the Pass 6 database trigger as
 * a compatibility mirror for the existing Gain schema.
 */
export async function updateTrainingProfileBasics(
  userId: UUID,
  input: TrainingProfileBasicsInput,
): Promise<UserProfile> {
  const ageYears = Math.round(input.ageYears);
  const weeklyTrainingDays = Math.round(input.weeklyTrainingDays);
  if (ageYears < 13 || ageYears > 100) throw new Error("راجع السن.");
  if (!["female", "male"].includes(input.sex)) throw new Error("راجع الجنس.");
  if (!["beginner", "intermediate", "advanced"].includes(input.trainingLevel)) throw new Error("راجع مستوى التدريب.");
  if (weeklyTrainingDays < 1 || weeklyTrainingDays > 7) throw new Error("راجع عدد أيام التمرين.");

  const supabase = createClient();
  const { data: gainProfile, error: gainLookupError } = await supabase
    .from("gain_mode_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (gainLookupError) throw new Error(gainLookupError.message);
  if (gainProfile && (ageYears < 18 || ageYears > 80)) {
    throw new Error("Gain Mode الحالي بيدعم سن من 18 لـ80.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      age_years: ageYears,
      sex: input.sex,
      training_level: input.trainingLevel,
      weekly_training_days: weeklyTrainingDays,
    })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const profile = mapProfile(data);
  await cacheProfile(profile);
  return profile;
}

