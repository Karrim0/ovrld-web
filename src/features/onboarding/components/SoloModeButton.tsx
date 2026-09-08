"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { createSoloWorkspace } from "@/features/groups/services/group.service";

export function SoloModeButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enableSoloMode() {
    setIsLoading(true);
    setError(null);
    try {
      await createSoloWorkspace();
      router.replace("/body-goal");
      router.refresh();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نبدأ الوضع الفردي."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void enableSoloMode()}
        disabled={isLoading}
        className="gc-card-interactive flex w-full items-center gap-4 p-4 text-start disabled:opacity-50"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-300 text-neutral-950">
          <Dumbbell className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">ابدأ مساحتك الشخصية</span>
          <span className="mt-0.5 block text-sm text-neutral-400">
            {isLoading ? "بنجهّزلك مكانك…" : "ظبّط جدولك، سجّل كل سِت، وخلي تقدمك يتجمع تلقائيًا."}
          </span>
        </span>
        <ArrowLeft className="h-5 w-5 text-neutral-500" />
      </button>
      {error ? <p className="rounded-xl bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}
