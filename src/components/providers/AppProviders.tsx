"use client";

import { useEffect, type ReactNode } from "react";
import { registerServiceWorker } from "@/lib/pwa/register-service-worker";
import { migrateLegacyClientStorage } from "@/config/storage";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { LanguageProvider } from "@/contexts/language-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { NetworkProvider } from "./NetworkProvider";
import { SupabaseProvider } from "./SupabaseProvider";
import { OfflineCacheWarmer } from "./OfflineCacheWarmer";
import { RestTimerProvider } from "./RestTimerProvider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    migrateLegacyClientStorage();
    return registerServiceWorker();
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
      <SupabaseProvider>
        <NetworkProvider>
          <RestTimerProvider>
            <OfflineCacheWarmer />
            {children}
            <PwaInstallPrompt />
          </RestTimerProvider>
        </NetworkProvider>
      </SupabaseProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
