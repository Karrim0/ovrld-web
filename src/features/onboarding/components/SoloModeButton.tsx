"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { createSoloWorkspace } from "@/features/groups/services/group.service";
import { getArabicErrorMessage } from "@/lib/localization";

/**
 * Legacy compatibility shim. New onboarding creates the solo workspace from
 * OnboardingWizard; this button only routes into that same canonical flow.
 */
export function SoloModeButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueToOnboarding() {
    setBusy(true);
    setError(null);
    try {
      await createSoloWorkspace();
      router.replace("/onboarding");
      router.refresh();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نجهّز وضع Solo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" className="gc-primary-button w-full" disabled={busy} onClick={() => void continueToOnboarding()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "بنجهّز…" : "كمّل الإعداد"}
      </button>
      {error ? <p className="text-xs font-semibold text-red-400">{error}</p> : null}
    </div>
  );
}
