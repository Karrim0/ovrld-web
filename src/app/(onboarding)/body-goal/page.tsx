import { redirect } from "next/navigation";

/**
 * Legacy Phase 6 route kept only as a safe redirect.
 * Pass 6 consolidated onboarding into /onboarding so there is one flow and one source of truth.
 */
export default function BodyGoalOnboardingPage() {
  redirect("/onboarding");
}
