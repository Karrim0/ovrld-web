import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { BodyProgressClient } from "@/features/body-progress";
import { ProgressTabs } from "@/features/progress/components/ProgressTabs";

export default async function BodyProgressPage() {
  const user = await requireCurrentUser();
  return (
    <>
      <DashboardHeader title="الجسم والوزن" />
      <PageContainer className="pb-8">
        <div className="sticky top-[66px] z-20 mt-3"><ProgressTabs active="body" /></div>
        <div className="pt-4"><BodyProgressClient userId={user.id} /></div>
      </PageContainer>
    </>
  );
}
