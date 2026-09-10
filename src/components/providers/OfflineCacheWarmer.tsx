"use client";

import { useEffect } from "react";
import { useSessionContext } from "@/contexts/session-context";
import { useNetworkStatus } from "@/hooks/use-network-status";

const CORE_OFFLINE_ROUTES = [
  "/dashboard",
  "/workout/today",
  "/workout/active",
  "/workout/quick",
  "/workout/history",
  "/split/personal",
  "/progress",
  "/progress/history",
  "/progress/records",
  "/progress/exercises",
  "/profile",
];

/** Warms the authenticated app shell so the core workout routes can reopen offline. */
export function OfflineCacheWarmer() {
  const { user, isLoading } = useSessionContext();
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (isLoading || !user || !isOnline || !("serviceWorker" in navigator)) return;
    let cancelled = false;

    void navigator.serviceWorker.ready.then(async () => {
      for (const route of CORE_OFFLINE_ROUTES) {
        if (cancelled) break;
        await fetch(route, {
          credentials: "include",
          headers: { "X-OVRLD-Offline-Warmup": "1" },
        }).catch(() => undefined);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isLoading, isOnline, user]);

  return null;
}
