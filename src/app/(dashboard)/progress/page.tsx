import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { ProgressDashboardClient } from "@/features/progress/components/ProgressDashboardClient";
import { ProgressTabs } from "@/features/progress/components/ProgressTabs";

export default async function ProgressPage() {
  const user = await requireCurrentUser();
  return (
    <>
      <DashboardHeader title="تقدمي" />
      <PageContainer className="pb-8">
        <div className="sticky top-[66px] z-20 mt-3"><ProgressTabs active="training" /></div>
        <ProgressDashboardClient userId={user.id} />
      </PageContainer>
    </>
  );
}
