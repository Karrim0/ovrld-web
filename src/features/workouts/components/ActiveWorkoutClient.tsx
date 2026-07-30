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
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  GripVertical,
  History,
  ListPlus,
  LogOut,
  MessageSquareText,
  MoreHorizontal,
  Play,
  Plus,
  Save,
  Settings2,
  SkipForward,
  TimerReset,
  Trash2,
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
  addWorkoutSet,
  cancelWorkoutSession,
  deleteWorkoutExercise,
  finishWorkoutSession,
  reorderWorkoutExercises,
  updateWorkoutExerciseNotes,
  updateWorkoutSessionNotes,
  updateWorkoutSet,
} from "../services/workout-session.service";
import { SessionElapsedTime } from "./SessionElapsedTime";
import { MuscleFocusGraphic } from "./MuscleFocusGraphic";
import { SetElapsedClock } from "./SetElapsedClock";

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
  const [showCustomWeight, setShowCustomWeight] = useState(false);
  const [showCustomReps, setShowCustomReps] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState("");
  const [selectedReps, setSelectedReps] = useState("");
  const [weightStep, setWeightStep] = useState<number>(2.5);
  const [setStartedAt, setSetStartedAt] = useState<number | null>(null);
  const [lastLogged, setLastLogged] = useState<LoggedSetSnapshot | null>(null);
  const [draggingExerciseId, setDraggingExerciseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedSession = useRef<string | null>(null);

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
    setPhase("overview");
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

    // Start inside the user's tap so mobile browsers unlock the completion sound.
    restTimer.start(restTimer.durationSeconds);
    restTimer.open();

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
      await reload();
      setPhase("post");
    } catch (caught) {
      restTimer.reset();
      restTimer.close();
      setError(getArabicErrorMessage(caught, "معرفناش نسجّل السِت دي."));
    } finally {
      setBusy(false);
    }
  }

  async function addSet(exerciseId: string) {
    setBusy(true);
    try {
      await addWorkoutSet(exerciseId);
      await reload();
      setLastLogged(null);
      setPhase("ready");
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نضيف سِت."));
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
      const durationSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000),
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
    return <div className="h-72 animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.035]" />;
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

  return (
    <div className="gc-gym-mode mx-auto w-full min-w-0 space-y-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-1">
      <header className="gc-workout-header gc-gym-sticky sticky z-30 rounded-b-[22px] px-1 pb-3 pt-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPhase("overview")}
            className="inline-flex min-h-10 min-w-0 items-center gap-2 rounded-xl px-2 text-start"
            aria-label="افتح قائمة تمارين النهارده"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-300 text-[#11131a]">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-200">
                وضع الجيم
              </span>
              <span className="block truncate text-sm font-bold">
                {phase === "overview" ? "تمرينة النهارده" : translateExerciseName(currentExercise.exercise.name)}
              </span>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden rounded-lg bg-white/[0.04] px-2 py-1.5 text-xs font-bold text-neutral-400 min-[370px]:block">
              <SessionElapsedTime startedAt={session.startedAt} compact />
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void leaveWorkout()}
              className="gc-icon-button disabled:opacity-40"
              aria-label="احفظ واخرج من التمرينة"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-indigo-300 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-neutral-500">
          <span>{totals.completedSets}/{totals.totalSets} سِتات</span>
          <span>{totals.completedExercises}/{session.exercises.length} تمارين</span>
        </div>
      </header>

      {error ? (
        <p className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {phase === "overview" ? (
        <section className="space-y-4">
          <div className="gc-card overflow-hidden p-4 min-[380px]:p-5">
            <p className="gc-eyebrow">الكوتش مستنيك</p>
            <h1 className="mt-2 text-2xl font-bold tracking-[-0.035em] min-[380px]:text-3xl">
              تحب تبدأ بأنهي تمرين؟
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              اختار أي تمرين. اسحب ورتّب على الموبايلات الجديدة، أو استخدم الأسهم على الموبايلات الأقدم.
            </p>
          </div>

          <div className="space-y-2.5" aria-label="تمارين النهارده">
            {session.exercises.map((exercise, index) => {
              const done = exerciseIsComplete(exercise.sets);
              const completedSets = exercise.sets.filter((set) => set.isCompleted).length;
              const previous = performances[exercise.exerciseId];
              return (
                <div
                  key={exercise.id}
                  draggable={!busy}
                  onDragStart={() => setDraggingExerciseId(exercise.id)}
                  onDragEnd={() => setDraggingExerciseId(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, index)}
                  className={`gc-exercise-queue-item group min-w-0 rounded-[20px] border p-2.5 transition ${
                    draggingExerciseId === exercise.id
                      ? "border-indigo-200/40 bg-indigo-300/[0.08] opacity-70"
                      : done
                        ? "border-emerald-400/20 bg-emerald-400/[0.045]"
                        : "border-white/[0.07] bg-white/[0.025]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <button
                      type="button"
                      className="grid h-11 w-8 shrink-0 place-items-center rounded-xl text-neutral-600 group-hover:text-neutral-300"
                      aria-label={`اسحب ${translateExerciseName(exercise.exercise.name)}`}
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => selectExercise(index)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-start"
                    >
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${done ? "bg-emerald-400 text-[#101319]" : "bg-indigo-300/10 text-indigo-200"}`}>
                        {done ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{translateExerciseName(exercise.exercise.name)}</span>
                        <span className="mt-0.5 block truncate text-xs text-neutral-500">
                          {completedSets}/{exercise.sets.length} سِتات
                          {previous?.sets[0]
                            ? ` · آخر مرة ${previous.sets[0].weightKg ?? 0} كجم × ${previous.sets[0].reps ?? 0}`
                            : " · بداية جديدة"}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        disabled={index === 0 || busy}
                        onClick={() => void moveExercise(index, index - 1)}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.035] text-neutral-400 disabled:opacity-20"
                        aria-label={`طلّع ${translateExerciseName(exercise.exercise.name)} لفوق`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === session.exercises.length - 1 || busy}
                        onClick={() => void moveExercise(index, index + 1)}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.035] text-neutral-400 disabled:opacity-20"
                        aria-label={`نزّل ${translateExerciseName(exercise.exercise.name)} لتحت`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              const recommended = session.exercises.findIndex((exercise) =>
                exercise.sets.some((set) => !set.isCompleted),
              );
              selectExercise(recommended >= 0 ? recommended : 0);
            }}
            className="gc-primary-button w-full"
          >
            <Play className="h-5 w-5" />
            {totals.completedSets > 0 ? "كمّل التمرين المقترح" : "ابدأ التمرين المقترح"}
          </button>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="gc-card overflow-hidden">
            <div className="gc-gym-focus-card grid min-w-0 gap-4 p-4 min-[390px]:grid-cols-[1fr_8rem] min-[390px]:items-center min-[390px]:p-5">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="gc-eyebrow">تمرين {currentIndex + 1} من {session.exercises.length}</p>
                  <button
                    type="button"
                    onClick={() => setPhase("overview")}
                    className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-white/[0.05] px-2.5 text-xs font-bold text-neutral-300 min-[390px]:hidden"
                  >
                    <ChevronRight className="h-4 w-4" /> القائمة
                  </button>
                </div>
                <h1 className="mt-2 break-words text-2xl font-bold tracking-[-0.035em] min-[390px]:text-3xl">
                  {translateExerciseName(currentExercise.exercise.name)}
                </h1>
                <p className="mt-1 text-sm capitalize text-neutral-400">
                  {muscleLabelAr(currentExercise.exercise.primaryMuscle)}
                  {currentExercise.isSessionOnlyAddition ? " · للتمرينة دي بس" : ""}
                </p>
                {previousPerformanceLoading ? (
                  <p className="mt-3 text-xs font-semibold text-neutral-500">بنجيب أرقام آخر تمرينة…</p>
                ) : previousPerformance ? (
                  <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl bg-black/15 px-3 py-2 text-xs font-semibold text-neutral-300">
                    <History className="h-4 w-4 shrink-0 text-indigo-200" />
                    <span className="truncate">آخر مرة {formatWorkoutDate(previousPerformance.scheduledDate)}</span>
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-semibold text-neutral-500">أول تسجيل هيبقى نقطة البداية بتاعتك.</p>
                )}
              </div>
              <MuscleFocusGraphic
                primary={currentExercise.exercise.primaryMuscle}
                secondary={currentExercise.exercise.secondaryMuscles}
                compact
              />
            </div>
          </div>

          {currentComplete && !lastLogged ? (
            <div className="gc-card p-5 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400 text-[#101319]">
                <Check className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-xl font-bold">التمرين خلص</h2>
              <p className="mt-1 text-sm text-neutral-500">كل السِتات المطلوبة اتسجلت.</p>
              <div className="mt-5 grid gap-2 min-[380px]:grid-cols-2">
                <button type="button" onClick={goToNextExercise} className="gc-primary-button">
                  التمرين اللي بعده <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" disabled={busy} onClick={() => void addSet(currentExercise.id)} className="gc-secondary-button">
                  <Plus className="h-4 w-4" /> ضيف سِت كمان
                </button>
              </div>
            </div>
          ) : null}

          {phase === "ready" && activeSet ? (
            <div className="gc-card p-4 min-[380px]:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="gc-eyebrow">اللي جاي</p>
                  <h2 className="mt-1 text-2xl font-bold">سِت {activeSet.setNumber}</h2>
                </div>
                <span className="rounded-full bg-white/[0.055] px-3 py-1.5 text-xs font-bold text-neutral-400">
                  {currentExercise.sets.filter((set) => set.isCompleted).length}/{currentExercise.sets.length} خلصوا
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-indigo-300/15 bg-indigo-300/[0.055] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-indigo-200">آخر مرة في سِت {activeSet.setNumber}</p>
                {previousSet ? (
                  <p className="mt-1 text-3xl font-bold tabular-nums">
                    {previousSet.weightKg ?? 0} <span className="text-base text-neutral-500">كجم</span>
                    <span className="mx-2 text-neutral-600">×</span>
                    {previousSet.reps ?? 0} <span className="text-base text-neutral-500">عدة</span>
                  </p>
                ) : (
                  <p className="mt-1 text-lg font-bold text-neutral-300">مفيش أرقام قديمة لسه</p>
                )}
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  العب السِت الأول. لما تخلص، OVRLD هيسألك بس عن الوزن والعدات اللي حصلوا فعلًا.
                </p>
              </div>

              <button type="button" onClick={startSet} className="gc-primary-button mt-5 w-full text-base">
                <Play className="h-5 w-5" /> ابدأ سِت {activeSet.setNumber}
              </button>
              <button type="button" onClick={() => setPhase("overview")} className="mt-2 min-h-11 w-full text-sm font-semibold text-neutral-500">
                اختار تمرين تاني
              </button>
            </div>
          ) : null}

          {phase === "working" && activeSet ? (
            <div className="gc-card overflow-hidden p-5 text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-indigo-200/25 bg-indigo-300/[0.09] text-indigo-100 shadow-[0_0_45px_rgba(129,140,248,.12)]">
                <Dumbbell className="h-8 w-8" />
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-indigo-200">سِت {activeSet.setNumber} شغالة</p>
              <p className="mt-2 text-5xl font-bold tracking-[-0.06em]">
                <SetElapsedClock key={activeSet.id} startedAt={setStartedAt} />
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-neutral-500">
                ركّز في السِت. مفيش كتابة ولا فورمات ولا أي دوشة.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedWeight((current) => current || activeSet.weightKg?.toString() || previousSet?.weightKg?.toString() || "");
                  setSelectedReps((current) => current || activeSet.reps?.toString() || previousSet?.reps?.toString() || "");
                  setWeightStep(readWeightStep(currentExercise.exerciseId, previousSets));
                  setPhase("logging");
                }}
                className="gc-primary-button mt-7 w-full text-base"
              >
                <Check className="h-5 w-5" /> خلصت السِت
              </button>
              <button type="button" onClick={() => { setSetStartedAt(null); setPhase("ready"); }} className="mt-2 min-h-11 w-full text-sm font-semibold text-neutral-500">
                الغِ السِت دي
              </button>
            </div>
          ) : null}

          {phase === "logging" && activeSet ? (
            <div className="space-y-4">
              <div className="gc-card p-4 min-[380px]:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="gc-eyebrow">سِت {activeSet.setNumber} خلصت</p>
                    <h2 className="mt-1 text-2xl font-bold">لعبت بوزن كام؟</h2>
                  </div>
                  <span className="rounded-xl bg-white/[0.04] px-2.5 py-1.5 text-xs font-bold text-neutral-500">
                    الزيادة {formatNumber(weightStep)}
                  </span>
                </div>

                <div className="gc-number-strip mt-4" role="list" aria-label="اختيارات الوزن">
                  {weightOptions.map((weight) => {
                    const selected = Number(selectedWeight) === weight;
                    const last = previousSet?.weightKg === weight;
                    return (
                      <button
                        key={weight}
                        type="button"
                        onClick={() => { setSelectedWeight(weight.toString()); setShowCustomWeight(false); }}
                        className={`gc-number-option ${selected ? "gc-number-option-selected" : ""}`}
                      >
                        <span className="text-2xl font-bold tabular-nums">{formatNumber(weight)}</span>
                        <span className="text-[10px] font-bold uppercase text-neutral-500">كجم</span>
                        {last ? <span className="gc-number-badge">آخر مرة</span> : null}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">فرق الأوزان المتاح</span>
                  {WEIGHT_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => saveWeightStep(step)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${weightStep === step ? "bg-indigo-300 text-[#11131a]" : "bg-white/[0.045] text-neutral-400"}`}
                    >
                      {formatNumber(step)}
                    </button>
                  ))}
                  <button type="button" onClick={() => setShowCustomWeight((value) => !value)} className="me-auto rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-200">
                    رقم تاني
                  </button>
                </div>
                {showCustomWeight ? (
                  <label className="mt-3 block text-xs font-bold text-neutral-500">
                    وزن مختلف
                    <input
                      autoFocus
                      inputMode="decimal"
                      type="number"
                      min={0}
                      step="any"
                      value={selectedWeight}
                      onChange={(event) => setSelectedWeight(event.target.value)}
                      className="gc-input mt-1 text-center text-lg font-bold tabular-nums"
                    />
                  </label>
                ) : null}
              </div>

              <div className="gc-card p-4 min-[380px]:p-5">
                <h2 className="text-2xl font-bold">عملت كام عدة؟</h2>
                <div className="gc-rep-grid mt-4" role="list" aria-label="اختيارات العدات">
                  {repOptions.map((reps) => {
                    const selected = Number(selectedReps) === reps;
                    const last = previousSet?.reps === reps;
                    return (
                      <button
                        key={reps}
                        type="button"
                        onClick={() => { setSelectedReps(reps.toString()); setShowCustomReps(false); }}
                        className={`gc-rep-option ${selected ? "gc-number-option-selected" : ""}`}
                      >
                        <span className="text-xl font-bold tabular-nums">{reps}</span>
                        {last ? <span className="gc-number-badge">آخر مرة</span> : null}
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setShowCustomReps((value) => !value)} className="mt-3 text-xs font-bold text-indigo-200">
                  اكتب عدد عدات تاني
                </button>
                {showCustomReps ? (
                  <input
                    autoFocus
                    inputMode="numeric"
                    type="number"
                    min={1}
                    step={1}
                    value={selectedReps}
                    onChange={(event) => setSelectedReps(event.target.value)}
                    className="gc-input mt-2 text-center text-lg font-bold tabular-nums"
                  />
                ) : null}
              </div>

              <button
                type="button"
                disabled={busy || selectedReps === ""}
                onClick={() => void logSet()}
                className="gc-primary-button w-full text-base disabled:opacity-40"
              >
                {busy ? (
                  "بنحفظ…"
                ) : (
                  <>
                    <Check className="h-5 w-5" /> سجّل {selectedWeight || "0"} كجم × {selectedReps || "—"}
                  </>
                )}
              </button>
            </div>
          ) : null}

          {phase === "post" && lastLogged ? (
            <div className="gc-card p-5 text-center" aria-live="polite">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400 text-[#101319]">
                <Check className="h-8 w-8" />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">السِت اتسجلت</p>
              <h2 className="mt-1 text-3xl font-bold tabular-nums">
                {lastLogged.weightKg ?? 0} كجم × {lastLogged.reps}
              </h2>
              <p className="mt-2 text-sm font-semibold text-neutral-400">{getComparison(lastLogged)}</p>

              {restTimer.isRunning ? (
                <button type="button" onClick={restTimer.open} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-300/10 font-bold text-indigo-100">
                  <TimerReset className="h-5 w-5" /> فاضل {formatDuration(restTimer.remainingSeconds)} راحة
                </button>
              ) : null}

              <div className="mt-5 grid gap-2">
                {nextIncompleteSet ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWeight("");
                      setSelectedReps("");
                      setLastLogged(null);
                      setPhase("ready");
                    }}
                    className="gc-primary-button w-full"
                  >
                    <Play className="h-4 w-4" /> ابدأ سِت {nextIncompleteSet.setNumber}
                  </button>
                ) : (
                  <button type="button" onClick={goToNextExercise} className="gc-primary-button w-full">
                    التمرين اللي بعده <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={goToNextExercise} className="gc-secondary-button w-full">
                  <SkipForward className="h-4 w-4" /> روح لتمرين تاني
                </button>
                <button type="button" disabled={busy} onClick={() => void addSet(currentExercise.id)} className="min-h-11 text-sm font-semibold text-neutral-500 disabled:opacity-40">
                  <Plus className="ml-1 inline h-4 w-4" /> ضيف سِت كمان
                </button>
              </div>
            </div>
          ) : null}

          {previousPerformance?.exerciseNotes ? (
            <button
              type="button"
              onClick={() => setShowExerciseNotes((value) => !value)}
              className="gc-card-interactive flex w-full min-w-0 items-center gap-3 p-4 text-start"
            >
              <MessageSquareText className="h-5 w-5 shrink-0 text-indigo-200" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-neutral-500">آخر ملاحظة</span>
                <span className={`mt-0.5 block text-sm text-neutral-300 ${showExerciseNotes ? "" : "truncate"}`}>
                  {previousPerformance.exerciseNotes}
                </span>
              </span>
            </button>
          ) : null}
        </section>
      )}

      <details className="gc-card group overflow-hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] text-neutral-300">
            <Settings2 className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">خيارات التمرينة</span>
            <span className="block truncate text-xs text-neutral-500">ملاحظات، إضافة تمرين، إنهاء أو مسح التمرينة</span>
          </span>
          <MoreHorizontal className="h-5 w-5 text-neutral-500" />
        </summary>

        <div className="space-y-4 border-t border-white/[0.06] p-4">
          {phase !== "overview" ? (
            <div className="grid gap-2 min-[380px]:grid-cols-2">
              <button type="button" onClick={() => setPhase("overview")} className="gc-secondary-button">
                <ChevronRight className="h-4 w-4" /> قائمة التمارين
              </button>
              <button type="button" disabled={busy} onClick={() => void removeCurrentExercise()} className="gc-danger-button">
                <Trash2 className="h-4 w-4" /> شيل التمرين
              </button>
            </div>
          ) : null}

          {phase !== "overview" ? (
            <label className="block text-sm font-bold">
              ملاحظات التمرين
              <textarea
                defaultValue={currentExercise.notes}
                onBlur={(event) =>
                  void updateWorkoutExerciseNotes(currentExercise.id, event.target.value).catch(
                    (caught: Error) => setError(caught.message),
                  )
                }
                rows={3}
                placeholder="وضع الجهاز، المسكة، ملاحظات مهمة…"
                className="gc-input mt-2 font-normal"
              />
            </label>
          ) : null}

          <button
            type="button"
            onClick={() => setShowExercisePicker((value) => !value)}
            className="gc-secondary-button w-full"
          >
            <ListPlus className="h-4 w-4" /> ضيف تمرين تاني
          </button>

          {showExercisePicker ? (
            <div className="space-y-3 rounded-2xl bg-white/[0.025] p-3">
              <select
                value={selectedExercise}
                onChange={(event) => setSelectedExercise(event.target.value)}
                className="gc-input text-sm"
              >
                <option value="">اختار تمرين…</option>
                {availableExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>{translateExerciseName(exercise.name)}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={permanent} onChange={(event) => setPermanent(event.target.checked)} />
                ضيفه كمان بشكل ثابت في اليوم ده
              </label>
              {!isOnline && permanent ? (
                <p className="text-xs font-semibold text-amber-300">تعديل الجدول الأساسي محتاج نت، بس التمرين هيتحفظ في التمرينة دي.</p>
              ) : null}
              <button type="button" disabled={!selectedExercise || busy} onClick={() => void addExercise()} className="gc-primary-button w-full disabled:opacity-40">
                <Plus className="h-4 w-4" /> ضيف بسِتين
              </button>
              <button type="button" onClick={() => setShowCustomExercise((value) => !value)} className="gc-secondary-button w-full">
                اعمل تمرين مخصص
              </button>
              {showCustomExercise ? (
                <CustomExerciseForm compact defaultWorkoutType="custom" onCreated={addExercise} onCancel={() => setShowCustomExercise(false)} />
              ) : null}
            </div>
          ) : null}

          <label className="block text-sm font-bold">
            ملاحظات التمرينة
            <textarea
              value={sessionNotes}
              onChange={(event) => setSessionNotes(event.target.value)}
              onBlur={() => void updateWorkoutSessionNotes(session.id, sessionNotes)}
              rows={3}
              className="gc-input mt-2 font-normal"
              placeholder="طاقتك، أي تعديل مريح، أو حاجة تحب تفتكرها…"
            />
          </label>

          <button type="button" disabled={busy} onClick={() => void finish()} className="gc-primary-button w-full disabled:opacity-50">
            <Save className="h-5 w-5" /> {busy ? "بنخلّص…" : "خلّص التمرينة"}
          </button>
          <button type="button" disabled={busy} onClick={() => void discard()} className="gc-danger-button w-full disabled:opacity-40">
            <XCircle className="h-4 w-4" /> امسح التمرينة
          </button>
        </div>
      </details>
    </div>
  );
}
