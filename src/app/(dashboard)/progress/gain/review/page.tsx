import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { GainReviewClient } from "@/features/gain-mode";

export default async function GainModeReviewPage() {
  const user = await requireCurrentUser();
  return (
    <>
      <DashboardHeader title="مراجعة Gain Mode" showBackButton />
      <PageContainer><GainReviewClient userId={user.id} /></PageContainer>
    </>
  );
}
