import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { GainModeHubClient } from "@/features/gain-mode";

export default async function GainModePage() {
  const user = await requireCurrentUser();
  return (
    <>
      <DashboardHeader title="Gain Mode" showBackButton />
      <PageContainer><GainModeHubClient userId={user.id} /></PageContainer>
    </>
  );
}
