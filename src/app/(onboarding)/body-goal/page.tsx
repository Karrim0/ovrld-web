import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { getGroupMembershipForUser } from "@/features/groups/services/group.server";
import { GoalSetupClient } from "@/features/onboarding/components/GoalSetupClient";
import { createClient } from "@/lib/supabase/server";

export default async function BodyGoalOnboardingPage() {
  const user = await requireCurrentUser();
  const membership = await getGroupMembershipForUser(user.id);
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).maybeSingle();
  if (data?.onboarding_completed_at) redirect("/dashboard");

  return <GoalSetupClient userId={user.id} />;
}
