"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { OfflineBanner } from "@/components/feedback/OfflineBanner";
import { RestTimerLauncher } from "@/features/workouts/components/RestTimerPanel";

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const activeWorkoutMode = pathname.startsWith("/workout/active");
  const quickLogMode = pathname.startsWith("/workout/quick");
  const gymMode = activeWorkoutMode || quickLogMode;

  return (
    <div className={`gc-shell flex flex-col md:flex-row ${gymMode ? "gc-shell-gym-mode" : ""}`}>
      <DesktopSidebar />
      <div
        className={`gc-app-content relative flex min-w-0 flex-1 flex-col ${gymMode ? "gc-app-content-gym" : ""}`}
      >
        <OfflineBanner />
        <main className={`relative flex-1 ${gymMode ? "gc-gym-main" : "gc-main-content"}`}>
          {children}
        </main>
        <BottomNavigation />
        {quickLogMode ? null : <RestTimerLauncher />}
      </div>
    </div>
  );
}
