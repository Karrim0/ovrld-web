"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { StopwatchContext, type StopwatchContextValue } from "@/contexts/stopwatch-context";
import { STORAGE_KEYS, readCompatibleStorage } from "@/config/storage";
import type { StopwatchState, UUID } from "@/types";

interface StopwatchProviderProps {
  children: ReactNode;
}

interface PersistedStopwatch extends StopwatchState {
  savedAt: string;
}

const INITIAL_STATE: StopwatchState = {
  isRunning: false,
  startedAt: null,
  elapsedSeconds: 0,
};

function storageKey(sessionId: UUID) {
  return `${STORAGE_KEYS.stopwatchPrefix}:${sessionId}`;
}

function legacyStorageKey(sessionId: UUID) {
  return `${STORAGE_KEYS.legacyStopwatchPrefix}:${sessionId}`;
}

export function StopwatchProvider({ children }: StopwatchProviderProps) {
  const [sessionId, setSessionId] = useState<UUID | null>(null);
  const [state, setState] = useState<StopwatchState>(INITIAL_STATE);

  useEffect(() => {
    if (!state.isRunning) return;
    const interval = window.setInterval(() => {
      setState((current) => ({ ...current, elapsedSeconds: current.elapsedSeconds + 1 }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.isRunning]);

  useEffect(() => {
    if (!sessionId) return;
    const persisted: PersistedStopwatch = { ...state, savedAt: new Date().toISOString() };
    window.localStorage.setItem(storageKey(sessionId), JSON.stringify(persisted));
  }, [sessionId, state]);

  const start = useCallback(() => {
    setState((current) => ({
      ...current,
      isRunning: true,
      startedAt: current.startedAt ?? new Date().toISOString(),
    }));
  }, []);

  const pause = useCallback(() => {
    setState((current) => ({ ...current, isRunning: false }));
  }, []);

  const reset = useCallback(() => {
    if (sessionId) window.localStorage.removeItem(storageKey(sessionId));
    setState(INITIAL_STATE);
  }, [sessionId]);

  const hydrate = useCallback((nextSessionId: UUID, startedAt: string, elapsedSeconds?: number) => {
    setSessionId(nextSessionId);
    const raw = readCompatibleStorage(storageKey(nextSessionId), legacyStorageKey(nextSessionId));
    if (raw) {
      try {
        const stored = JSON.parse(raw) as PersistedStopwatch;
        const offlineElapsed = stored.isRunning
          ? Math.max(0, Math.floor((Date.now() - new Date(stored.savedAt).getTime()) / 1000))
          : 0;
        setState({
          isRunning: stored.isRunning,
          startedAt: stored.startedAt ?? startedAt,
          elapsedSeconds: stored.elapsedSeconds + offlineElapsed,
        });
        return;
      } catch {
        window.localStorage.removeItem(storageKey(nextSessionId));
      }
    }

    const elapsed = elapsedSeconds ?? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    setState({ isRunning: true, startedAt, elapsedSeconds: elapsed });
  }, []);

  const value: StopwatchContextValue = { ...state, sessionId, start, pause, reset, hydrate };
  return <StopwatchContext value={value}>{children}</StopwatchContext>;
}
