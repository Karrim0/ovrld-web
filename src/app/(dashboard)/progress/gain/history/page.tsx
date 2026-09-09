import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { GainHistoryClient } from "@/features/gain-mode/components/GainHistoryClient";

export default async function GainHistoryPage() {
  const user = await requireCurrentUser();
  return (
    <>
      <DashboardHeader title="سجل الرحلة" showBackButton />
      <PageContainer><GainHistoryClient userId={user.id} /></PageContainer>
    </>
  );
}
