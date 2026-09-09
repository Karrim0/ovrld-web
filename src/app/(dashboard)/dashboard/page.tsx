import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { getGroupMembershipForUser } from "@/features/groups/services/group.server";
import { createClient } from "@/lib/supabase/server";
import { TodaysWorkoutClient } from "@/features/workouts/components/TodaysWorkoutClient";
import { HomeLogDataAction } from "@/features/dashboard/components/HomeLogDataAction";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const membership = await getGroupMembershipForUser(user.id);
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed_at) redirect("/body-goal");
  const displayName = profile.display_name ?? "لاعب";

  return (
    <>
      <DashboardHeader title={`أهلاً، ${displayName}`} />
      <PageContainer className="space-y-3 pb-8 pt-4">
        <TodaysWorkoutClient userId={user.id} compact />
        <HomeLogDataAction />
      </PageContainer>
    </>
  );
}
