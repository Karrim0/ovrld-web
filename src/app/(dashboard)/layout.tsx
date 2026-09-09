import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { getGroupMembershipForUser } from "@/features/groups/services/group.server";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();
  const [membership, supabase] = await Promise.all([
    getGroupMembershipForUser(user.id),
    createClient(),
  ]);

  if (!membership) redirect("/onboarding");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  return <AppShell>{children}</AppShell>;
}
