import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
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
      <DashboardHeader title={`أهلاً يا ${displayName}`} />
      <PageContainer className="space-y-5 pb-8 pt-4">
        <section>
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div><p className="gc-eyebrow">النهارده</p><h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">إيه عليك دلوقتي؟</h2></div>
            <Sparkles className="h-5 w-5 text-indigo-300" />
          </div>
          <TodaysWorkoutClient userId={user.id} compact />
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div><p className="gc-eyebrow">المتابعة</p><h2 className="mt-1 text-xl font-bold">أهم خطوة في الـprocess</h2></div>
            <Link href="/progress" className="text-xs font-bold text-indigo-300">شوف تقدمك</Link>
          </div>
          <GainModeHomeCard userId={user.id} />
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div><p className="gc-eyebrow">الأسبوع</p><h2 className="mt-1 text-xl font-bold">جدولك في نظرة</h2></div>
            <Link href="/split/personal" className="text-xs font-bold text-indigo-300">عدّل</Link>
          </div>
          <PersonalSplitOverviewClient userId={user.id} compact />
        </section>
      </PageContainer>
    </>
  );
}
