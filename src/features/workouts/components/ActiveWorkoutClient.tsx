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
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  Dumbbell,
  GripVertical,
  History,
  List,
  ListPlus,
  LogOut,
  MessageSquareText,
  Minus,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCcw,
  Save,
  SlidersHorizontal,
  SkipForward,
  TimerReset,
  TrendingUp,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useRestTimer } from "@/contexts/rest-timer-context";
import { fetchExerciseLibrary } from "@/features/exercises/services/exercise.service";
import { CustomExerciseForm } from "@/features/exercises/components/CustomExerciseForm";
import { addSplitExercise } from "@/features/splits/services/split.service";
import type { Exercise, WorkoutSet } from "@/types";
import { formatDuration } from "@/lib/utils/format";
import { formatDateArEg, muscleLabelAr, translateExerciseName } from "@/lib/localization";
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
import { SetElapsedClock } from "./SetElapsedClock";
import { getSafeWorkoutDurationSeconds, isStaleActiveWorkout } from "../utils/session-time";

type GymPhase = "overview" | "ready" | "working" | "logging" | "post";

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

function formatWorkoutDate(value: string) {
  return formatDateArEg(value);
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

function getComparison(snapshot: LoggedSetSnapshot) {
  const pieces: string[] = [];
  if (
    snapshot.weightKg !== null &&
    snapshot.previousWeightKg !== null &&
    snapshot.weightKg !== snapshot.previousWeightKg
  ) {
    const difference = snapshot.weightKg - snapshot.previousWeightKg;
    pieces.push(`${difference > 0 ? "+" : ""}${formatNumber(difference)} كجم`);
  }
  if (
    snapshot.previousReps !== null &&
    snapshot.reps !== snapshot.previousReps
  ) {
    const difference = snapshot.reps - snapshot.previousReps;
    pieces.push(`${difference > 0 ? "+" : ""}${difference} عدة`);
  }
  if (snapshot.previousWeightKg === null && snapshot.previousReps === null) return "نقطة بداية جديدة";
  return pieces.length > 0 ? pieces.join(" · ") : "نفس آخر مرة";
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
): ProgressionSuggestion {
  if (!previousSet || previousSet.reps === null) {
    return {
      kind: "baseline",
      label: "أول مرة",
      detail: `ابدأ بوزن مريح وخلّي هدفك ${targetRepsMin}–${targetRepsMax} عدة بفورم نضيف.`,
      weightKg: null,
      reps: targetRepsMin,
    };
  }

  const reps = previousSet.reps;
  if (reps < targetRepsMin) {
    return {
      kind: "hold",
      label: "ثبّت الأول",
      detail: `آخر مرة كانت ${reps} عدات. ثبّت الوزن وحاول توصل ${targetRepsMin} بفورم نضيف قبل الزيادة.`,
      weightKg: previousSet.weightKg,
      reps: targetRepsMin,
    };
  }
  if (reps < targetRepsMax) {
    const nextReps = Math.min(targetRepsMax, reps + 1);
    return {
      kind: "reps",
      label: `+1 عدة`,
      detail: `نفس الوزن · هدف ${nextReps} عدات لو الفورم لسه نضيف.`,
      weightKg: previousSet.weightKg,
      reps: nextReps,
    };
  }
  if (previousSet.weightKg !== null && previousSet.weightKg > 0) {
    const nextWeight = Math.round((previousSet.weightKg + weightStep) * 100) / 100;
    return {
      kind: "load",
      label: `+${formatNumber(weightStep)} كجم`,
      detail: `وصلت سقف العدات. جرّب ${formatNumber(nextWeight)} كجم × ${targetRepsMin} لو آخر سِت كانت مستقرة.`,
      weightKg: nextWeight,
      reps: targetRepsMin,
    };
  }
  return {
    kind: "reps",
    label: "+1 عدة",
    detail: `حاول ${Math.min(targetRepsMax + 1, reps + 1)} عدة بنفس التنفيذ.`,
    weightKg: previousSet.weightKg,
    reps: reps + 1,
  };
}

function exerciseIsComplete(sets: WorkoutSet[]) {
  return sets.length > 0 && sets.every((set) => set.isCompleted);
}

export function ActiveWorkoutClient() {
  const router = useRouter();
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
  const [showExerciseNotes, setShowExerciseNotes] = useState(false);
  const [queueEditing, setQueueEditing] = useState(false);
  const [showWorkoutOptions, setShowWorkoutOptions] = useState(false);
  const [showCustomWeight, setShowCustomWeight] = useState(false);
  const [showCustomReps, setShowCustomReps] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState("");
  const [selectedReps, setSelectedReps] = useState("");
  const [weightStep, setWeightStep] = useState<number>(2.5);
  const [setStartedAt, setSetStartedAt] = useState<number | null>(null);
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
    ? buildProgressionSuggestion(previousSet, currentExercise.targetRepsMin, currentExercise.targetRepsMax, weightStep)
    : null;

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
    const exercises = session?.exercises ?? [];
    const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
    const completedSets = exercises.reduce(
      (sum, exercise) => sum + exercise.sets.filter((set) => set.isCompleted).length,
      0,
    );
    const completedExercises = exercises.filter((exercise) =>
      exerciseIsComplete(exercise.sets),
    ).length;
    return { totalSets, completedSets, completedExercises };
  }, [session]);

  const progress = totals.totalSets > 0 ? (totals.completedSets / totals.totalSets) * 100 : 0;
  const workoutComplete = totals.totalSets > 0 && totals.completedSets === totals.totalSets;
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
    setWeightStep(readWeightStep(exercise.exerciseId, performance?.sets ?? []));
    preparedSet.current = set ? `${session.id}:${set.id}` : null;
    setShowCustomWeight(false);
    setShowCustomReps(false);
    setLastLogged(null);
    setSetStartedAt(null);
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
      setError(getArabicErrorMessage(caught, "معرفناش نرتّب التمارين."));
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
    tapFeedback();
  }

  function nudgeReps(delta: number) {
    const parsed = Number(selectedReps);
    const base = Number.isInteger(parsed) && parsed > 0
      ? parsed
      : previousSet?.reps ?? activeSet?.reps ?? 8;
    setSelectedReps(String(Math.max(1, base + delta)));
    setShowCustomReps(false);
    tapFeedback();
  }

  function prepareSetValues(setIndex: number) {
    if (!currentExercise) return;
    const set = currentExercise.sets[setIndex];
    const previous = previousSets[setIndex];
    setSelectedWeight(set?.weightKg?.toString() ?? previous?.weightKg?.toString() ?? "");
    setSelectedReps(set?.reps?.toString() ?? previous?.reps?.toString() ?? "");
    setWeightStep(readWeightStep(currentExercise.exerciseId, previousSets));
    preparedSet.current = set ? `${session?.id ?? "session"}:${set.id}` : null;
    setShowCustomWeight(false);
    setShowCustomReps(false);
    setLastLogged(null);
    setSetStartedAt(null);
  }

  function startSet() {
    if (!activeSet) return;
    setError(null);
    setSetStartedAt(Date.now());
    setPhase("working");
  }

  async function logSet() {
    if (!currentExercise || !activeSet) return;
    const weightKg = parseOptionalNumber(selectedWeight);
    const reps = parseOptionalNumber(selectedReps);

    if (Number.isNaN(weightKg) || (weightKg !== null && (weightKg < 0 || weightKg > 5000))) {
      setError("اختار وزن صحيح.");
      return;
    }
    if (Number.isNaN(reps) || reps === null || !Number.isInteger(reps) || reps <= 0 || reps > 1000) {
      setError("اختار عدد العدات اللي خلصتها.");
      return;
    }

    setBusy(true);
    setError(null);

    const isFinalPlannedSet = totals.totalSets > 0 && totals.completedSets + 1 >= totals.totalSets;

    // Start inside the user's tap so mobile browsers unlock the completion sound.
    // The final planned set does not need a rest timer; it should flow straight to workout completion.
    if (!isFinalPlannedSet) {
      restTimer.start(restTimer.durationSeconds);
      restTimer.open();
    }

    try {
      await updateWorkoutSet(activeSet.id, {
        weightKg,
        reps,
        isCompleted: true,
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
      setSetStartedAt(null);
      tapFeedback(isFinalPlannedSet ? [18, 35, 18] : 14);
      await reload();
      setPhase("post");
    } catch (caught) {
      if (!isFinalPlannedSet) {
        restTimer.reset();
        restTimer.close();
      }
      setError(getArabicErrorMessage(caught, "معرفناش نسجّل السِت دي."));
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
      setError(getArabicErrorMessage(caught, "معرفناش نحفظ التمرينة قبل ما تخرج."));
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
          setError("اتحفظ في التمرينة دي. وصّل النت عشان تضيفه لجدولك بشكل دائم.");
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
      setError(getArabicErrorMessage(caught, "معرفناش نضيف التمرين."));
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
      setError(getArabicErrorMessage(caught, "معرفناش نشيل التمرين."));
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
      tapFeedback([8, 30, 8]);
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نعيد تشغيل مؤقت التمرينة."));
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
      setError(getArabicErrorMessage(caught, "معرفناش نخلّص التمرينة."));
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
      setError(getArabicErrorMessage(caught, "معرفناش نمسح التمرينة."));
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
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-300 text-[#11131a]">
            <Dumbbell className="h-4.5 w-4.5" />
          </span>
          <button
            type="button"
            onClick={() => { setPhase("overview"); setQueueEditing(false); }}
            className="min-w-0 flex-1 text-start"
            aria-label="افتح تمارين النهارده"
          >
            <span className="block truncate text-[10px] font-bold uppercase tracking-[0.13em] text-indigo-200">Gym Mode</span>
            <span className="block truncate text-sm font-black">
              {phase === "overview" ? "تمارين النهارده" : translateExerciseName(currentExercise.exercise.name)}
            </span>
          </button>
          <span className="hidden rounded-lg bg-white/[0.04] px-2 py-1.5 text-[11px] font-bold text-neutral-400 min-[375px]:block">
            <SessionElapsedTime startedAt={session.startedAt} compact />
          </span>
          <button
            type="button"
            onClick={() => setShowWorkoutOptions(true)}
            className="gc-gym-menu-button"
            aria-label="خيارات التمرينة"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-indigo-300 transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-neutral-600">
          <span>{totals.completedSets}/{totals.totalSets} سِت</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </header>

      {staleSession ? (
        <section className="gc-stale-session-alert" role="status">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
          <span className="min-w-0 flex-1 text-xs font-semibold text-neutral-400">الجلسة قديمة؛ الوقت القديم مش هيتحسب.</span>
          <button type="button" disabled={resumingStale} onClick={() => void resumeStaleSession()} className="gc-stale-session-resume disabled:opacity-50">
            <RefreshCcw className="h-3.5 w-3.5" /> {resumingStale ? "بنعيد…" : "كمّل من دلوقتي"}
          </button>
        </section>
      ) : null}

      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-300" role="alert">{error}</p> : null}

      {phase === "overview" ? (
        <section className="space-y-3">
          <div className="gc-gym-queue-toolbar">
            <div className="min-w-0">
              <p className="text-sm font-black">تمارين النهارده</p>
              <p className="mt-0.5 text-[11px] font-semibold text-neutral-500">{totals.completedExercises}/{session.exercises.length} خلصوا · {totals.completedSets}/{totals.totalSets} سِت</p>
            </div>
            <button
              type="button"
              onClick={() => setQueueEditing((value) => !value)}
              className={`gc-compact-action ${queueEditing ? "gc-compact-action-active" : ""}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> {queueEditing ? "تم" : "تعديل"}
            </button>
          </div>

          <div className="gc-gym-queue" aria-label="تمارين النهارده">
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
                      <span className="block truncate text-sm font-black">{translateExerciseName(exercise.exercise.name)}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-semibold text-neutral-500">
                        {completedSets}/{exercise.sets.length} سِت{previous?.sets[0] ? ` · ${previous.sets[0].weightKg ?? 0} كجم × ${previous.sets[0].reps ?? 0}` : " · أول مرة"}
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
              <ListPlus className="h-4 w-4" /> ضيف تمرين
            </button>
          ) : null}

          {workoutComplete ? (
            <button type="button" disabled={busy} onClick={() => void finish()} className="gc-primary-button gc-workout-finish-button w-full disabled:opacity-50">
              <Check className="h-4 w-4" /> {busy ? "بنخلّص…" : "خلّص التمرينة"}
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
              <Play className="h-4 w-4" /> {totals.completedSets > 0 ? "كمّل" : "ابدأ"}
            </button>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <div className="gc-gym-exercise-head">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500">
                <span>تمرين {currentIndex + 1}/{session.exercises.length}</span>
                <span>·</span>
                <span>{muscleLabelAr(currentExercise.exercise.primaryMuscle)}</span>
                {currentExercise.isSessionOnlyAddition ? <span className="gc-mini-badge">للجلسة دي</span> : null}
              </div>
              <h1 className="mt-1 truncate text-xl font-black tracking-[-0.025em]">{translateExerciseName(currentExercise.exercise.name)}</h1>
            </div>
          </div>

          <div className="gc-gym-history-line">
            <History className="h-3.5 w-3.5 shrink-0 text-indigo-200" />
            {previousPerformanceLoading ? (
              <span>بنجيب آخر أرقام…</span>
            ) : previousPerformance ? (
              <span>آخر مرة {formatWorkoutDate(previousPerformance.scheduledDate)}{previousSet ? ` · ${previousSet.weightKg ?? 0} كجم × ${previousSet.reps ?? 0}` : ""}</span>
            ) : (
              <span>أول مرة · هنثبت نقطة البداية</span>
            )}
          </div>

          {currentComplete && !lastLogged ? (
            <div className="gc-gym-complete-strip">
              <Check className="h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1"><strong>{workoutComplete ? "كل التمرينة خلصت" : "التمرين خلص"}</strong><span>{completedCurrentSets}/{currentExercise.sets.length} سِت</span></div>
              {workoutComplete ? (
                <button type="button" disabled={busy} onClick={() => void finish()} className="gc-compact-action">إنهاء</button>
              ) : (
                <button type="button" onClick={goToNextExercise} className="gc-compact-action">التالي <ChevronLeft className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ) : null}

          {phase === "ready" && activeSet ? (
            <div className="gc-gym-set-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="gc-eyebrow">سِت {activeSet.setNumber}</p>
                  <h2 className="mt-0.5 text-lg font-black">{completedCurrentSets}/{currentExercise.sets.length} خلصوا</h2>
                </div>
                <span className="text-xs font-bold text-neutral-500">هدف {currentExercise.targetRepsMin}–{currentExercise.targetRepsMax}</span>
              </div>

              {progressionSuggestion ? (
                <div className={`gc-gym-suggestion gc-gym-suggestion-${progressionSuggestion.kind}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /><strong>{progressionSuggestion.label}</strong></div>
                    <p>{progressionSuggestion.detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (progressionSuggestion.weightKg !== null) setSelectedWeight(formatNumber(progressionSuggestion.weightKg));
                      setSelectedReps(String(progressionSuggestion.reps));
                      tapFeedback();
                    }}
                    className="gc-gym-suggestion-action"
                  >
                    استخدم
                  </button>
                </div>
              ) : null}

              <div className="gc-gym-set-grid mt-3 grid grid-cols-2 gap-2" aria-label="تسجيل السِت">
                <div className="gc-quick-set-control">
                  <span className="gc-quick-set-label">الوزن · كجم</span>
                  <div className="mt-2 grid grid-cols-[2.6rem_1fr_2.6rem] items-center gap-1">
                    <button type="button" onClick={() => nudgeWeight(-weightStep)} className="gc-quick-set-nudge" aria-label={`قلل الوزن ${formatNumber(weightStep)}`}><Minus className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setPhase("logging")} className="gc-quick-set-value" aria-label="عدّل الوزن">{selectedWeight || "—"}</button>
                    <button type="button" onClick={() => nudgeWeight(weightStep)} className="gc-quick-set-nudge" aria-label={`زوّد الوزن ${formatNumber(weightStep)}`}><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="gc-quick-set-control">
                  <span className="gc-quick-set-label">العدات</span>
                  <div className="mt-2 grid grid-cols-[2.6rem_1fr_2.6rem] items-center gap-1">
                    <button type="button" onClick={() => nudgeReps(-1)} className="gc-quick-set-nudge" aria-label="قلل عدة"><Minus className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setPhase("logging")} className="gc-quick-set-value" aria-label="عدّل العدات">{selectedReps || "—"}</button>
                    <button type="button" onClick={() => nudgeReps(1)} className="gc-quick-set-nudge" aria-label="زوّد عدة"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>

              <button type="button" disabled={busy || selectedReps === ""} onClick={() => void logSet()} className="gc-primary-button gc-gym-log-button mt-3 w-full min-h-14 text-base disabled:opacity-40">
                <Check className="h-5 w-5" /> {busy ? "بنحفظ…" : `سجّل ${selectedWeight || "0"} كجم × ${selectedReps || "—"}`}
              </button>

              <div className="gc-gym-inline-tools mt-2">
                <button type="button" onClick={() => setPhase("logging")}><SlidersHorizontal className="h-4 w-4" /><span>تفاصيل</span></button>
                <button type="button" onClick={startSet}><TimerReset className="h-4 w-4" /><span>مؤقت</span></button>
                <button type="button" onClick={() => setPhase("overview")}><List className="h-4 w-4" /><span>التمارين</span></button>
              </div>
            </div>
          ) : null}

          {phase === "working" && activeSet ? (
            <div className="gc-gym-set-panel text-center">
              <p className="gc-eyebrow">سِت {activeSet.setNumber}</p>
              <p className="mt-2 text-5xl font-black tracking-[-0.06em]"><SetElapsedClock key={activeSet.id} startedAt={setStartedAt} /></p>
              <button type="button" onClick={() => { setSelectedWeight((current) => current || activeSet.weightKg?.toString() || previousSet?.weightKg?.toString() || ""); setSelectedReps((current) => current || activeSet.reps?.toString() || previousSet?.reps?.toString() || String(currentExercise.targetRepsMin)); setWeightStep(readWeightStep(currentExercise.exerciseId, previousSets)); setPhase("logging"); }} className="gc-primary-button mt-5 w-full">
                <Check className="h-4 w-4" /> خلصت السِت
              </button>
              <button type="button" onClick={() => { setSetStartedAt(null); setPhase("ready"); }} className="mt-1 min-h-10 w-full text-xs font-bold text-neutral-500">إلغاء</button>
            </div>
          ) : null}

          {phase === "logging" && activeSet ? (
            <div className="gc-gym-set-panel">
              <div className="flex items-center justify-between gap-3">
                <div><p className="gc-eyebrow">تفاصيل السِت {activeSet.setNumber}</p><h2 className="mt-0.5 text-lg font-black">الوزن والعدات</h2></div>
                <button type="button" onClick={() => setPhase("ready")} className="gc-icon-button" aria-label="ارجع"><X className="h-4 w-4" /></button>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between"><span className="text-xs font-bold text-neutral-500">الوزن · كجم</span><span className="text-[10px] font-bold text-neutral-600">خطوة {formatNumber(weightStep)}</span></div>
                <div className="gc-number-strip mt-2" role="list" aria-label="اختيارات الوزن">
                  {weightOptions.map((weight) => {
                    const selected = Number(selectedWeight) === weight;
                    const last = previousSet?.weightKg === weight;
                    return <button key={weight} type="button" onClick={() => { setSelectedWeight(weight.toString()); setShowCustomWeight(false); }} className={`gc-number-option ${selected ? "gc-number-option-selected" : ""}`}><span className="text-xl font-black tabular-nums">{formatNumber(weight)}</span><span className="text-[9px] font-bold text-neutral-500">كجم</span>{last ? <span className="gc-number-badge">آخر مرة</span> : null}</button>;
                  })}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {WEIGHT_STEPS.map((step) => <button key={step} type="button" onClick={() => saveWeightStep(step)} className={`gc-step-chip ${weightStep === step ? "gc-step-chip-active" : ""}`}>+{formatNumber(step)}</button>)}
                  <button type="button" onClick={() => setShowCustomWeight((value) => !value)} className="gc-step-chip me-auto">رقم تاني</button>
                </div>
                {showCustomWeight ? <input autoFocus inputMode="decimal" type="number" min={0} step="any" value={selectedWeight} onChange={(event) => setSelectedWeight(event.target.value)} className="gc-input mt-2 text-center text-lg font-black tabular-nums" /> : null}
              </div>

              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <span className="text-xs font-bold text-neutral-500">العدات</span>
                <div className="gc-rep-grid mt-2" role="list" aria-label="اختيارات العدات">
                  {repOptions.map((reps) => {
                    const selected = Number(selectedReps) === reps;
                    const last = previousSet?.reps === reps;
                    return <button key={reps} type="button" onClick={() => { setSelectedReps(reps.toString()); setShowCustomReps(false); }} className={`gc-rep-option ${selected ? "gc-number-option-selected" : ""}`}><span className="text-lg font-black tabular-nums">{reps}</span>{last ? <span className="gc-number-badge">آخر مرة</span> : null}</button>;
                  })}
                </div>
                <button type="button" onClick={() => setShowCustomReps((value) => !value)} className="mt-2 text-xs font-bold text-indigo-200">عدد تاني</button>
                {showCustomReps ? <input autoFocus inputMode="numeric" type="number" min={1} step={1} value={selectedReps} onChange={(event) => setSelectedReps(event.target.value)} className="gc-input mt-2 text-center text-lg font-black tabular-nums" /> : null}
              </div>

              <button type="button" disabled={busy || selectedReps === ""} onClick={() => void logSet()} className="gc-primary-button gc-gym-log-button mt-4 w-full text-base disabled:opacity-40">
                <Check className="h-5 w-5" /> {busy ? "بنحفظ…" : `سجّل ${selectedWeight || "0"} كجم × ${selectedReps || "—"}`}
              </button>
            </div>
          ) : null}

          {phase === "post" && lastLogged ? (
            <div className="gc-gym-post-strip" aria-live="polite">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400 text-[#101319]"><Check className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><strong className="block text-base tabular-nums">{lastLogged.weightKg ?? 0} كجم × {lastLogged.reps}</strong><span className="block truncate text-xs font-semibold text-neutral-500">{getComparison(lastLogged)}</span></div>
              {restTimer.isRunning ? <button type="button" onClick={restTimer.open} className="gc-compact-action"><TimerReset className="h-3.5 w-3.5" /> {formatDuration(restTimer.remainingSeconds)}</button> : null}
            </div>
          ) : null}

          {phase === "post" && lastLogged ? (
            <div className="grid gap-2">
              {workoutComplete ? (
                <button type="button" disabled={busy} onClick={() => void finish()} className="gc-primary-button gc-workout-finish-button w-full disabled:opacity-50"><Check className="h-4 w-4" /> {busy ? "بنخلّص…" : "خلّص التمرينة"}</button>
              ) : nextIncompleteSet ? (
                <button type="button" onClick={() => { const nextIndex = currentExercise.sets.findIndex((set) => set.id === nextIncompleteSet.id); prepareSetValues(nextIndex >= 0 ? nextIndex : activeSetIndex); setPhase("ready"); }} className="gc-primary-button w-full"><Play className="h-4 w-4" /> سِت {nextIncompleteSet.setNumber}</button>
              ) : (
                <button type="button" onClick={goToNextExercise} className="gc-primary-button w-full">التمرين اللي بعده <ChevronLeft className="h-4 w-4" /></button>
              )}
              {!workoutComplete ? <button type="button" onClick={goToNextExercise} className="gc-gym-text-action"><SkipForward className="h-3.5 w-3.5" /> تمرين تاني</button> : null}
            </div>
          ) : null}

          {previousPerformance?.exerciseNotes ? (
            <button type="button" onClick={() => setShowExerciseNotes((value) => !value)} className="gc-gym-note-row">
              <MessageSquareText className="h-4 w-4 shrink-0 text-indigo-200" />
              <span className={`min-w-0 flex-1 text-start text-xs text-neutral-400 ${showExerciseNotes ? "" : "truncate"}`}>{previousPerformance.exerciseNotes}</span>
            </button>
          ) : null}
        </section>
      )}

      {showWorkoutOptions ? (
        <div className="gc-workout-options-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowWorkoutOptions(false); }}>
          <section className="gc-workout-options-sheet" role="dialog" aria-modal="true" aria-label="خيارات التمرينة">
            <div className="gc-workout-options-handle" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="gc-eyebrow">Gym Mode</p>
                <h2 className="mt-0.5 text-xl font-black">خيارات التمرينة</h2>
                <p className="mt-1 text-xs font-semibold text-neutral-500">الإعدادات الثانوية هنا عشان شاشة التسجيل تفضل مركزة.</p>
              </div>
              <button type="button" onClick={() => setShowWorkoutOptions(false)} className="gc-icon-button" aria-label="اقفل"><X className="h-4 w-4" /></button>
            </div>

            <div className="gc-workout-options-list mt-4">
              <button type="button" onClick={() => { setPhase("overview"); setQueueEditing(true); setShowWorkoutOptions(false); }} className="gc-workout-option-row">
                <span className="gc-workout-option-icon"><List className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 text-start"><strong>إدارة التمارين</strong><small>ترتيب القائمة وتعديلها</small></span>
                <ChevronLeft className="h-4 w-4 text-neutral-600" />
              </button>

              <button type="button" onClick={() => setShowExercisePicker((value) => !value)} className="gc-workout-option-row">
                <span className="gc-workout-option-icon"><ListPlus className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 text-start"><strong>ضيف تمرين</strong><small>للجلسة دي أو للجدول الأساسي</small></span>
                <ChevronDown className={`h-4 w-4 text-neutral-500 transition ${showExercisePicker ? "rotate-180" : ""}`} />
              </button>

              {phase !== "overview" ? (
                <button type="button" disabled={busy} onClick={() => { setShowWorkoutOptions(false); void removeCurrentExercise(); }} className="gc-workout-option-row">
                  <span className="gc-workout-option-icon"><Trash2 className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1 text-start"><strong>شيل التمرين الحالي</strong><small>من الجلسة الحالية</small></span>
                </button>
              ) : null}
            </div>

            {showExercisePicker ? (
              <div className="mt-3 space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                <select value={selectedExercise} onChange={(event) => setSelectedExercise(event.target.value)} className="gc-input text-sm">
                  <option value="">اختار تمرين…</option>
                  {availableExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{translateExerciseName(exercise.name)}</option>)}
                </select>
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400"><input type="checkbox" checked={permanent} onChange={(event) => setPermanent(event.target.checked)} /> ضيفه كمان للجدول</label>
                {!isOnline && permanent ? <p className="text-xs font-semibold text-amber-300">تعديل الجدول محتاج نت؛ هيتحفظ في الجلسة الحالية بس.</p> : null}
                <button type="button" disabled={!selectedExercise || busy} onClick={() => void addExercise()} className="gc-primary-button w-full disabled:opacity-40"><Plus className="h-4 w-4" /> إضافة</button>
                <button type="button" onClick={() => setShowCustomExercise((value) => !value)} className="gc-gym-text-action w-full">تمرين مخصص</button>
                {showCustomExercise ? <CustomExerciseForm compact defaultWorkoutType="custom" onCreated={addExercise} onCancel={() => setShowCustomExercise(false)} /> : null}
              </div>
            ) : null}

            {phase !== "overview" ? (
              <label className="mt-4 block text-xs font-bold text-neutral-500">
                ملاحظة التمرين
                <textarea defaultValue={currentExercise.notes} onBlur={(event) => void updateWorkoutExerciseNotes(currentExercise.id, event.target.value).catch((caught: Error) => setError(caught.message))} rows={2} placeholder="مسكة، وضع جهاز، ملاحظة…" className="gc-input mt-2 font-normal" />
              </label>
            ) : null}

            <label className="mt-4 block text-xs font-bold text-neutral-500">
              ملاحظة الجلسة
              <textarea value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} onBlur={() => void updateWorkoutSessionNotes(session.id, sessionNotes)} rows={2} className="gc-input mt-2 font-normal" placeholder="أي حاجة محتاج تفتكرها…" />
            </label>

            <div className="mt-4 grid gap-2 border-t border-[var(--border)] pt-4">
              <button type="button" disabled={busy} onClick={() => void leaveWorkout()} className="gc-secondary-button w-full disabled:opacity-50"><LogOut className="h-4 w-4" /> {busy ? "بنحفظ…" : "احفظ واخرج"}</button>
              <button type="button" disabled={busy} onClick={() => void discard()} className="gc-danger-button w-full disabled:opacity-40"><XCircle className="h-4 w-4" /> امسح الجلسة</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
