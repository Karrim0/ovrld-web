"use client";

import { createContext, useContext } from "react";

export interface RestTimerContextValue {
  scopeId: string | null;
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isOpen: boolean;
  completedAt: string | null;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setScope: (scopeId: string | null) => void;
  open: () => void;
  close: () => void;
  setDuration: (seconds: number) => void;
  start: (seconds?: number) => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  clear: () => void;
  addTime: (seconds: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  testSound: () => void;
  testHaptics: () => void;
}

export const RestTimerContext = createContext<RestTimerContextValue | undefined>(undefined);

export function useRestTimer(): RestTimerContextValue {
  const context = useContext(RestTimerContext);
  if (!context) throw new Error("useRestTimer must be used within RestTimerProvider.");
  return context;
}
