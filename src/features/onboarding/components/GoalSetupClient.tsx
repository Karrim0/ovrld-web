import type { UUID } from "@/types";
import { OnboardingWizard } from "./OnboardingWizard";

/**
 * Legacy component name retained as a compatibility shim for overlay patches.
 * The product has one onboarding implementation: OnboardingWizard.
 */
export function GoalSetupClient({ userId }: { userId: UUID }) {
  return <OnboardingWizard userId={userId} initialHasWorkspace />;
}
