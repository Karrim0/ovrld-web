import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { getGroupMembershipForUser } from "@/features/groups/services/group.server";
import { createClient } from "@/lib/supabase/server";
import { PersonalSplitOverviewClient } from "@/features/dashboard/components/PersonalSplitOverviewClient";
import { GainModeHomeCard } from "@/features/gain-mode/components/GainModeHomeCard";
import { TodaysWorkoutClient } from "@/features/workouts/components/TodaysWorkoutClient";

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
      <PageContainer className="space-y-4 pb-8 pt-4">
        <TodaysWorkoutClient userId={user.id} compact />
        <GainModeHomeCard userId={user.id} />

        <section className="gc-home-section">
          <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
            <h2 className="text-base font-black">الأسبوع</h2>
            <Link href="/split/personal" className="text-xs font-bold text-indigo-300">تعديل</Link>
          </div>
          <PersonalSplitOverviewClient userId={user.id} compact />
        </section>
      </PageContainer>
    </>
  );
}
