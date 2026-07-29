"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { STORAGE_KEYS, readCompatibleStorage } from "@/config/storage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = STORAGE_KEYS.installDismissed;

export function PwaInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (readCompatibleStorage(DISMISSED_KEY, STORAGE_KEYS.legacyInstallDismissed) === "1") return;

    const onPrompt = (nextEvent: Event) => {
      nextEvent.preventDefault();
      setEvent(nextEvent as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !event) return null;

  async function install() {
    const pendingEvent = event;
    if (!pendingEvent) return;
    await pendingEvent.prompt();
    const result = await pendingEvent.userChoice;
    if (result.outcome === "accepted") setVisible(false);
    setEvent(null);
  }

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  return (
    <aside className="gc-pwa-prompt fixed inset-x-3 bottom-[6.1rem] z-[65] mx-auto max-w-md rounded-[22px] p-3 md:bottom-5 md:inset-x-auto md:end-5 md:mx-0">
      <div className="flex items-center gap-3">
        <span className="gc-brand-mark grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">نزّل OVRLD</p>
          <p className="gc-muted text-xs">افتحه أسرع وخلي أدوات التمرين دايمًا معاك.</p>
        </div>
        <button type="button" onClick={dismiss} className="gc-icon-button rounded-full" aria-label="اقفل اقتراح التثبيت">
          <X className="h-4 w-4" />
        </button>
      </div>
      <button type="button" onClick={() => void install()} className="gc-primary-button mt-3 w-full min-h-11 py-2.5 text-sm">
        نزّل التطبيق
      </button>
    </aside>
  );
}
