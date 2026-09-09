import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { GainTrainingIntegrationClient } from "@/features/gain-mode/components/GainTrainingIntegrationClient";

export default async function GainTrainingPage() {
  const user = await requireCurrentUser();
  return (
    <>
      <DashboardHeader title="التمرين والهدف" showBackButton />
      <PageContainer><GainTrainingIntegrationClient userId={user.id} /></PageContainer>
    </>
  );
}
