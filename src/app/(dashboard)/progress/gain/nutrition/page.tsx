import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { GainNutritionPageClient } from "@/features/gain-mode/components/GainNutritionPageClient";

export default async function GainNutritionPage() {
  const user = await requireCurrentUser();
  return (
    <>
      <DashboardHeader title="التغذية" showBackButton />
      <PageContainer><GainNutritionPageClient userId={user.id} /></PageContainer>
    </>
  );
}
