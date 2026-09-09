import Link from "next/link";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { createClient } from "@/lib/supabase/server";
import { PersonalSplitOverviewClient } from "@/features/dashboard/components/PersonalSplitOverviewClient";
import { HomeLogDataAction } from "@/features/dashboard/components/HomeLogDataAction";
import { GainModeHomeCard } from "@/features/gain-mode/components/GainModeHomeCard";
import { TodaysWorkoutClient } from "@/features/workouts/components/TodaysWorkoutClient";
import { LocalizedText } from "@/components/localization/LocalizedText";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name ?? "لاعب";

  return (
    <>
      <DashboardHeader title={`أهلاً، ${displayName}`} />
      <PageContainer className="space-y-5 pb-8 pt-4">
        <TodaysWorkoutClient userId={user.id} compact />

        <HomeLogDataAction compact />

        <GainModeHomeCard userId={user.id} />

        <section className="gc-home-section">
          <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
            <h2 className="text-base font-black"><LocalizedText ar="الأسبوع" en="This week" /></h2>
            <Link href="/split/personal" className="text-xs font-bold text-[var(--accent-strong)]"><LocalizedText ar="تعديل" en="Edit" /></Link>
          </div>
          <PersonalSplitOverviewClient userId={user.id} compact />
        </section>
      </PageContainer>
    </>
  );
}
