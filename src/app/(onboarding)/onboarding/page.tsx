import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { getGroupMembershipForUser } from "@/features/groups/services/group.server";
import { OnboardingWizard } from "@/features/onboarding/components/OnboardingWizard";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const user = await requireCurrentUser();
  const [membership, supabase] = await Promise.all([
    getGroupMembershipForUser(user.id),
    createClient(),
  ]);
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (profile?.onboarding_completed_at) redirect("/dashboard");

  return <OnboardingWizard userId={user.id} initialHasWorkspace={Boolean(membership)} />;
}
