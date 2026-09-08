import type { ReactNode } from "react";
import { AuthShell } from "@/components/layout/AuthShell";
import { requireCurrentUser } from "@/features/auth/services/auth.server";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  await requireCurrentUser();
  return <AuthShell>{children}</AuthShell>;
}
