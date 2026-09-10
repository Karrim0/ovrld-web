/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { UUID } from "@/types";
import type { PreviousExercisePerformance, PreviousPerformanceMap } from "../types";
import {
  fetchPreviousPerformance,
  fetchPreviousPerformances,
} from "../services/workout-session.service";

export interface UsePreviousPerformanceResult {
  performance: PreviousExercisePerformance | null;
  previousSets: PreviousExercisePerformance["sets"];
  isLoading: boolean;
}

export interface UsePreviousPerformancesResult {
  performances: PreviousPerformanceMap;
  isLoading: boolean;
}

export function usePreviousPerformances(exerciseIds: UUID[], options: { excludeSessionId?: UUID } = {}): UsePreviousPerformancesResult {
  const exerciseKey = useMemo(
    () => [...new Set(exerciseIds.filter(Boolean))].sort().join("|"),
    [exerciseIds],
  );
  const stableExerciseIds = useMemo(
    () => (exerciseKey ? exerciseKey.split("|") : []),
    [exerciseKey],
  );
  const excludeSessionId = options.excludeSessionId;
  const [state, setState] = useState<UsePreviousPerformancesResult>({
    performances: {},
    isLoading: stableExerciseIds.length > 0,
  });

  useEffect(() => {
    let cancelled = false;
    if (stableExerciseIds.length === 0) {
      setState({ performances: {}, isLoading: false });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, isLoading: true }));
    fetchPreviousPerformances(stableExerciseIds, { excludeSessionId })
      .then((performances) => {
        if (!cancelled) setState({ performances, isLoading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ performances: {}, isLoading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [excludeSessionId, stableExerciseIds]);

  return state;
}

export function usePreviousPerformance(exerciseId: UUID): UsePreviousPerformanceResult {
  const [state, setState] = useState<UsePreviousPerformanceResult>({
    performance: null,
    previousSets: [],
    isLoading: Boolean(exerciseId),
  });

  useEffect(() => {
    let cancelled = false;
    if (!exerciseId) {
      setState({ performance: null, previousSets: [], isLoading: false });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, isLoading: true }));
    fetchPreviousPerformance(exerciseId)
      .then((performance) => {
        if (!cancelled) {
          setState({
            performance,
            previousSets: performance?.sets ?? [],
            isLoading: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ performance: null, previousSets: [], isLoading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  return state;
}
