"use client";

import { STORAGE_KEYS, readCompatibleStorage } from "@/config/storage";
import { getArabicErrorMessage } from "@/lib/localization";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  Bell,
  ArrowUp,
  Check,
  ChevronLeft,
  GripVertical,
  History,
  List,
  ListPlus,
  LogOut,
  Minus,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCcw,
  SlidersHorizontal,
  SkipForward,
  Smartphone,
  TimerReset,
  Trash2,
  VolumeX,
  X,
  XCircle,
} from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useRestTimer } from "@/contexts/rest-timer-context";
import { useLanguage } from "@/contexts/language-context";
import { fetchExerciseLibrary } from "@/features/exercises/services/exercise.service";
import { CustomExerciseForm } from "@/features/exercises/components/CustomExerciseForm";
import { addSplitExercise, fetchPersonalSplit } from "@/features/splits/services/split.service";
import type { Exercise, WorkoutSet } from "@/types";
import { formatDuration } from "@/lib/utils/format";
import { muscleLabelAr, translateExerciseName, translateWorkoutLabel } from "@/lib/localization";
import { useActiveWorkout } from "../hooks/use-active-workout";
import { usePreviousPerformances } from "../hooks/use-previous-performance";
import {
  addExerciseToWorkout,
  cancelWorkoutSession,
  deleteWorkoutExercise,
  finishWorkoutSession,
  resumeStaleWorkoutSession,
  reorderWorkoutExercises,
  updateWorkoutExerciseNotes,
  updateWorkoutSessionNotes,
  updateWorkoutSet,
} from "../services/workout-session.service";
import { SessionElapsedTime } from "./SessionElapsedTime";
import { getSafeWorkoutDurationSeconds, isStaleActiveWorkout } from "../utils/session-time";
import { getSessionWorkoutMetrics } from "../utils/workout-metrics";

type GymPhase = "overview" | "ready" | "logging" | "post";

type LoggedSetSnapshot = {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number | null;
  reps: number;
  previousWeightKg: number | null;
  previousReps: number | null;
};

const WEIGHT_STEPS = [1, 2, 2.5, 5, 10] as const;
const REP_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 5);

function parseOptionalNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(1).replace(/\.0$/, "");
}

function tapFeedback(pattern: number | number[] = 8) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  navigator.vibrate(pattern);
}

function inferWeightStep(previousSets: WorkoutSet[]) {
  const weights = previousSets
    .map((set) => set.weightKg)
    .filter((weight): weight is number => weight !== null && weight > 0);

  if (weights.some((weight) => !Number.isInteger(weight))) return 2.5;
  if (weights.length > 0 && weights.every((weight) => weight % 5 === 0)) return 5;
  if (weights.length > 0 && weights.every((weight) => weight % 2 === 0)) return 2;
  return 2.5;
}

function buildWeightOptions(baseWeight: number | null, step: number) {
  const base = baseWeight ?? Math.max(step * 2, 10);
  const offsets = [-2, -1, 0, 1, 2, 3];
  const values = offsets
    .map((offset) => Math.max(0, base + offset * step))
    .map((value) => Math.round(value * 100) / 100);

  if ((baseWeight ?? 0) === 0) values.unshift(0);
  return [...new Set(values)].sort((a, b) => a - b);
}

function getComparison(snapshot: LoggedSetSnapshot, language: "ar" | "en") {
  const pieces: string[] = [];
  if (
    snapshot.weightKg !== null &&
    snapshot.previousWeightKg !== null &&
    snapshot.weightKg !== snapshot.previousWeightKg
  ) {
    const difference = snapshot.weightKg - snapshot.previousWeightKg;
    pieces.push(`${difference > 0 ? "+" : ""}${formatNumber(difference)} ${language === "ar" ? "كجم" : "kg"}`);
  }
  if (
    snapshot.previousReps !== null &&
    snapshot.reps !== snapshot.previousReps
  ) {
    const difference = snapshot.reps - snapshot.previousReps;
    pieces.push(`${difference > 0 ? "+" : ""}${difference} ${language === "ar" ? "عدة" : difference === 1 || difference === -1 ? "rep" : "reps"}`);
  }
  if (snapshot.previousWeightKg === null && snapshot.previousReps === null) return language === "ar" ? "نقطة بداية جديدة" : "New baseline";
  return pieces.length > 0 ? pieces.join(" · ") : language === "ar" ? "نفس آخر مرة" : "Same as last time";
}

type ProgressionSuggestion = {
  kind: "baseline" | "reps" | "load" | "hold";
  label: string;
  detail: string;
  weightKg: number | null;
  reps: number;
};

function buildProgressionSuggestion(
  previousSet: WorkoutSet | undefined,
  targetRepsMin: number,
  targetRepsMax: number,
  weightStep: number,
  language: "ar" | "en",
): ProgressionSuggestion {
  if (!previousSet || previousSet.reps === null) {
    return {
      kind: "baseline",
      label: language === "ar" ? "أول مرة" : "First time",
      detail: language === "ar" ? `ابدأ بوزن مريح وخلّي هدفك ${targetRepsMin}–${targetRepsMax} عدة بفورم نضيف.` : `Start with a comfortable load and aim for ${targetRepsMin}–${targetRepsMax} clean reps.`,
      weightKg: null,
      reps: targetRepsMin,
    };
  }

  const reps = previousSet.reps;
  if (reps < targetRepsMin) {
    return {
      kind: "hold",
      label: language === "ar" ? "ثبّت الأول" : "Hold the load",
      detail: language === "ar" ? `آخر مرة كانت ${reps} عدات. ثبّت الوزن وحاول توصل ${targetRepsMin} بفورم نضيف قبل الزيادة.` : `Last time was ${reps} reps. Keep the load and reach ${targetRepsMin} clean reps before increasing.`,
      weightKg: previousSet.weightKg,
      reps: targetRepsMin,
    };
  }
  if (reps < targetRepsMax) {
    const nextReps = Math.min(targetRepsMax, reps + 1);
    return {
      kind: "reps",
      label: language === "ar" ? "+1 عدة" : "+1 rep",
      detail: language === "ar" ? `نفس الوزن · هدف ${nextReps} عدات لو الفورم لسه نضيف.` : `Same load · aim for ${nextReps} reps if form stays clean.`,
      weightKg: previousSet.weightKg,
      reps: nextReps,
    };
  }
  if (previousSet.weightKg !== null && previousSet.weightKg > 0) {
    const nextWeight = Math.round((previousSet.weightKg + weightStep) * 100) / 100;
    return {
      kind: "load",
      label: `+${formatNumber(weightStep)} ${language === "ar" ? "كجم" : "kg"}`,
      detail: language === "ar" ? `وصلت سقف العدات. جرّب ${formatNumber(nextWeight)} كجم × ${targetRepsMin} لو آخر سِت كانت مستقرة.` : `You hit the rep ceiling. Try ${formatNumber(nextWeight)} kg × ${targetRepsMin} if the last set was stable.`,
      weightKg: nextWeight,
      reps: targetRepsMin,
    };
  }
  return {
    kind: "reps",
    label: language === "ar" ? "+1 عدة" : "+1 rep",
    detail: language === "ar" ? `حاول ${Math.min(targetRepsMax + 1, reps + 1)} عدة بنفس التنفيذ.` : `Try ${Math.min(targetRepsMax + 1, reps + 1)} reps with the same execution.`,
    weightKg: previousSet.weightKg,
    reps: reps + 1,
  };
}

