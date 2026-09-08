"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { getArabicErrorMessage } from "@/lib/localization";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Check,
  ChevronDown,
  Dumbbell,
  Flame,
  Heart,
  Moon,
  MoreVertical,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Target,
  Trash2,
  WandSparkles,
  Zap,
} from "lucide-react";
import { WEEKDAYS_STARTING_SATURDAY } from "@/constants/schedule";
import { fetchExerciseLibrary } from "@/features/exercises/services/exercise.service";
import { CustomExerciseForm } from "@/features/exercises/components/CustomExerciseForm";
import { getTodayISODate, getWeekdayFromDate, parseISODateOnly } from "@/lib/dates";
import { WEEKDAY_LABELS_AR, WEEKDAY_SHORT_LABELS_AR, formatDateArEg, muscleLabelAr, translateExerciseName, translateWorkoutLabel } from "@/lib/localization";
import type {
  Exercise,
  GroupRole,
  ISODateOnlyString,
  SplitDayColorKey,
  SplitDayIconKey,
  UUID,
  Weekday,
  WorkoutType,
} from "@/types";
import type { SplitDayWithDetails, SplitExerciseWithDetails, WeeklyScheduleDayWithDetails } from "../types";
import {
  addSplitExercise,
  clearSplitDay,
  fetchEffectiveWeekSchedule,
  fetchGroupSplit,
  fetchPersonalSplit,
  moveSplitExercise,
  removeSplitExercise,
  resetPersonalSplitToGroup,
  resetWeekSchedule,
  swapWeeklyScheduleDays,
  updateSplitDaySettings,
  updateSplitExerciseTargets,
  updateWeeklyScheduleDay,
} from "../services/split.service";
import { SplitSetupChooser } from "./SplitSetupChooser";
import { PlanAuditPanel } from "./PlanAuditPanel";

interface SplitManagerProps {
  mode: "group" | "personal";
  groupId: UUID;
  userId: UUID;
  role: GroupRole;
}

const SHORT_DAY: Record<Weekday, string> = WEEKDAY_SHORT_LABELS_AR;

const LONG_DAY: Record<Weekday, string> = WEEKDAY_LABELS_AR;

const ICONS: Record<SplitDayIconKey, typeof Dumbbell> = {
  dumbbell: Dumbbell,
  zap: Zap,
  target: Target,
  flame: Flame,
  shield: Shield,
  heart: Heart,
  moon: Moon,
  activity: Activity,
};

const ICON_OPTIONS: Array<{ key: SplitDayIconKey; label: string }> = [
  { key: "dumbbell", label: "قوة" },
  { key: "zap", label: "طاقة" },
  { key: "target", label: "التركيز" },
  { key: "activity", label: "جسم كامل" },
  { key: "flame", label: "شدة" },
  { key: "shield", label: "تحكم" },
  { key: "heart", label: "لياقة" },
  { key: "moon", label: "راحة" },
];

const COLOR_OPTIONS: Array<{ key: SplitDayColorKey; className: string }> = [
  { key: "indigo", className: "bg-indigo-300" },
  { key: "blue", className: "bg-sky-300" },
  { key: "emerald", className: "bg-emerald-300" },
  { key: "amber", className: "bg-amber-300" },
  { key: "rose", className: "bg-rose-300" },
  { key: "violet", className: "bg-violet-300" },
];

const COLOR_TONES: Record<SplitDayColorKey, string> = {
  indigo: "border-indigo-300/35 bg-indigo-300/[0.09] text-indigo-200",
  blue: "border-sky-300/35 bg-sky-300/[0.09] text-sky-200",
  emerald: "border-emerald-300/35 bg-emerald-300/[0.09] text-emerald-200",
  amber: "border-amber-300/35 bg-amber-300/[0.09] text-amber-200",
  rose: "border-rose-300/35 bg-rose-300/[0.09] text-rose-200",
  violet: "border-violet-300/35 bg-violet-300/[0.09] text-violet-200",
};

const COLOR_LABELS: Record<SplitDayColorKey, string> = {
  indigo: "نيلي",
  blue: "أزرق",
  emerald: "أخضر",
  amber: "أصفر",
  rose: "وردي",
  violet: "بنفسجي",
};

const WORKOUT_FILTERS: Array<{ value: Exclude<WorkoutType, "rest">; label: string }> = [
  { value: "custom", label: "مخصص" },
  { value: "push", label: "تمارين البوش" },
  { value: "pull", label: "تمارين البول" },
  { value: "legs", label: "تمارين الرجل" },
];

function titleFor(day: Pick<SplitDayWithDetails, "displayName" | "workoutType">) {
  return translateWorkoutLabel(day.displayName?.trim()) || (day.workoutType === "rest" ? "راحة" : "يوم تمرين");
}

