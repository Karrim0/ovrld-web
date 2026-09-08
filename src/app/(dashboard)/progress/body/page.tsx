import Link from "next/link";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { BodyProgressClient } from "@/features/body-progress";
import { GainModeProgressCard } from "@/features/gain-mode/components/GainModeProgressCard";

export default async function BodyProgressPage() {
  const user = await requireCurrentUser();
  return (
    <>
      <DashboardHeader title="الجسم والوزن" />
      <PageContainer className="pb-8">
        <div className="sticky top-[68px] z-20 mt-3 rounded-2xl border border-white/[0.06] bg-[var(--gc-surface)] p-1 backdrop-blur">
          <div className="grid grid-cols-2 gap-1"><Link href="/progress" className="rounded-xl px-3 py-2.5 text-center text-sm font-bold text-neutral-500">التمرين</Link><span className="rounded-xl bg-indigo-300 px-3 py-2.5 text-center text-sm font-black text-[#11131a]">الجسم والوزن</span></div>
        </div>
        <div className="space-y-4 pt-4"><GainModeProgressCard userId={user.id} /><BodyProgressClient userId={user.id} /></div>
      </PageContainer>
    </>
  );
}
