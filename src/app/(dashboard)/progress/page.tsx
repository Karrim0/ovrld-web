import Link from "next/link";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { ProgressDashboardClient } from "@/features/progress/components/ProgressDashboardClient";

export default async function ProgressPage() {
  const user = await requireCurrentUser();
  return (
    <>
      <DashboardHeader title="تقدمي" />
      <PageContainer className="pb-8">
        <div className="sticky top-[68px] z-20 mt-3 rounded-2xl border border-white/[0.06] bg-[var(--gc-surface)] p-1 backdrop-blur">
          <div className="grid grid-cols-2 gap-1"><span className="rounded-xl bg-indigo-300 px-3 py-2.5 text-center text-sm font-black text-[#11131a]">التمرين</span><Link href="/progress/body" className="rounded-xl px-3 py-2.5 text-center text-sm font-bold text-neutral-500">الجسم والوزن</Link></div>
        </div>
        <ProgressDashboardClient userId={user.id} />
      </PageContainer>
    </>
  );
}