function dateCaption(value: ISODateOnlyString) {
  return formatDateArEg(parseISODateOnly(value), { day: "numeric", month: "short" });
}

interface ExerciseEditorProps {
  item: SplitExerciseWithDetails;
  index: number;
  count: number;
  canEdit: boolean;
  onReload: () => Promise<void>;
  onError: (message: string) => void;
}

function ExerciseEditor({ item, index, count, canEdit, onReload, onError }: ExerciseEditorProps) {
  const [sets, setSets] = useState(item.targetSets);
  const [min, setMin] = useState(item.targetRepsMin);
  const [max, setMax] = useState(item.targetRepsMax);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await onReload();
    } catch (caught) {
      onError(getArabicErrorMessage(caught, "معرفناش نعدّل التمرين."));
    } finally {
      setBusy(false);
    }
  }

  async function saveTargets() {
    if (!Number.isFinite(sets) || !Number.isFinite(min) || !Number.isFinite(max)) {
      onError("اكتب عدد سِتات وعدات صحيح.");
      return;
    }
    await run(() => updateSplitExerciseTargets(item.id, { targetSets: sets, targetRepsMin: min, targetRepsMax: max }));
    setEditing(false);
  }

  return (
    <li className="gc-split-exercise-card rounded-2xl p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="gc-stat grid h-10 w-10 shrink-0 place-items-center p-0 text-sm font-bold">{index + 1}</span>
        <button type="button" onClick={() => canEdit && setEditing((value) => !value)} className="min-w-0 flex-1 text-start">
          <p className="truncate font-bold">{translateExerciseName(item.exercise.name)}</p>
          <p className="mt-0.5 truncate text-xs capitalize text-neutral-500">{item.targetSets} سِتات · {item.targetRepsMin}–{item.targetRepsMax} عدات · {muscleLabelAr(item.exercise.primaryMuscle)}</p>
        </button>
        {canEdit ? (
          <details className="gc-exercise-desktop-menu relative shrink-0">
            <summary className="gc-icon-button list-none [&::-webkit-details-marker]:hidden" aria-label="خيارات التمرين"><MoreVertical className="h-4 w-4" /></summary>
            <div className="gc-action-menu">
              <button type="button" disabled={busy || index === 0} onClick={() => void run(() => moveSplitExercise(item.id, -1))} className="gc-action-menu-item disabled:opacity-30"><ArrowUp className="h-4 w-4" /> طلّع لفوق</button>
              <button type="button" disabled={busy || index === count - 1} onClick={() => void run(() => moveSplitExercise(item.id, 1))} className="gc-action-menu-item disabled:opacity-30"><ArrowDown className="h-4 w-4" /> نزّل لتحت</button>
              <button type="button" disabled={busy} onClick={() => {
                if (window.confirm(`تشيل ${translateExerciseName(item.exercise.name)} من اليوم ده؟`)) void run(() => removeSplitExercise(item.id));
              }} className="gc-action-menu-item text-red-500"><Trash2 className="h-4 w-4" /> شيل</button>
            </div>
          </details>
        ) : null}
      </div>

      {canEdit ? (
        <div className="gc-exercise-mobile-actions">
          <button type="button" disabled={busy || index === 0} onClick={() => void run(() => moveSplitExercise(item.id, -1))} className="gc-exercise-mobile-action disabled:opacity-30"><ArrowUp className="h-4 w-4" /> طلّع</button>
          <button type="button" disabled={busy || index === count - 1} onClick={() => void run(() => moveSplitExercise(item.id, 1))} className="gc-exercise-mobile-action disabled:opacity-30"><ArrowDown className="h-4 w-4" /> نزّل</button>
          <button type="button" disabled={busy} onClick={() => {
            if (window.confirm(`تشيل ${translateExerciseName(item.exercise.name)} من اليوم ده؟`)) void run(() => removeSplitExercise(item.id));
          }} className="gc-exercise-mobile-action gc-exercise-mobile-action-danger"><Trash2 className="h-4 w-4" /> شيل</button>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-white/[0.06] pt-3 min-[360px]:grid-cols-3">
          <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">السِتات<input type="number" inputMode="numeric" min={1} max={20} value={sets} onChange={(event) => setSets(event.target.valueAsNumber)} className="gc-input mt-1 min-h-11 text-center text-lg font-bold" /></label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">أقل عدات<input type="number" inputMode="numeric" min={1} max={100} value={min} onChange={(event) => setMin(event.target.valueAsNumber)} className="gc-input mt-1 min-h-11 text-center text-lg font-bold" /></label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">أعلى عدات<input type="number" inputMode="numeric" min={1} max={100} value={max} onChange={(event) => setMax(event.target.valueAsNumber)} className="gc-input mt-1 min-h-11 text-center text-lg font-bold" /></label>
          <button type="button" disabled={busy} onClick={() => void saveTargets()} className="gc-primary-button min-h-11 min-[360px]:col-span-3"><Save className="h-4 w-4" /> احفظ الأهداف</button>
        </div>
      ) : null}
    </li>
  );
}

