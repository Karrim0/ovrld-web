import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { JourneyHistoryClient } from "@/features/journey/components/JourneyHistoryClient";

export default async function JourneyHistoryPage() {
  const user = await requireCurrentUser();
  return <><DashboardHeader title="History" showBackButton /><PageContainer><JourneyHistoryClient userId={user.id} /></PageContainer></>;
}
