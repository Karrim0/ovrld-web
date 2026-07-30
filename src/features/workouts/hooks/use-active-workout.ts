/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkoutSessionWithDetails } from "../types";
import { fetchActiveWorkoutSession, fetchWorkoutSessionById } from "../services/workout-session.service";

export interface UseActiveWorkoutResult {
  session: WorkoutSessionWithDetails | null;
  isLoading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

export function useActiveWorkout(sessionId?: string | null): UseActiveWorkoutResult {
  const [session, setSession] = useState<WorkoutSessionWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextSession = sessionId
        ? await fetchWorkoutSessionById(sessionId)
        : await fetchActiveWorkoutSession();
      setSession(nextSession);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("معرفناش نحمّل التمرينة."));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const refreshWhenOnline = () => void reload();
    window.addEventListener("focus", refreshWhenOnline);
    window.addEventListener("online", refreshWhenOnline);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenOnline);
      window.removeEventListener("online", refreshWhenOnline);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [reload]);

  return { session, isLoading, error, reload };
}