export function SplitManager({ mode, groupId, userId, role }: SplitManagerProps) {
  const searchParams = useSearchParams();
  const requestedWeekday = searchParams.get("day") as Weekday | null;
  const [view, setView] = useState<"week" | "base">(mode === "personal" ? "week" : "base");
  const [days, setDays] = useState<SplitDayWithDetails[]>([]);
  const [weekDays, setWeekDays] = useState<WeeklyScheduleDayWithDetails[]>([]);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [selectedWeekDate, setSelectedWeekDate] = useState<ISODateOnlyString | null>(null);
  const [swapTargetDate, setSwapTargetDate] = useState<ISODateOnlyString | "">("");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [showCustomExercise, setShowCustomExercise] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canEdit = mode === "personal" || role === "owner" || role === "admin";
  const anchorDate = getTodayISODate();

  const fetchDays = useCallback(
    () => mode === "group" ? fetchGroupSplit(groupId) : fetchPersonalSplit(userId),
    [groupId, mode, userId],
  );

  const loadAll = useCallback(async () => {
    const [nextDays, nextWeek] = await Promise.all([
      fetchDays(),
      mode === "personal" ? fetchEffectiveWeekSchedule(userId, anchorDate) : Promise.resolve([]),
    ]);
    setDays(nextDays);
    setWeekDays(nextWeek);
    setSelectedBaseId((current) => current && nextDays.some((day) => day.id === current) ? current : nextDays[0]?.id ?? null);
    setSelectedWeekDate((current) => current && nextWeek.some((day) => day.scheduleDate === current) ? current : nextWeek.find((day) => day.scheduleDate === anchorDate)?.scheduleDate ?? nextWeek[0]?.scheduleDate ?? null);
  }, [anchorDate, fetchDays, mode, userId]);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchDays(), fetchExerciseLibrary(), mode === "personal" ? fetchEffectiveWeekSchedule(userId, anchorDate) : Promise.resolve([])])
      .then(([nextDays, nextLibrary, nextWeek]) => {
        if (!active) return;
        setDays(nextDays);
        setLibrary(nextLibrary);
        setWeekDays(nextWeek);
        const preferred = requestedWeekday && WEEKDAYS_STARTING_SATURDAY.includes(requestedWeekday)
          ? requestedWeekday
          : getWeekdayFromDate(new Date());
        setSelectedBaseId(nextDays.find((day) => day.weekday === preferred)?.id ?? nextDays[0]?.id ?? null);
        setSelectedWeekDate(nextWeek.find((day) => getWeekdayFromDate(parseISODateOnly(day.scheduleDate)) === preferred)?.scheduleDate ?? nextWeek[0]?.scheduleDate ?? null);
      })
      .catch((caught) => { if (active) setError(getArabicErrorMessage(caught, "معرفناش نحمّل الجدول.")); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [anchorDate, fetchDays, mode, requestedWeekday, userId]);

  const orderedDays = useMemo(() => [...days].sort((a, b) => WEEKDAYS_STARTING_SATURDAY.indexOf(a.weekday) - WEEKDAYS_STARTING_SATURDAY.indexOf(b.weekday)), [days]);
  const orderedWeek = useMemo(() => [...weekDays].sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate)), [weekDays]);
  const selectedBase = orderedDays.find((day) => day.id === selectedBaseId) ?? orderedDays[0] ?? null;
  const selectedWeek = orderedWeek.find((day) => day.scheduleDate === selectedWeekDate) ?? orderedWeek[0] ?? null;

  const [formName, setFormName] = useState("");
  const [formFocus, setFormFocus] = useState("");
  const [formType, setFormType] = useState<WorkoutType>("custom");
  const [formIcon, setFormIcon] = useState<SplitDayIconKey>("dumbbell");
  const [formColor, setFormColor] = useState<SplitDayColorKey>("indigo");
  const [formNotes, setFormNotes] = useState("");
  const [weekSourceId, setWeekSourceId] = useState("");

  useEffect(() => {
    const current = view === "base" ? selectedBase : selectedWeek;
    if (!current) return;
    setFormName(translateWorkoutLabel(current.displayName) || "يوم تمرين");
    setFormFocus(current.focusLabel ?? (current.workoutType === "rest" ? "راحة" : "مخصص"));
    setFormType(current.workoutType);
    setFormIcon(current.iconKey);
    setFormColor(current.colorKey);
    setFormNotes(current.dayNotes);
    if (view === "week" && selectedWeek) setWeekSourceId(selectedWeek.sourceSplitDayId ?? orderedDays.find((day) => day.workoutType !== "rest")?.id ?? "");
  }, [orderedDays, selectedBase, selectedWeek, view]);

  const availableExercises = useMemo(() => {
    if (!selectedBase) return [];
    return library.filter((exercise) => {
      const typeMatches = selectedBase.workoutType === "custom" || selectedBase.workoutType === "rest" || exercise.workoutType === selectedBase.workoutType || exercise.workoutType === "custom";
      return typeMatches && !selectedBase.exercises.some((item) => item.exerciseId === exercise.id);
    });
  }, [library, selectedBase]);

  function selectBase(day: SplitDayWithDetails) {
    setSelectedBaseId(day.id);
    setSelectedExercise("");
    setShowCustomExercise(false);
    setMessage(null);
  }

  function chooseWeekSource(sourceId: string) {
    setWeekSourceId(sourceId);
    const source = orderedDays.find((day) => day.id === sourceId);
    if (!source) return;
    setFormType(source.workoutType === "rest" ? "custom" : source.workoutType);
    setFormName(titleFor(source));
    setFormFocus(source.focusLabel ?? "مخصص");
    setFormIcon(source.iconKey);
    setFormColor(source.colorKey);
    setFormNotes(source.dayNotes);
  }

  function setAsTrainingDay() {
    if (view === "week") {
      const currentSource = orderedDays.find((day) => day.id === weekSourceId && day.workoutType !== "rest");
      const source = currentSource ?? orderedDays.find((day) => day.workoutType !== "rest");
      if (source) {
        chooseWeekSource(source.id);
        return;
      }
    }

    setFormType("custom");
    if (formIcon === "moon") setFormIcon("dumbbell");
    if (formName.toLowerCase().includes("recovery") || formName.toLowerCase().includes("rest")) setFormName("يوم تمرين");
    if (formFocus.toLowerCase().includes("recovery")) setFormFocus("مخصص");
  }

  async function saveIdentity() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (view === "base") {
        if (!selectedBase) return;
        await updateSplitDaySettings({
          splitDayId: selectedBase.id,
          workoutType: formType,
          displayName: formName,
          focusLabel: formFocus,
          iconKey: formIcon,
          colorKey: formColor,
          dayNotes: formNotes,
        });
        setMessage(`${LONG_DAY[selectedBase.weekday]} اتحفظ لكل أسبوع.`);
      } else {
        if (!selectedWeek || !weekSourceId) throw new Error("اختار اليوم ده هياخد أنهي تمرينة.");
        if (formType !== "rest" && (!selectedWeekSource || selectedWeekSource.workoutType === "rest")) {
          throw new Error("اختار يوم تمرين من جدولك الأساسي.");
        }
        await updateWeeklyScheduleDay({
          scheduleDate: selectedWeek.scheduleDate,
          sourceSplitDayId: weekSourceId,
          workoutType: formType,
          displayName: formName,
          focusLabel: formFocus,
          iconKey: formIcon,
          colorKey: formColor,
          dayNotes: formNotes,
        });
        setMessage(`${dateCaption(selectedWeek.scheduleDate)} اتغيّر للأسبوع ده بس.`);
      }
      await loadAll();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نحفظ اليوم ده."));
    } finally {
      setBusy(false);
    }
  }

  async function addExercise(exerciseOverride?: Exercise) {
    if (!selectedBase) return;
    const exercise = exerciseOverride ?? library.find((item) => item.id === selectedExercise);
    if (!exercise) return;
    setBusy(true);
    setError(null);
    try {
      await addSplitExercise({ splitDayId: selectedBase.id, exercise, isPersonalAddition: mode === "personal" });
      setSelectedExercise("");
      setShowCustomExercise(false);
      await loadAll();
      setMessage(`${translateExerciseName(exercise.name)} اتضاف لـ${titleFor(selectedBase)}.`);
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نضيف التمرين."));
    } finally {
      setBusy(false);
    }
  }

  async function resetBase() {
    if (!window.confirm("ترجّع جدولك الأساسي لجدول الجروب؟")) return;
    setBusy(true);
    setError(null);
    try {
      await resetPersonalSplitToGroup(userId);
      await loadAll();
      setMessage("جدولك الأساسي رجع لجدول الجروب.");
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نرجّع الجدول."));
    } finally {
      setBusy(false);
    }
  }

  async function swapSelectedWeekDay() {
    if (!selectedWeek || !swapTargetDate || selectedWeek.scheduleDate === swapTargetDate) return;
    const target = weekDays.find((day) => day.scheduleDate === swapTargetDate);
    if (!target) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await swapWeeklyScheduleDays(selectedWeek.scheduleDate, swapTargetDate);
      await loadAll();
      setMessage(`${dateCaption(selectedWeek.scheduleDate)} اتبدّل مع ${dateCaption(target.scheduleDate)} من غير ما نغيّر جدولك الأساسي.`);
      setSwapTargetDate("");
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نبدّل اليومين."));
    } finally {
      setBusy(false);
    }
  }

  async function resetCurrentWeek() {
    if (!window.confirm("تمسح تعديلات الأسبوع ده وترجع لجدولك الأساسي؟")) return;
    setBusy(true);
    setError(null);
    try {
      await resetWeekSchedule(anchorDate);
      await loadAll();
      setMessage("الأسبوع ده بقى زي جدولك الأساسي.");
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نرجّع الأسبوع ده."));
    } finally {
      setBusy(false);
    }
  }

  async function clearDay() {
    if (!selectedBase || !window.confirm(`تشيل كل التمارين من ${titleFor(selectedBase)}؟`)) return;
    setBusy(true);
    try {
      await clearSplitDay(selectedBase.id);
      await loadAll();
      setMessage("اليوم فاضي. ضيف التمارين اللي محتاجها بس.");
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نفضّي اليوم."));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <div className="h-72 animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.035]" />;
  if (!selectedBase) {
    return mode === "personal" ? (
      <div className="space-y-4 pb-20 pt-4">
        <section className="gc-plan-hero p-5">
          <p className="gc-eyebrow">ابدأ خطتك</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">جدولك هو قلب OVRLD</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">اعمل جدول يدوي، استورده، أو ابدأ بقالب وبعدها عدّل أي يوم براحتك.</p>
        </section>
        <SplitSetupChooser onChanged={loadAll} />
      </div>
    ) : <p className="gc-card p-5 text-sm text-neutral-400">مفيش أيام في الجدول لسه.</p>;
  }

  const selected = view === "base" ? selectedBase : selectedWeek;
  const SelectedIcon = ICONS[formIcon];
  const selectedWeekday = selectedWeek ? getWeekdayFromDate(parseISODateOnly(selectedWeek.scheduleDate)) : null;
  const selectedWeekSource = orderedDays.find((day) => day.id === weekSourceId) ?? null;
  const hasValidWeekSource = view !== "week" || formType === "rest" || Boolean(selectedWeekSource && selectedWeekSource.workoutType !== "rest");
  const baseTrainingDays = orderedDays.filter((day) => day.workoutType !== "rest").length;
  const weekTrainingDays = orderedWeek.filter((day) => day.workoutType !== "rest").length;
  const baseExerciseCount = orderedDays.reduce((total, day) => total + day.exercises.length, 0);
  const activeTrainingDays = view === "week" ? weekTrainingDays : baseTrainingDays;
  const planRevision = orderedDays.map((day) => `${day.id}:${day.workoutType}:${day.exercises.map((item) => `${item.id}-${item.targetSets}-${item.targetRepsMin}-${item.targetRepsMax}`).join(",")}`).join("|");

  return (
    <div className="space-y-4 pb-20 pt-4">
      {mode === "personal" ? (
        <section className="gc-card p-2">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-black/20 p-1">
            <button type="button" onClick={() => setView("week")} className={`min-h-11 rounded-xl text-sm font-bold transition ${view === "week" ? "bg-indigo-300 text-[#11131a]" : "text-neutral-400"}`}>الأسبوع ده</button>
            <button type="button" onClick={() => setView("base")} className={`min-h-11 rounded-xl text-sm font-bold transition ${view === "base" ? "bg-indigo-300 text-[#11131a]" : "text-neutral-400"}`}>الجدول الأساسي</button>
          </div>
        </section>
      ) : null}

      <section className="gc-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="gc-eyebrow">{view === "week" ? "الأسبوع ده" : mode === "group" ? "جدول الجروب" : "الجدول الأساسي"}</p>
            <h2 className="mt-1 text-lg font-black">{view === "week" ? "اختار اليوم وعدّله" : "اختار اليوم وعدّل تمارينه"}</h2>
          </div>
          {view === "week" ? <button type="button" disabled={busy} onClick={() => void resetCurrentWeek()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.08]" aria-label="رجّع الأسبوع ده"><RotateCcw className="h-4 w-4" /></button> : mode === "personal" ? <button type="button" disabled={busy} onClick={() => void resetBase()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.08]" aria-label="رجّع لجدول الجروب"><RotateCcw className="h-4 w-4" /></button> : null}
        </div>

        {mode === "personal" ? (
          <div className="gc-plan-inline-stats mt-3">
            <span><strong>{activeTrainingDays}</strong> تمرين</span>
            <span><strong>{7 - activeTrainingDays}</strong> راحة</span>
            <span><strong>{baseExerciseCount}</strong> تمرين محفوظ</span>
          </div>
        ) : null}

        <div className="gc-week-strip mt-3" role="tablist" aria-label="اختار يوم من الجدول">
          {(view === "week" ? orderedWeek : orderedDays).map((day) => {
            const isWeekDay = "scheduleDate" in day;
            const weekday = isWeekDay ? getWeekdayFromDate(parseISODateOnly(day.scheduleDate)) : day.weekday;
            const active = isWeekDay ? day.scheduleDate === selectedWeek?.scheduleDate : day.id === selectedBase.id;
            const Icon = ICONS[day.iconKey];
            return (
              <button key={isWeekDay ? day.scheduleDate : day.id} type="button" role="tab" aria-selected={active} onClick={() => {
                if (isWeekDay) setSelectedWeekDate(day.scheduleDate); else selectBase(day);
                setMessage(null);
              }} className={`gc-week-day-card ${active ? "gc-week-day-card-active gc-week-day-card-selected" : ""}`}>
                <span className={`block text-[10px] font-black uppercase ${active ? "text-indigo-200" : "text-neutral-500"}`}>{SHORT_DAY[weekday]}</span>
                <span className={`gc-week-day-icon ${day.workoutType === "rest" ? "gc-week-day-icon-rest" : ""}`}><Icon className="h-4 w-4" /></span>
                <span className={`mt-1.5 block truncate text-[11px] font-bold ${day.workoutType === "rest" ? "text-neutral-500" : "text-neutral-200"}`}>{translateWorkoutLabel(day.displayName) || "تمرين"}</span>
                {isWeekDay ? <span className="mt-1 block text-[9px] font-semibold text-neutral-600">{dateCaption(day.scheduleDate)}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      {mode === "personal" ? (
        <details className="gc-list-panel group">
          <summary className="gc-list-row list-none [&::-webkit-details-marker]:hidden"><WandSparkles className="h-4 w-4 text-indigo-400" /><span className="min-w-0 flex-1 font-bold">أدوات الجدول</span><span className="text-[10px] font-semibold text-neutral-500">إنشاء · استيراد · تحليل</span><ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" /></summary>
          <div className="space-y-3 border-t border-[var(--border)] p-3">
            <details className="rounded-xl border border-[var(--border)]"><summary className="gc-list-row list-none [&::-webkit-details-marker]:hidden"><WandSparkles className="h-4 w-4 text-indigo-400" /><span className="min-w-0 flex-1 font-bold">إنشاء أو استيراد جدول</span><ChevronDown className="h-4 w-4 text-neutral-500" /></summary><div className="border-t border-[var(--border)] p-3"><SplitSetupChooser onChanged={loadAll} /></div></details>
            <details className="rounded-xl border border-[var(--border)]"><summary className="gc-list-row list-none [&::-webkit-details-marker]:hidden"><Target className="h-4 w-4 text-indigo-400" /><span className="min-w-0 flex-1 font-bold">تحليل الخطة</span><ChevronDown className="h-4 w-4 text-neutral-500" /></summary><div className="border-t border-[var(--border)] p-2"><PlanAuditPanel userId={userId} revision={planRevision} /></div></details>
          </div>
        </details>
      ) : null}

      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-300">{error}</p> : null}
      {message ? <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-300">{message}</p> : null}

      {selected ? (
        <section className="gc-card overflow-visible">
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="gc-eyebrow">{view === "week" && selectedWeekday ? `${LONG_DAY[selectedWeekday]} · ${dateCaption(selectedWeek!.scheduleDate)}` : LONG_DAY[selectedBase.weekday]}</p>
                <h2 className="mt-1 text-xl font-black">{formName || "يوم تمرين"}</h2>
                <p className="mt-1 text-xs font-semibold text-neutral-500">{formType === "rest" ? "راحة" : `${view === "week" ? selectedWeek?.exercises.length ?? 0 : selectedBase.exercises.length} تمارين`}</p>
              </div>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${COLOR_TONES[formColor]}`}><SelectedIcon className="h-4 w-4" /></span>
            </div>

            {canEdit ? (
              <div className="mt-5 space-y-4">
                {view === "week" ? (
                  <details className="rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] group">
                    <summary className="flex min-h-11 list-none items-center gap-2 px-3 text-xs font-black [&::-webkit-details-marker]:hidden"><ArrowLeftRight className="h-4 w-4 text-neutral-500" /><span className="min-w-0 flex-1">بدّل اليوم مع يوم تاني</span><ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" /></summary>
                    <div className="flex gap-2 border-t border-[var(--border)] p-3">
                      <select value={swapTargetDate} onChange={(event) => setSwapTargetDate(event.target.value as ISODateOnlyString | "")} className="gc-input min-w-0 flex-1 text-sm">
                        <option value="">اختار يوم…</option>
                        {orderedWeek.filter((day) => day.scheduleDate !== selectedWeek?.scheduleDate).map((day) => (
                          <option key={day.scheduleDate} value={day.scheduleDate}>{LONG_DAY[getWeekdayFromDate(parseISODateOnly(day.scheduleDate))]} · {translateWorkoutLabel(day.displayName)}</option>
                        ))}
                      </select>
                      <button type="button" disabled={!swapTargetDate || busy} onClick={() => void swapSelectedWeekDay()} className="gc-secondary-button shrink-0 px-3 disabled:opacity-40" aria-label="بدّل اليومين"><ArrowLeftRight className="h-4 w-4" /></button>
                    </div>
                  </details>
                ) : null}

                {view === "week" ? (
                  <fieldset>
                    <legend className="text-[10px] font-bold uppercase tracking-[0.09em] text-neutral-500">اختار تمرينة من جدولك</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {orderedDays.filter((day) => day.workoutType !== "rest").map((day) => {
                        const active = weekSourceId === day.id && formType !== "rest";
                        const Icon = ICONS[day.iconKey];
                        return <button key={day.id} type="button" onClick={() => chooseWeekSource(day.id)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-start ${active ? "border-indigo-300/45 bg-indigo-300/[0.1]" : "border-white/[0.08] bg-white/[0.025]"}`}><Icon className="h-4 w-4 text-indigo-200" /><span className="min-w-0"><strong className="block truncate text-sm">{titleFor(day)}</strong><span className="block truncate text-[11px] text-neutral-500">{day.focusLabel ?? "مخصص"}</span></span>{active ? <Check className="ms-auto h-4 w-4 text-indigo-200" /> : null}</button>;
                      })}
                    </div>
                  </fieldset>
                ) : null}

                <fieldset>
                  <legend className="text-[10px] font-bold uppercase tracking-[0.09em] text-neutral-500">خطة اليوم ده</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={setAsTrainingDay} className={`min-h-11 rounded-xl border text-sm font-bold ${formType !== "rest" ? "border-indigo-300/50 bg-indigo-300 text-[#11131a]" : "border-white/[0.08] text-neutral-400"}`}>تمرين</button>
                    <button type="button" onClick={() => { setFormType("rest"); setFormName("راحة"); setFormFocus("راحة"); setFormIcon("moon"); setFormColor("blue"); }} className={`min-h-11 rounded-xl border text-sm font-bold ${formType === "rest" ? "border-indigo-300/50 bg-indigo-300 text-[#11131a]" : "border-white/[0.08] text-neutral-400"}`}>راحة</button>
                  </div>
                </fieldset>

                <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">اسم اليوم<input value={formName} onChange={(event) => setFormName(event.target.value)} maxLength={40} placeholder="مثال: أبر A" className="gc-input mt-1 normal-case" /></label>

                <details className="group rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                  <summary className="flex min-h-12 list-none items-center gap-3 px-3.5 text-sm font-bold [&::-webkit-details-marker]:hidden">
                    <MoreVertical className="h-4 w-4 text-neutral-500" />
                    <span className="min-w-0 flex-1">خيارات متقدمة</span>
                    <span className="text-xs font-semibold text-neutral-600">تركيز · شكل · ملاحظات</span>
                    <ChevronDown className="h-4 w-4 text-neutral-600 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-4 border-t border-white/[0.06] p-3.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">تركيز اليوم<input value={formFocus} onChange={(event) => setFormFocus(event.target.value)} maxLength={32} placeholder="مثال: صدر وضهر" className="gc-input mt-1 normal-case" /></label>
                    {view === "base" && formType !== "rest" ? (
                      <fieldset><legend className="text-[10px] font-bold uppercase tracking-[0.09em] text-neutral-500">فلتر مكتبة التمارين</legend><div className="mt-2 flex flex-wrap gap-2">{WORKOUT_FILTERS.map((filter) => <button key={filter.value} type="button" onClick={() => setFormType(filter.value)} className={`rounded-full border px-3 py-2 text-xs font-bold ${formType === filter.value ? "border-indigo-300/45 bg-indigo-300/[0.12] text-indigo-100" : "border-white/[0.08] text-neutral-500"}`}>{filter.label}</button>)}</div></fieldset>
                    ) : null}
                    <fieldset><legend className="text-[10px] font-bold uppercase tracking-[0.09em] text-neutral-500">الأيقونة</legend><div className="mt-2 flex flex-wrap gap-2">{ICON_OPTIONS.map(({ key, label }) => { const Icon = ICONS[key]; return <button key={key} type="button" title={label} aria-label={label} onClick={() => setFormIcon(key)} className={`grid h-11 w-11 place-items-center rounded-xl border ${formIcon === key ? "border-indigo-300/50 bg-indigo-300 text-[#11131a]" : "border-white/[0.08] bg-white/[0.025] text-neutral-400"}`}><Icon className="h-4 w-4" /></button>; })}</div></fieldset>
                    <fieldset><legend className="text-[10px] font-bold uppercase tracking-[0.09em] text-neutral-500">اللون</legend><div className="mt-2 flex gap-2">{COLOR_OPTIONS.map(({ key, className }) => <button key={key} type="button" aria-label={`لون ${COLOR_LABELS[key]}`} onClick={() => setFormColor(key)} className={`relative grid h-10 w-10 place-items-center rounded-full border ${formColor === key ? "border-white/70" : "border-white/[0.08]"}`}><span className={`h-5 w-5 rounded-full ${className}`} />{formColor === key ? <Check className="absolute h-3 w-3 text-[#11131a]" /> : null}</button>)}</div></fieldset>
                    <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500">ملاحظات اليوم<textarea value={formNotes} onChange={(event) => setFormNotes(event.target.value)} maxLength={240} rows={3} placeholder="المسكة، سرعة الحركة، شدة التمرين…" className="gc-input mt-1 resize-none text-sm normal-case" /></label>
                  </div>
                </details>
                <button type="button" disabled={busy || formName.trim().length < 2 || formFocus.trim().length < 2 || (view === "week" && (!weekSourceId || !hasValidWeekSource))} onClick={() => void saveIdentity()} className="gc-primary-button w-full min-h-12 disabled:opacity-40"><Save className="h-4 w-4" /> احفظ {view === "week" ? "الأسبوع ده" : "اليوم الأساسي"}</button>
              </div>
            ) : null}
          </div>

          {view === "week" ? (
            <div className="border-t border-white/[0.06] p-4 sm:p-5">
              <p className="text-sm leading-6 text-neutral-500">التمارين جاية من <strong className="text-neutral-300">{selectedWeek?.sourceDay ? titleFor(selectedWeek.sourceDay) : "جدولك الأساسي"}</strong>. عشان تغيّر قائمة التمارين، افتح تبويب الجدول الأساسي.</p>
              <button type="button" onClick={() => { setView("base"); if (selectedWeek?.sourceSplitDayId) setSelectedBaseId(selectedWeek.sourceSplitDayId); }} className="gc-secondary-button mt-3">عدّل تمارينه</button>
            </div>
          ) : selectedBase.workoutType === "rest" ? (
            <div className="border-t border-white/[0.06] p-4 sm:p-5"><div className="rounded-2xl border border-dashed border-white/[0.1] p-5 text-center"><Moon className="mx-auto h-5 w-5 text-sky-200" /><p className="mt-2 font-bold">يوم راحة</p><p className="mt-1 text-sm text-neutral-500">التمارين المحفوظة هتفضل موجودة وترجع لو اليوم بقى تمرين تاني.</p></div></div>
          ) : (
            <div className="border-t border-white/[0.06] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-bold">التمارين</h3><span className="gc-chip">{selectedBase.exercises.length}</span></div>
              <ul className="space-y-2">{selectedBase.exercises.map((item, index) => <ExerciseEditor key={`${item.id}:${item.targetSets}:${item.targetRepsMin}:${item.targetRepsMax}`} item={item} index={index} count={selectedBase.exercises.length} canEdit={canEdit} onReload={loadAll} onError={setError} />)}</ul>
              {selectedBase.exercises.length === 0 ? <p className="rounded-2xl border border-dashed border-white/[0.1] p-5 text-center text-sm text-neutral-500">اليوم ده فاضي. ضيف التمارين اللي بتلعبها فعلًا في الجيم.</p> : null}
              {canEdit ? (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2"><select value={selectedExercise} onChange={(event) => setSelectedExercise(event.target.value)} className="gc-input min-w-0 flex-1 text-sm"><option value="">اختار تمرين…</option>{availableExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{translateExerciseName(exercise.name)}</option>)}</select><button type="button" disabled={!selectedExercise || busy} onClick={() => void addExercise()} className="gc-primary-button min-h-12 px-4 disabled:opacity-40"><Plus className="h-4 w-4" /> ضيف</button></div>
                  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setShowCustomExercise((value) => !value)} className="gc-secondary-button"><Plus className="h-4 w-4" /> تمرين مخصص</button><button type="button" disabled={selectedBase.exercises.length === 0 || busy} onClick={() => void clearDay()} className="gc-secondary-button text-red-300 disabled:opacity-40"><Trash2 className="h-4 w-4" /> فضّي اليوم</button></div>
                  {showCustomExercise ? <CustomExerciseForm defaultWorkoutType={selectedBase.workoutType} onCreated={addExercise} onCancel={() => setShowCustomExercise(false)} /> : null}
                </div>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