function exerciseIsComplete(sets: WorkoutSet[]) {
  return sets.length > 0 && sets.every((set) => set.isCompleted);
}

export function ActiveWorkoutClient() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const { session, isLoading, error: loadError, reload } = useActiveWorkout(sessionId);
  const { isOnline } = useNetworkStatus();
  const restTimer = useRestTimer();

  const [phase, setPhase] = useState<GymPhase>("overview");
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [permanent, setPermanent] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showCustomExercise, setShowCustomExercise] = useState(false);
  const [queueEditing, setQueueEditing] = useState(false);
  const [showWorkoutOptions, setShowWorkoutOptions] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState<string>(language === "ar" ? "التمرين" : "Workout");
  const [keepAwake, setKeepAwake] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const hapticsHydratedRef = useRef(false);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const [showCustomWeight, setShowCustomWeight] = useState(false);
  const [showCustomReps, setShowCustomReps] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState("");
  const [selectedReps, setSelectedReps] = useState("");
  const [selectedRir, setSelectedRir] = useState<"" | "0" | "1" | "2" | "3+" | "failure">("");

  useEffect(() => {
    const stored = readCompatibleStorage(STORAGE_KEYS.setHaptics, "ovrld:haptics");
    queueMicrotask(() => {
      if (stored !== null) setHapticsEnabled(stored !== "off");
      hapticsHydratedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!hapticsHydratedRef.current) return;
    window.localStorage.setItem(STORAGE_KEYS.setHaptics, hapticsEnabled ? "on" : "off");
  }, [hapticsEnabled]);

  function feedback(pattern: number | number[] = 8) {
    if (hapticsEnabled) tapFeedback(pattern);
  }
  const [weightStep, setWeightStep] = useState<number>(2.5);
  const [lastLogged, setLastLogged] = useState<LoggedSetSnapshot | null>(null);
  const [draggingExerciseId, setDraggingExerciseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resumingStale, setResumingStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedSession = useRef<string | null>(null);
  const preparedSet = useRef<string | null>(null);

  useEffect(() => {
    void fetchExerciseLibrary().then(setLibrary).catch(() => setLibrary([]));
  }, []);

  useEffect(() => {
    if (!session?.userId || !session.splitDayId) return;
    void fetchPersonalSplit(session.userId)
      .then((days) => {
        const source = days.find((day) => day.id === session.splitDayId);
        if (source) setWorkoutTitle(t(translateWorkoutLabel(source.displayName)) || (ar ? "التمرين" : "Workout"));
      })
      .catch(() => undefined);
  }, [ar, session?.splitDayId, session?.userId, t]);

  useEffect(() => {
    const wakeLock = typeof navigator !== "undefined" ? (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock : undefined;
    if (!keepAwake || !wakeLock) {
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
      return;
    }
    let cancelled = false;
    void wakeLock.request("screen").then((lock) => {
      if (cancelled) { void lock.release(); return; }
      wakeLockRef.current = lock;
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
    };
  }, [keepAwake]);

  useEffect(() => {
    if (!session || initializedSession.current === session.id) return;
    initializedSession.current = session.id;
    setSessionNotes(session.notes);
    const firstIncomplete = session.exercises.findIndex((exercise) =>
      exercise.sets.some((set) => !set.isCompleted),
    );
    setCurrentIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    setPhase("ready");
    preparedSet.current = null;
    restTimer.setScope(session.id);
  }, [restTimer, session]);

  const exerciseIds = useMemo(
    () => session?.exercises.map((exercise) => exercise.exerciseId) ?? [],
    [session],
  );
  const { performances, isLoading: previousPerformanceLoading } =
    usePreviousPerformances(exerciseIds);

  const currentExercise = session?.exercises[currentIndex] ?? null;
  const previousPerformance = currentExercise
    ? performances[currentExercise.exerciseId]
    : undefined;
  const previousSets = useMemo(
    () => previousPerformance?.sets ?? [],
    [previousPerformance?.sets],
  );
  const activeSet = currentExercise?.sets.find((set) => !set.isCompleted) ?? null;
  const activeSetIndex = activeSet
    ? currentExercise?.sets.findIndex((set) => set.id === activeSet.id) ?? 0
    : Math.max(0, (currentExercise?.sets.length ?? 1) - 1);
  const previousSet = previousSets[activeSetIndex];
  const staleSession = session ? isStaleActiveWorkout(session.startedAt) : false;
  const progressionSuggestion = currentExercise
    ? buildProgressionSuggestion(previousSet, currentExercise.targetRepsMin, currentExercise.targetRepsMax, weightStep, language)
    : null;

  useEffect(() => {
    if (!currentExercise || restTimer.isRunning) return;
    const stored = Number(window.localStorage.getItem(`ovrld:rest-duration:${currentExercise.exerciseId}`));
    if (Number.isFinite(stored) && stored >= 15 && stored <= 900 && stored !== restTimer.durationSeconds) {
      restTimer.setDuration(stored);
    }
  // rest default should change only when moving to another exercise.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExercise?.exerciseId]);

  useEffect(() => {
    if (!session || !currentExercise || previousPerformanceLoading || phase !== "ready") return;
    const nextIndex = currentExercise.sets.findIndex((set) => !set.isCompleted);
    if (nextIndex < 0) return;
    const set = currentExercise.sets[nextIndex];
    const key = `${session.id}:${set.id}`;
    if (preparedSet.current === key) return;
    const previous = performances[currentExercise.exerciseId]?.sets[nextIndex];
    setSelectedWeight(set.weightKg?.toString() ?? previous?.weightKg?.toString() ?? "");
    setSelectedReps(set.reps?.toString() ?? previous?.reps?.toString() ?? String(currentExercise.targetRepsMin));
    const note = set.notes ?? "";
    const rirMatch = note.match(/RIR:(0|1|2|3\+)/i);
    setSelectedRir(/FAILURE/i.test(note) ? "failure" : (rirMatch?.[1] as "0" | "1" | "2" | "3+" | undefined) ?? "");
    setWeightStep(readWeightStep(currentExercise.exerciseId, performances[currentExercise.exerciseId]?.sets ?? []));
    setShowCustomWeight(false);
    setShowCustomReps(false);
    preparedSet.current = key;
  // readWeightStep reads local preferences; rerunning only when the active set/history changes is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, currentExercise?.id, activeSet?.id, previousPerformanceLoading, performances, phase]);

  function readWeightStep(exerciseId: string, sets: WorkoutSet[]) {
    if (typeof window === "undefined") return inferWeightStep(sets);
    const stored = Number(
      readCompatibleStorage(
        `${STORAGE_KEYS.weightStepPrefix}:${exerciseId}`,
        `${STORAGE_KEYS.legacyWeightStepPrefix}:${exerciseId}`,
      ),
    );
    return WEIGHT_STEPS.includes(stored as (typeof WEIGHT_STEPS)[number])
      ? stored
      : inferWeightStep(sets);
  }


  const totals = useMemo(() => {
    const metrics = getSessionWorkoutMetrics(session?.exercises ?? []);
    return {
      totalSets: metrics.totalSets,
      completedSets: metrics.completedSets,
      completedExercises: metrics.completedExercises,
    };
  }, [session]);

  const progress = totals.totalSets > 0 ? (totals.completedSets / totals.totalSets) * 100 : 0;
  const workoutComplete = totals.totalSets > 0 && totals.completedSets === totals.totalSets;
  const nextExercisePreview = (() => {
    if (!session) return null;
    const after = session.exercises.find((exercise, index) => index > currentIndex && exercise.sets.some((set) => !set.isCompleted));
    return after ?? session.exercises.find((exercise, index) => index !== currentIndex && exercise.sets.some((set) => !set.isCompleted)) ?? null;
  })();
  const availableExercises = library.filter(
    (exercise) =>
      !session?.exercises.some((item) => item.exerciseId === exercise.id),
  );

  const weightOptions = useMemo(() => {
    const selected = parseOptionalNumber(selectedWeight);
    const stableBase = previousSet?.weightKg ?? activeSet?.weightKg ?? null;
    return buildWeightOptions(
      stableBase ?? (selected !== null && !Number.isNaN(selected) ? selected : null),
      weightStep,
    );
  }, [activeSet?.weightKg, previousSet?.weightKg, selectedWeight, weightStep]);

  const repOptions = useMemo(() => {
    const extras = [previousSet?.reps, Number(selectedReps)]
      .filter((value): value is number => value !== null && Number.isInteger(value) && value > 0);
    return [...new Set([...REP_OPTIONS, ...extras])].sort((a, b) => a - b);
  }, [previousSet?.reps, selectedReps]);

  function selectExercise(index: number) {
    if (!session) return;
    const safeIndex = Math.max(0, Math.min(session.exercises.length - 1, index));
    const exercise = session.exercises[safeIndex];
    const performance = performances[exercise.exerciseId];
    const nextSetIndex = Math.max(
      0,
      exercise.sets.findIndex((set) => !set.isCompleted),
    );
    const set = exercise.sets[nextSetIndex];
    const previous = performance?.sets[nextSetIndex];

    setCurrentIndex(safeIndex);
    setSelectedWeight(set?.weightKg?.toString() ?? previous?.weightKg?.toString() ?? "");
    setSelectedReps(set?.reps?.toString() ?? previous?.reps?.toString() ?? "");
    const note = set?.notes ?? "";
    const rirMatch = note.match(/RIR:(0|1|2|3\+)/i);
    setSelectedRir(/FAILURE/i.test(note) ? "failure" : (rirMatch?.[1] as "0" | "1" | "2" | "3+" | undefined) ?? "");
    setWeightStep(readWeightStep(exercise.exerciseId, performance?.sets ?? []));
    preparedSet.current = set ? `${session.id}:${set.id}` : null;
    setShowCustomWeight(false);
    setShowCustomReps(false);
    setLastLogged(null);
    setPhase("ready");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function moveExercise(fromIndex: number, toIndex: number) {
    if (!session || fromIndex === toIndex || toIndex < 0 || toIndex >= session.exercises.length) {
      return;
    }

    const reordered = [...session.exercises];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setBusy(true);
    setError(null);
    try {
      await reorderWorkoutExercises(
        session.id,
        reordered.map((exercise) => exercise.id),
      );
      await reload();
      setCurrentIndex(toIndex);
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, "معرفناش نرتّب التمارين.")));
    } finally {
      setBusy(false);
      setDraggingExerciseId(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetIndex: number) {
    event.preventDefault();
    if (!session || !draggingExerciseId) return;
    const sourceIndex = session.exercises.findIndex(
      (exercise) => exercise.id === draggingExerciseId,
    );
    if (sourceIndex >= 0) void moveExercise(sourceIndex, targetIndex);
  }

  function saveWeightStep(step: number) {
    if (!currentExercise) return;
    setWeightStep(step);
    window.localStorage.setItem(
      `${STORAGE_KEYS.weightStepPrefix}:${currentExercise.exerciseId}`,
      step.toString(),
    );
  }

  function nudgeWeight(delta: number) {
    const parsed = parseOptionalNumber(selectedWeight);
    const base = parsed === null || Number.isNaN(parsed)
      ? previousSet?.weightKg ?? activeSet?.weightKg ?? 0
      : parsed;
    const next = Math.max(0, Math.round((base + delta) * 100) / 100);
    setSelectedWeight(formatNumber(next));
    setShowCustomWeight(false);
    feedback();
  }

  function nudgeReps(delta: number) {
    const parsed = Number(selectedReps);
    const base = Number.isInteger(parsed) && parsed > 0
      ? parsed
      : previousSet?.reps ?? activeSet?.reps ?? 8;
    setSelectedReps(String(Math.max(1, base + delta)));
    setShowCustomReps(false);
    feedback();
  }

  function prepareSetValues(setIndex: number) {
    if (!currentExercise) return;
    const set = currentExercise.sets[setIndex];
    const previous = previousSets[setIndex];
    setSelectedWeight(set?.weightKg?.toString() ?? previous?.weightKg?.toString() ?? "");
    setSelectedReps(set?.reps?.toString() ?? previous?.reps?.toString() ?? "");
    const note = set?.notes ?? "";
    const rirMatch = note.match(/RIR:(0|1|2|3\+)/i);
    setSelectedRir(/FAILURE/i.test(note) ? "failure" : (rirMatch?.[1] as "0" | "1" | "2" | "3+" | undefined) ?? "");
    setWeightStep(readWeightStep(currentExercise.exerciseId, previousSets));
    preparedSet.current = set ? `${session?.id ?? "session"}:${set.id}` : null;
    setShowCustomWeight(false);
    setShowCustomReps(false);
    setLastLogged(null);
  }

  async function logSet() {
    if (!currentExercise || !activeSet) return;
    const weightKg = parseOptionalNumber(selectedWeight);
    const reps = parseOptionalNumber(selectedReps);

    if (Number.isNaN(weightKg) || (weightKg !== null && (weightKg < 0 || weightKg > 5000))) {
      setError(t("اختار وزن صحيح."));
      return;
    }
    if (Number.isNaN(reps) || reps === null || !Number.isInteger(reps) || reps <= 0 || reps > 1000) {
      setError(t("اختار عدد العدات اللي خلصتها."));
      return;
    }

    setBusy(true);
    setError(null);

    const isFinalPlannedSet = totals.totalSets > 0 && totals.completedSets + 1 >= totals.totalSets;
    const hasAnotherSetInExercise = currentExercise.sets.some((set) => set.id !== activeSet.id && !set.isCompleted);

    // Start inside the user's tap so mobile browsers unlock the completion sound.
    // The final planned set does not need a rest timer; it should flow straight to workout completion.
    if (!isFinalPlannedSet) {
      window.localStorage.setItem(`ovrld:rest-duration:${currentExercise.exerciseId}`, String(restTimer.durationSeconds));
      restTimer.start(restTimer.durationSeconds);
      restTimer.open();
    }

    try {
      await updateWorkoutSet(activeSet.id, {
        weightKg,
        reps,
        isCompleted: true,
        isWarmup: activeSet.isWarmup,
        notes: selectedRir === "" ? activeSet.notes : selectedRir === "failure" ? "FAILURE" : `RIR:${selectedRir}`,
      });
      setLastLogged({
        exerciseId: currentExercise.exerciseId,
        exerciseName: currentExercise.exercise.name,
        setNumber: activeSet.setNumber,
        weightKg,
        reps,
        previousWeightKg: previousSet?.weightKg ?? null,
        previousReps: previousSet?.reps ?? null,
      });
        feedback(isFinalPlannedSet ? [18, 35, 18] : 14);
      await reload();
      preparedSet.current = null;
      setPhase(hasAnotherSetInExercise ? "ready" : "post");
    } catch (caught) {
      if (!isFinalPlannedSet) {
        restTimer.reset();
        restTimer.close();
      }
      setError(t(getArabicErrorMessage(caught, "معرفناش نسجّل السِت دي.")));
    } finally {
      setBusy(false);
    }
  }

  async function undoLastSet() {
    if (!currentExercise || !lastLogged) return;
    const set = currentExercise.sets.find((item) => item.setNumber === lastLogged.setNumber);
    if (!set) return;
    setBusy(true);
    setError(null);
    try {
      await updateWorkoutSet(set.id, { weightKg: lastLogged.weightKg, reps: lastLogged.reps, isCompleted: false, isWarmup: set.isWarmup, notes: set.notes });
      restTimer.reset();
      restTimer.close();
      setLastLogged(null);
      preparedSet.current = null;
      await reload();
      setPhase("ready");
      feedback();
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, "معرفناش نرجّع السِت.")));
    } finally {
      setBusy(false);
    }
  }

  function goToNextExercise() {
    if (!session) return;
    const afterCurrent = session.exercises.findIndex(
      (exercise, index) =>
        index > currentIndex && exercise.sets.some((set) => !set.isCompleted),
    );
    const anyIncomplete = session.exercises.findIndex((exercise) =>
      exercise.sets.some((set) => !set.isCompleted),
    );
    const nextIndex = afterCurrent >= 0 ? afterCurrent : anyIncomplete;
    if (nextIndex >= 0) selectExercise(nextIndex);
    else setPhase("overview");
  }

  async function leaveWorkout() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await updateWorkoutSessionNotes(session.id, sessionNotes);
      router.push("/dashboard");
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, "معرفناش نحفظ التمرينة قبل ما تخرج.")));
    } finally {
      setBusy(false);
    }
  }

  async function addExercise(exercise = library.find((item) => item.id === selectedExercise)) {
    if (!session || !exercise) return;
    setBusy(true);
    setError(null);
    try {
      await addExerciseToWorkout(session.id, exercise.id, 2, !permanent || !isOnline);
      if (permanent && session.splitDayId) {
        if (!isOnline) {
          setError(t("اتحفظ في التمرينة دي. وصّل النت عشان تضيفه لجدولك بشكل دائم."));
        } else {
          await addSplitExercise({
            splitDayId: session.splitDayId,
            exercise,
            targetSets: 2,
            isPersonalAddition: true,
          });
        }
      }
      setSelectedExercise("");
      setPermanent(false);
      setShowExercisePicker(false);
      setShowCustomExercise(false);
      await reload();
      setCurrentIndex(session.exercises.length);
      setPhase("ready");
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, "معرفناش نضيف التمرين.")));
    } finally {
      setBusy(false);
    }
  }

  async function removeCurrentExercise() {
    if (!session || !currentExercise) return;
    if (!window.confirm("تشيل التمرين ده من التمرينة الحالية؟")) return;
    setBusy(true);
    try {
      await deleteWorkoutExercise(currentExercise.id);
      await reload();
      setCurrentIndex((index) => Math.max(0, Math.min(index, session.exercises.length - 2)));
      setPhase("overview");
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, "معرفناش نشيل التمرين.")));
    } finally {
      setBusy(false);
    }
  }

  async function resumeStaleSession() {
    if (!session || !staleSession) return;
    setResumingStale(true);
    setError(null);
    try {
      await resumeStaleWorkoutSession(session.id);
      await reload();
      feedback([8, 30, 8]);
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, "معرفناش نعيد تشغيل مؤقت التمرينة.")));
    } finally {
      setResumingStale(false);
    }
  }

  async function finish() {
    if (!session) return;
    const incompleteSets = totals.totalSets - totals.completedSets;
    if (
      incompleteSets > 0 &&
      !window.confirm(`${incompleteSets} سِتات لسه مخلصتش. تخلّص التمرينة برضه؟`)
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateWorkoutSessionNotes(session.id, sessionNotes);
      const durationSeconds = getSafeWorkoutDurationSeconds(
        session.startedAt,
        Date.now(),
        session.durationSeconds,
      );
      await finishWorkoutSession(session.id, durationSeconds, sessionNotes);
      restTimer.clear();
      restTimer.setScope(null);
      router.replace(`/workout/${session.id}`);
      router.refresh();
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, "معرفناش نخلّص التمرينة.")));
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    if (
      !session ||
      !window.confirm(
        "تمسح التمرينة دي؟ كل السِتات بتاعتها مش هتتحسب في تقدمك.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await cancelWorkoutSession(session.id);
      restTimer.clear();
      restTimer.setScope(null);
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(t(getArabicErrorMessage(caught, "معرفناش نمسح التمرينة.")));
      setBusy(false);
    }
  }

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-[18px] border border-white/[0.06] bg-white/[0.025]" />;
  }
  if (loadError || !session || !currentExercise) {
    return (
      <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
        {loadError?.message ?? "مفيش تمرينة شغالة."}
      </p>
    );
  }

  const currentComplete = exerciseIsComplete(currentExercise.sets);
  const nextIncompleteSet = currentExercise.sets.find((set) => !set.isCompleted) ?? null;
  const completedCurrentSets = currentExercise.sets.filter((set) => set.isCompleted).length;

  return (
    <div className="gc-gym-mode mx-auto w-full min-w-0 space-y-3 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-1">
      <header className="gc-workout-header gc-gym-sticky sticky z-30 rounded-b-[18px] px-1 pb-2.5 pt-2">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={() => setShowExitDialog(true)} className="gc-gym-back-button" aria-label={ar ? "اخرج من وضع التمرين" : "Exit workout mode"}><ChevronLeft className="h-5 w-5 rtl:rotate-180" /></button>
          <button
            type="button"
            onClick={() => { setPhase("overview"); setQueueEditing(false); }}
            className="min-w-0 flex-1 text-start"
            aria-label={ar ? "افتح قائمة التمرين" : "Open workout queue"}
          >
            <span className="block truncate text-sm font-black">{workoutTitle}</span>
            <span className="block truncate text-[10px] font-bold text-neutral-500">{ar ? `تمرين ${currentIndex + 1}/${session.exercises.length} · ${totals.completedSets}/${totals.totalSets} سِت` : `Exercise ${currentIndex + 1} of ${session.exercises.length} · ${totals.completedSets}/${totals.totalSets} sets`}</span>
          </button>
          <span className="hidden rounded-lg bg-white/[0.04] px-2 py-1.5 text-[11px] font-bold text-neutral-400 min-[375px]:block">
            <SessionElapsedTime startedAt={session.startedAt} compact />
          </span>
          <button
            type="button"
            onClick={() => setShowWorkoutOptions(true)}
            className="gc-gym-menu-button"
            aria-label={ar ? "خيارات التمرينة" : "Workout options"}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-emerald-300 transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {staleSession ? (
        <section className="gc-stale-session-alert" role="status">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
          <span className="min-w-0 flex-1 text-xs font-semibold text-neutral-400">{ar ? "الجلسة قديمة؛ الوقت القديم مش هيتحسب." : "This session is stale; old idle time will not count."}</span>
          <button type="button" disabled={resumingStale} onClick={() => void resumeStaleSession()} className="gc-stale-session-resume disabled:opacity-50">
            <RefreshCcw className="h-3.5 w-3.5" /> {resumingStale ? (ar ? "بنعيد…" : "Resuming…") : (ar ? "كمّل من دلوقتي" : "Resume now")}
          </button>
        </section>
      ) : null}

      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-300" role="alert">{error}</p> : null}

      {phase === "overview" ? (
        <section className="space-y-3">
          <div className="gc-gym-queue-toolbar">
            <div className="min-w-0">
              <p className="text-sm font-black">{ar ? "قائمة التمرين" : "Workout Queue"}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-neutral-500">{totals.completedExercises}/{session.exercises.length} {ar ? "خلصوا" : "done"} · {totals.completedSets}/{totals.totalSets} {ar ? "سِت" : "sets"}</p>
            </div>
            <button
              type="button"
              onClick={() => setQueueEditing((value) => !value)}
              className={`gc-compact-action ${queueEditing ? "gc-compact-action-active" : ""}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> {queueEditing ? (ar ? "تم" : "Done") : (ar ? "تعديل" : "Edit")}
            </button>
          </div>

          <div className="gc-gym-queue" aria-label={ar ? "تمارين النهارده" : "Today’s exercises"}>
            {session.exercises.map((exercise, index) => {
              const done = exerciseIsComplete(exercise.sets);
              const completedSets = exercise.sets.filter((set) => set.isCompleted).length;
              const previous = performances[exercise.exerciseId];
              return (
                <div
                  key={exercise.id}
                  draggable={queueEditing && !busy}
                  onDragStart={() => queueEditing && setDraggingExerciseId(exercise.id)}
                  onDragEnd={() => setDraggingExerciseId(null)}
                  onDragOver={(event) => { if (queueEditing) event.preventDefault(); }}
                  onDrop={(event) => { if (queueEditing) handleDrop(event, index); }}
                  className={`gc-gym-queue-row ${done ? "gc-gym-queue-row-done" : ""} ${draggingExerciseId === exercise.id ? "gc-gym-queue-row-dragging" : ""}`}
                >
                  {queueEditing ? <GripVertical className="h-4 w-4 shrink-0 text-neutral-600" /> : null}
                  <button type="button" onClick={() => selectExercise(index)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black ${done ? "bg-emerald-400 text-[#11131a]" : "bg-white/[0.05] text-neutral-300"}`}>
                      {done ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{t(translateExerciseName(exercise.exercise.name))}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-semibold text-neutral-500">
                        {completedSets}/{exercise.sets.length} {ar ? "سِت" : "sets"}{previous?.sets[0] ? ` · ${previous.sets[0].weightKg ?? 0} ${ar ? "كجم" : "kg"} × ${previous.sets[0].reps ?? 0}` : ar ? " · أول مرة" : " · first time"}
                      </span>
                    </span>
                    {!queueEditing ? <ChevronLeft className="h-4 w-4 shrink-0 text-neutral-600" /> : null}
                  </button>
                  {queueEditing ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" disabled={index === 0 || busy} onClick={() => void moveExercise(index, index - 1)} className="gc-mini-icon disabled:opacity-20" aria-label="اطلع التمرين"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" disabled={index === session.exercises.length - 1 || busy} onClick={() => void moveExercise(index, index + 1)} className="gc-mini-icon disabled:opacity-20" aria-label="نزّل التمرين"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {queueEditing ? (
            <button type="button" onClick={() => { setShowWorkoutOptions(true); setShowExercisePicker(true); }} className="gc-secondary-button w-full">
              <ListPlus className="h-4 w-4" /> {ar ? "ضيف تمرين" : "Add exercise"}
            </button>
          ) : null}

          {workoutComplete ? (
            <button type="button" disabled={busy} onClick={() => void finish()} className="gc-primary-button gc-workout-finish-button w-full disabled:opacity-50">
              <Check className="h-4 w-4" /> {busy ? (ar ? "بنخلّص…" : "Finishing…") : (ar ? "خلّص التمرينة" : "Finish workout")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const recommended = session.exercises.findIndex((exercise) => exercise.sets.some((set) => !set.isCompleted));
                selectExercise(recommended >= 0 ? recommended : 0);
              }}
              className="gc-primary-button w-full"
            >
              <Play className="h-4 w-4" /> {totals.completedSets > 0 ? (ar ? "كمّل" : "Continue") : (ar ? "ابدأ" : "Start")}
            </button>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <div className="gc-gym-exercise-head">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500">
                <span>{ar ? "تمرين" : "Exercise"} {currentIndex + 1}/{session.exercises.length}</span>
                <span>·</span>
                <span>{t(muscleLabelAr(currentExercise.exercise.primaryMuscle))}</span>
                {currentExercise.isSessionOnlyAddition ? <span className="gc-mini-badge">{ar ? "للجلسة دي" : "Session only"}</span> : null}
              </div>
              <h1 className="mt-1 truncate text-xl font-black tracking-[-0.025em]">{t(translateExerciseName(currentExercise.exercise.name))}</h1>
            </div>
          </div>

          <div className="gc-gym-context-line">
            <span className="gc-gym-context-target">{ar ? "الهدف" : "Target"} · {currentExercise.targetRepsMin}–{currentExercise.targetRepsMax}</span>
            <span className="gc-gym-context-history">
              <History className="h-3.5 w-3.5 shrink-0" />
              {previousPerformanceLoading ? (ar ? "بنجيب آخر أرقام…" : "Loading last time…") : previousPerformance ? previousSets.filter((set) => !set.isWarmup).map((set) => `${set.weightKg ?? 0}${ar ? "كجم" : "kg"}×${set.reps ?? 0}`).join(" · ") : (ar ? "أول مرة" : "First time")}
            </span>
            {progressionSuggestion ? <span className="gc-gym-context-next">{ar ? "التالي" : "Next"}: {progressionSuggestion.label}</span> : null}
          </div>

          <div className="gc-gym-set-tabs" aria-label={ar ? "سِتات التمرين" : "Exercise sets"}>
            {currentExercise.sets.map((set, index) => {
              const isCurrent = activeSet?.id === set.id;
              const previous = previousSets[index];
              const weight = set.weightKg ?? (isCurrent ? selectedWeight : previous?.weightKg) ?? "—";
              const reps = set.reps ?? (isCurrent ? selectedReps : previous?.reps) ?? "—";
              return (
                <button key={set.id} type="button" disabled={set.isCompleted} onClick={() => { prepareSetValues(index); setPhase("ready"); }} className={`gc-gym-set-tab ${set.isCompleted ? "gc-gym-set-tab-done" : isCurrent ? "gc-gym-set-tab-current" : ""}`}>
                  <span>{ar ? "سِت" : "Set"} {set.setNumber}</span>
                  <strong>{set.isCompleted ? <><Check className="h-3.5 w-3.5" /> {weight}×{reps}</> : isCurrent ? (ar ? "دلوقتي" : "Now") : `${weight}×${reps}`}</strong>
                </button>
              );
            })}
          </div>

          {currentComplete && !lastLogged ? (
            <div className="gc-gym-complete-strip">
              <Check className="h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1"><strong>{workoutComplete ? (ar ? "كل التمرينة خلصت" : "Workout complete") : (ar ? "التمرين خلص" : "Exercise complete")}</strong><span>{completedCurrentSets}/{currentExercise.sets.length} {ar ? "سِت" : "sets"}</span></div>
              {workoutComplete ? (
                <button type="button" disabled={busy} onClick={() => void finish()} className="gc-compact-action">{ar ? "إنهاء" : "Finish"}</button>
              ) : (
                <button type="button" onClick={goToNextExercise} className="gc-compact-action">{ar ? "التالي" : "Next"} <ChevronLeft className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ) : null}

          {phase === "ready" && lastLogged ? (
            <div className="gc-gym-saved-strip" aria-live="polite">
              <Check className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{ar ? "آخر سِت اتحفظت" : "Last set saved"} · {lastLogged.weightKg ?? 0} {ar ? "كجم" : "kg"} × {lastLogged.reps}</span>
              <button type="button" disabled={busy} onClick={() => void undoLastSet()}>{ar ? "تراجع" : "Undo"}</button>
            </div>
          ) : null}

          {phase === "ready" && activeSet ? (
            <div className="gc-gym-set-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="gc-eyebrow">{ar ? "سِت" : "Set"} {activeSet.setNumber}</p>
                  <h2 className="mt-0.5 text-lg font-black">{completedCurrentSets}/{currentExercise.sets.length} {ar ? "خلصوا" : "completed"}</h2>
                </div>
                <span className="gc-gym-current-set-kind">{activeSet.isWarmup ? (ar ? "إحماء" : "Warm-up") : (ar ? "Working set" : "Working set")}</span>
              </div>


              <div className="gc-gym-set-grid mt-3 grid grid-cols-2 gap-2" aria-label={ar ? "تسجيل السِت" : "Log set"}>
                <div className="gc-quick-set-control">
                  <span className="gc-quick-set-label">{ar ? "الوزن · كجم" : "Weight · kg"}</span>
                  <div className="mt-2 grid grid-cols-[2.6rem_1fr_2.6rem] items-center gap-1">
                    <button type="button" onClick={() => nudgeWeight(-weightStep)} className="gc-quick-set-nudge" aria-label={ar ? `قلل الوزن ${formatNumber(weightStep)}` : `Decrease weight by ${formatNumber(weightStep)}`}><Minus className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setPhase("logging")} className="gc-quick-set-value" aria-label={ar ? "عدّل الوزن" : "Edit weight"}>{selectedWeight || "—"}</button>
                    <button type="button" onClick={() => nudgeWeight(weightStep)} className="gc-quick-set-nudge" aria-label={ar ? `زوّد الوزن ${formatNumber(weightStep)}` : `Increase weight by ${formatNumber(weightStep)}`}><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="gc-quick-set-control">
                  <span className="gc-quick-set-label">{ar ? "العدات" : "Reps"}</span>
                  <div className="mt-2 grid grid-cols-[2.6rem_1fr_2.6rem] items-center gap-1">
                    <button type="button" onClick={() => nudgeReps(-1)} className="gc-quick-set-nudge" aria-label={ar ? "قلل عدة" : "Decrease reps"}><Minus className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setPhase("logging")} className="gc-quick-set-value" aria-label={ar ? "عدّل العدات" : "Edit reps"}>{selectedReps || "—"}</button>
                    <button type="button" onClick={() => nudgeReps(1)} className="gc-quick-set-nudge" aria-label={ar ? "زوّد عدة" : "Increase reps"}><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>


              <button type="button" disabled={busy || selectedReps === ""} onClick={() => void logSet()} className="gc-primary-button gc-gym-log-button mt-3 w-full min-h-14 text-base disabled:opacity-40">
                <Check className="h-5 w-5" /> {busy ? (ar ? "بنحفظ…" : "Saving…") : (ar ? "أكمل السِت" : "Complete Set")}
              </button>
              {nextExercisePreview ? <button type="button" onClick={goToNextExercise} className="gc-gym-text-action mt-1 w-full"><SkipForward className="h-3.5 w-3.5" /> {ar ? "اعمله بعدين" : "Do later"}</button> : null}

            </div>
          ) : null}


          {phase === "logging" && activeSet ? (
            <div className="gc-gym-set-panel">
              <div className="flex items-center justify-between gap-3">
                <div><p className="gc-eyebrow">{ar ? "تفاصيل السِت" : "Set details"} {activeSet.setNumber}</p><h2 className="mt-0.5 text-lg font-black">{ar ? "الوزن والعدات" : "Weight & reps"}</h2></div>
                <button type="button" onClick={() => setPhase("ready")} className="gc-icon-button" aria-label={ar ? "ارجع" : "Back"}><X className="h-4 w-4" /></button>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between"><span className="text-xs font-bold text-neutral-500">{ar ? "الوزن · كجم" : "Weight · kg"}</span><span className="text-[10px] font-bold text-neutral-600">{ar ? "خطوة" : "Step"} {formatNumber(weightStep)}</span></div>
                <div className="gc-number-strip mt-2" role="list" aria-label={ar ? "اختيارات الوزن" : "Weight options"}>
                  {weightOptions.map((weight) => {
                    const selected = Number(selectedWeight) === weight;
                    const last = previousSet?.weightKg === weight;
                    return <button key={weight} type="button" onClick={() => { setSelectedWeight(weight.toString()); setShowCustomWeight(false); }} className={`gc-number-option ${selected ? "gc-number-option-selected" : ""}`}><span className="text-xl font-black tabular-nums">{formatNumber(weight)}</span><span className="text-[9px] font-bold text-neutral-500">{ar ? "كجم" : "kg"}</span>{last ? <span className="gc-number-badge">{ar ? "آخر مرة" : "Last"}</span> : null}</button>;
                  })}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {WEIGHT_STEPS.map((step) => <button key={step} type="button" onClick={() => saveWeightStep(step)} className={`gc-step-chip ${weightStep === step ? "gc-step-chip-active" : ""}`}>+{formatNumber(step)}</button>)}
                  <button type="button" onClick={() => setShowCustomWeight((value) => !value)} className="gc-step-chip me-auto">{ar ? "رقم تاني" : "Custom"}</button>
                </div>
                {showCustomWeight ? <input autoFocus inputMode="decimal" type="number" min={0} step="any" value={selectedWeight} onChange={(event) => setSelectedWeight(event.target.value)} className="gc-input mt-2 text-center text-lg font-black tabular-nums" /> : null}
              </div>

              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <span className="text-xs font-bold text-neutral-500">{ar ? "العدات" : "Reps"}</span>
                <div className="gc-rep-grid mt-2" role="list" aria-label={ar ? "اختيارات العدات" : "Rep options"}>
                  {repOptions.map((reps) => {
                    const selected = Number(selectedReps) === reps;
                    const last = previousSet?.reps === reps;
                    return <button key={reps} type="button" onClick={() => { setSelectedReps(reps.toString()); setShowCustomReps(false); }} className={`gc-rep-option ${selected ? "gc-number-option-selected" : ""}`}><span className="text-lg font-black tabular-nums">{reps}</span>{last ? <span className="gc-number-badge">{ar ? "آخر مرة" : "Last"}</span> : null}</button>;
                  })}
                </div>
                <button type="button" onClick={() => setShowCustomReps((value) => !value)} className="mt-2 text-xs font-bold text-emerald-200">{ar ? "عدد تاني" : "Custom reps"}</button>
                {showCustomReps ? <input autoFocus inputMode="numeric" type="number" min={1} step={1} value={selectedReps} onChange={(event) => setSelectedReps(event.target.value)} className="gc-input mt-2 text-center text-lg font-black tabular-nums" /> : null}
              </div>

              <button type="button" disabled={busy || selectedReps === ""} onClick={() => void logSet()} className="gc-primary-button gc-gym-log-button mt-4 w-full text-base disabled:opacity-40">
                <Check className="h-5 w-5" /> {busy ? (ar ? "بنحفظ…" : "Saving…") : (ar ? "أكمل السِت" : "Complete Set")}
              </button>
            </div>
          ) : null}

          {phase === "post" && lastLogged ? (
            <div className="gc-gym-post-strip" aria-live="polite">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400 text-[#101319]"><Check className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><strong className="block text-base tabular-nums">{lastLogged.weightKg ?? 0} {ar ? "كجم" : "kg"} × {lastLogged.reps}</strong><span className="block truncate text-xs font-semibold text-neutral-500">{getComparison(lastLogged, language)}</span></div>
              <div className="flex shrink-0 items-center gap-1">
                {restTimer.isRunning ? <button type="button" onClick={restTimer.open} className="gc-compact-action"><TimerReset className="h-3.5 w-3.5" /> {formatDuration(restTimer.remainingSeconds)}</button> : null}
                <button type="button" disabled={busy} onClick={() => void undoLastSet()} className="gc-compact-action">{ar ? "تراجع" : "Undo"}</button>
              </div>
            </div>
          ) : null}

          {phase === "post" && lastLogged ? (
            <div className="grid gap-2">
              {workoutComplete ? (
                <button type="button" disabled={busy} onClick={() => void finish()} className="gc-primary-button gc-workout-finish-button w-full disabled:opacity-50"><Check className="h-4 w-4" /> {busy ? (ar ? "بنخلّص…" : "Finishing…") : (ar ? "خلّص التمرينة" : "Finish workout")}</button>
              ) : nextIncompleteSet ? (
                <button type="button" onClick={() => { const nextIndex = currentExercise.sets.findIndex((set) => set.id === nextIncompleteSet.id); prepareSetValues(nextIndex >= 0 ? nextIndex : activeSetIndex); setPhase("ready"); }} className="gc-primary-button w-full"><Play className="h-4 w-4" /> {ar ? "سِت" : "Set"} {nextIncompleteSet.setNumber}</button>
              ) : (
                <button type="button" onClick={goToNextExercise} className="gc-primary-button w-full">{ar ? "التمرين اللي بعده" : "Next exercise"} <ChevronLeft className="h-4 w-4" /></button>
              )}
              {!workoutComplete ? <button type="button" onClick={goToNextExercise} className="gc-gym-text-action"><SkipForward className="h-3.5 w-3.5" /> {ar ? "تمرين تاني" : "Another exercise"}</button> : null}
            </div>
          ) : null}

        </section>
      )}

      {showExitDialog ? (
        <div className="gc-workout-options-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowExitDialog(false); }}>
          <section className="gc-workout-options-sheet" role="dialog" aria-modal="true" aria-label={ar ? "التمرين لسه شغال" : "Workout still in progress"}>
            <div className="gc-workout-options-handle" />
            <div className="text-center">
              <p className="gc-eyebrow">Gym Mode</p>
              <h2 className="mt-1 text-xl font-black">{ar ? "التمرين لسه شغال" : "Workout still in progress"}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-neutral-500">{ar ? "كل السِتات متحفظة. تقدر تكمل، تنهي الجلسة، أو تخرج وترجع لها من Home." : "Every set is autosaved. Resume, end the session, or leave it active and return from Home."}</p>
            </div>
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={() => setShowExitDialog(false)} className="gc-primary-button w-full"><Play className="h-4 w-4" /> {ar ? "كمّل التمرين" : "Resume workout"}</button>
              <button type="button" disabled={busy} onClick={() => { setShowExitDialog(false); void finish(); }} className="gc-secondary-button w-full disabled:opacity-50"><Check className="h-4 w-4" /> {ar ? "أنهي التمرين" : "End workout"}</button>
              <button type="button" disabled={busy} onClick={() => { setShowExitDialog(false); void leaveWorkout(); }} className="gc-secondary-button w-full disabled:opacity-50"><LogOut className="h-4 w-4" /> {ar ? "اخرج من غير إنهاء" : "Exit without ending"}</button>
            </div>
          </section>
        </div>
      ) : null}

      {showWorkoutOptions ? (
        <div className="gc-workout-options-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowWorkoutOptions(false); }}>
          <section className="gc-workout-options-sheet" role="dialog" aria-modal="true" aria-label={ar ? "خيارات التمرينة" : "Workout options"}>
            <div className="gc-workout-options-handle" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="gc-eyebrow">Gym Mode</p>
                <h2 className="mt-0.5 text-xl font-black">{ar ? "خيارات التمرينة" : "Workout options"}</h2>
                <p className="mt-1 text-xs font-semibold text-neutral-500">{ar ? "الإعدادات الثانوية هنا عشان شاشة التسجيل تفضل مركزة." : "Secondary actions live here so logging stays focused."}</p>
              </div>
              <button type="button" onClick={() => setShowWorkoutOptions(false)} className="gc-icon-button" aria-label={ar ? "اقفل" : "Close"}><X className="h-4 w-4" /></button>
            </div>

            <div className="gc-workout-options-list mt-4">
              <button type="button" onClick={() => { setPhase("overview"); setQueueEditing(true); setShowWorkoutOptions(false); }} className="gc-workout-option-row">
                <span className="gc-workout-option-icon"><List className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 text-start"><strong>{ar ? "إدارة التمارين" : "Manage exercises"}</strong><small>{ar ? "ترتيب القائمة وتعديلها" : "Reorder and edit the queue"}</small></span>
                <ChevronLeft className="h-4 w-4 text-neutral-600" />
              </button>


              {phase !== "overview" ? (
                <button type="button" disabled={busy} onClick={() => { setShowWorkoutOptions(false); void removeCurrentExercise(); }} className="gc-workout-option-row">
                  <span className="gc-workout-option-icon"><Trash2 className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1 text-start"><strong>{ar ? "شيل التمرين الحالي" : "Remove current exercise"}</strong><small>{ar ? "من الجلسة الحالية" : "From this session"}</small></span>
                </button>
              ) : null}
            </div>

            {showExercisePicker ? (
              <div className="mt-3 space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                <select value={selectedExercise} onChange={(event) => setSelectedExercise(event.target.value)} className="gc-input text-sm">
                  <option value="">{ar ? "اختار تمرين…" : "Choose an exercise…"}</option>
                  {availableExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{t(translateExerciseName(exercise.name))}</option>)}
                </select>
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400"><input type="checkbox" checked={permanent} onChange={(event) => setPermanent(event.target.checked)} /> {ar ? "ضيفه كمان للجدول" : "Also add to base plan"}</label>
                {!isOnline && permanent ? <p className="text-xs font-semibold text-amber-300">{ar ? "تعديل الجدول محتاج نت؛ هيتحفظ في الجلسة الحالية بس." : "Editing the base plan needs internet; it will only be saved to this session for now."}</p> : null}
                <button type="button" disabled={!selectedExercise || busy} onClick={() => void addExercise()} className="gc-primary-button w-full disabled:opacity-40"><Plus className="h-4 w-4" /> {ar ? "إضافة" : "Add"}</button>
                <button type="button" onClick={() => setShowCustomExercise((value) => !value)} className="gc-gym-text-action w-full">{ar ? "تمرين مخصص" : "Custom exercise"}</button>
                {showCustomExercise ? <CustomExerciseForm compact defaultWorkoutType="custom" onCreated={addExercise} onCancel={() => setShowCustomExercise(false)} /> : null}
              </div>
            ) : null}

            {phase !== "overview" ? (
              <label className="mt-4 block text-xs font-bold text-neutral-500">
                {ar ? "ملاحظة التمرين" : "Exercise note"}
                <textarea defaultValue={currentExercise.notes} onBlur={(event) => void updateWorkoutExerciseNotes(currentExercise.id, event.target.value).catch((caught: Error) => setError(caught.message))} rows={2} placeholder={ar ? "مسكة، وضع جهاز، ملاحظة…" : "Grip, machine setup, note…"} className="gc-input mt-2 font-normal" />
              </label>
            ) : null}

            {phase !== "overview" && activeSet ? (
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-neutral-500">{ar ? "خيارات السِت" : "Set options"}</p>
                <label className="gc-gym-warmup-toggle mt-2">
                  <input type="checkbox" checked={activeSet.isWarmup} onChange={(event) => void updateWorkoutSet(activeSet.id, { weightKg: parseOptionalNumber(selectedWeight), reps: parseOptionalNumber(selectedReps), isCompleted: false, isWarmup: event.target.checked }).then(reload).catch((caught: Error) => setError(t(getArabicErrorMessage(caught, "معرفناش نغيّر نوع السِت."))))} />
                  <span><strong>{ar ? "Warm-up" : "Warm-up"}</strong><small>{ar ? "تتسجل، لكن مش تدخل في الحجم أو الـPR" : "Logged, but excluded from working volume and PRs"}</small></span>
                </label>
                <details className="gc-gym-effort mt-2">
                  <summary className="gc-gym-effort-summary">{ar ? "RIR / Failure (اختياري)" : "RIR / Failure (optional)"}<span>{selectedRir ? (selectedRir === "failure" ? "Failure" : `RIR ${selectedRir}`) : (ar ? "بدون" : "Skip")}</span></summary>
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {(["0", "1", "2", "3+", "failure"] as const).map((value) => <button key={value} type="button" onClick={() => setSelectedRir((current) => current === value ? "" : value)} className={`gc-rir-chip ${selectedRir === value ? "gc-rir-chip-active" : ""}`}>{value === "failure" ? "Failure" : `RIR ${value}`}</button>)}
                  </div>
                </details>
              </div>
            ) : null}

            <div className="gc-timer-sound mt-4 flex min-w-0 items-center justify-between gap-3 p-3 text-start">
              <div className="min-w-0"><p className="text-sm font-bold">{ar ? "خلّي الشاشة شغالة" : "Keep screen awake"}</p><p className="mt-0.5 text-xs font-semibold text-neutral-500">{ar ? "اختياري أثناء التمرين" : "Optional during workouts"}</p></div>
              <button type="button" role="switch" aria-checked={keepAwake} onClick={() => setKeepAwake((value) => !value)} className={`gc-switch ${keepAwake ? "gc-switch-active" : ""}`}><span className="gc-switch-thumb" /></button>
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-2">
              <div className="px-2 pb-2 pt-1">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-neutral-500">{ar ? "تنبيهات التمرين" : "Workout feedback"}</p>
                <p className="mt-1 text-[11px] font-semibold text-neutral-600">{ar ? "تحكم في الاهتزاز والصوت من غير ما يقطعوا التمرين." : "Control haptics and sound without interrupting your workout."}</p>
              </div>
              <div className="grid gap-2">
                <div className="gc-timer-sound flex min-w-0 items-center justify-between gap-3 p-3 text-start">
                  <div className="flex min-w-0 items-center gap-3"><span className="gc-settings-icon h-9 w-9"><Smartphone className="h-4 w-4" /></span><div className="min-w-0"><p className="text-sm font-bold">{ar ? "اهتزاز تسجيل السِت" : "Set haptic"}</p><p className="mt-0.5 text-xs font-semibold text-neutral-500">{ar ? "تأكيد خفيف عند Complete Set" : "Light confirmation on Complete Set"}</p></div></div>
                  <button type="button" role="switch" aria-checked={hapticsEnabled} onClick={() => setHapticsEnabled((value) => !value)} className={`gc-switch ${hapticsEnabled ? "gc-switch-active" : ""}`}><span className="gc-switch-thumb" /></button>
                </div>
                <div className="gc-timer-sound flex min-w-0 items-center justify-between gap-3 p-3 text-start">
                  <div className="flex min-w-0 items-center gap-3"><span className="gc-settings-icon h-9 w-9"><Smartphone className="h-4 w-4" /></span><div className="min-w-0"><p className="text-sm font-bold">{ar ? "اهتزاز انتهاء الراحة" : "Rest-end haptic"}</p><p className="mt-0.5 text-xs font-semibold text-neutral-500">{ar ? "ينبهك لما التايمر يخلص" : "Alerts you when the timer ends"}</p></div></div>
                  <button type="button" role="switch" aria-checked={restTimer.hapticsEnabled} onClick={() => restTimer.setHapticsEnabled(!restTimer.hapticsEnabled)} className={`gc-switch ${restTimer.hapticsEnabled ? "gc-switch-active" : ""}`}><span className="gc-switch-thumb" /></button>
                </div>
                <div className="gc-timer-sound flex min-w-0 items-center justify-between gap-3 p-3 text-start">
                  <div className="flex min-w-0 items-center gap-3"><span className="gc-settings-icon h-9 w-9"><Bell className="h-4 w-4" /></span><div className="min-w-0"><p className="text-sm font-bold">{ar ? "صوت انتهاء الراحة" : "Rest-end sound"}</p><button type="button" onClick={restTimer.testSound} className="mt-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-200">{ar ? "جرّب الصوت" : "Test sound"}</button></div></div>
                  <button type="button" role="switch" aria-checked={restTimer.soundEnabled} onClick={() => restTimer.setSoundEnabled(!restTimer.soundEnabled)} className={`gc-switch ${restTimer.soundEnabled ? "gc-switch-active" : ""}`}><span className="gc-switch-thumb" /></button>
                </div>
              </div>
              <button type="button" onClick={() => { setHapticsEnabled(false); restTimer.setHapticsEnabled(false); restTimer.setSoundEnabled(false); }} className="gc-secondary-button mt-2 w-full"><VolumeX className="h-4 w-4" /> {ar ? "وضع صامت" : "Silent"}</button>
            </div>

            <label className="mt-4 block text-xs font-bold text-neutral-500">
              {ar ? "ملاحظة الجلسة" : "Session note"}
              <textarea value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} onBlur={() => void updateWorkoutSessionNotes(session.id, sessionNotes)} rows={2} className="gc-input mt-2 font-normal" placeholder={ar ? "أي حاجة محتاج تفتكرها…" : "Anything you want to remember…"} />
            </label>

            <div className="mt-4 grid gap-2 border-t border-[var(--border)] pt-4">
              <button type="button" disabled={busy} onClick={() => { setShowWorkoutOptions(false); setShowExitDialog(true); }} className="gc-secondary-button w-full disabled:opacity-50"><LogOut className="h-4 w-4" /> {busy ? (ar ? "بنحفظ…" : "Saving…") : (ar ? "اخرج وسيب التمرين شغال" : "Exit without ending")}</button>
              <button type="button" disabled={busy} onClick={() => void discard()} className="gc-danger-button w-full disabled:opacity-40"><XCircle className="h-4 w-4" /> {ar ? "امسح الجلسة" : "Discard session"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
