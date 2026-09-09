"use client";

import { Cloud, CloudOff, LoaderCircle, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { SYNC_STATE_LABELS } from "@/constants/sync";

export function SyncStatusIndicator() {
  const { isOnline, syncStatus, pendingSyncCount, lastSyncError, retrySync } = useNetworkStatus();

  const label = !isOnline
    ? pendingSyncCount > 0
      ? `${pendingSyncCount} مستنيين المزامنة`
      : "من غير نت"
    : pendingSyncCount > 0 && syncStatus === "idle"
      ? `${pendingSyncCount} مستنيين المزامنة`
      : SYNC_STATE_LABELS[syncStatus];

  const Icon = !isOnline ? CloudOff : syncStatus === "syncing" ? LoaderCircle : Cloud;

  if (isOnline && pendingSyncCount === 0 && (syncStatus === "idle" || syncStatus === "synced")) return null;

  return (
    <div
      className="flex min-h-9 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 text-[11px] font-bold text-neutral-400"
      title={lastSyncError ?? undefined}
    >
      <Icon className={`h-3.5 w-3.5 ${syncStatus === "syncing" ? "animate-spin text-emerald-300" : ""}`} />
      <span className="hidden sm:inline">{label}</span>
      {syncStatus === "error" ? (
        <button type="button" onClick={() => void retrySync()} className="inline-flex items-center gap-1 text-red-400">
          <RefreshCw className="h-3.5 w-3.5" /> جرّب تاني
        </button>
      ) : null}
    </div>
  );
}
