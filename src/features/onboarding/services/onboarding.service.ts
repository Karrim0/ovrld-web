import type { UUID } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentGroupMembership } from "@/features/groups/services/group.service";

export type PostAuthDestination = "/dashboard" | "/onboarding" | "/body-goal";

/**
 * Onboarding is complete only after the user has a workspace AND has explicitly
 * chosen Training only or a Goal Mode. This prevents a newly-created solo
 * workspace from skipping the goal step.
 */
export async function resolvePostAuthDestination(userId: UUID): Promise<PostAuthDestination> {
  const membership = await fetchCurrentGroupMembership(userId);
  if (!membership) return "/onboarding";

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.onboarding_completed_at ? "/dashboard" : "/body-goal";
}
