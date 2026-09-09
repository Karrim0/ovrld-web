"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { getArabicErrorMessage } from "@/lib/localization";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import {
  Activity,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
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
  replaceSplitExercise,
  updateSplitExerciseTargets,
  updateWeeklyScheduleDay,
} from "../services/split.service";
import { SplitSetupChooser } from "./SplitSetupChooser";
import { PlanAuditPanel } from "./PlanAuditPanel";
import { getPlannedWorkoutMetrics } from "@/features/workouts/utils/workout-metrics";

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
  { key: "indigo", className: "bg-emerald-300" },
  { key: "blue", className: "bg-sky-300" },
  { key: "emerald", className: "bg-emerald-300" },
  { key: "amber", className: "bg-amber-300" },
  { key: "rose", className: "bg-rose-300" },
  { key: "violet", className: "bg-violet-300" },
];

const COLOR_TONES: Record<SplitDayColorKey, string> = {
  indigo: "border-emerald-300/35 bg-emerald-300/[0.09] text-emerald-200",
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
  alternatives: Exercise[];
  onReload: () => Promise<void>;
  onError: (message: string) => void;
}

function ExerciseEditor({ item, index, count, canEdit, alternatives, onReload, onError }: ExerciseEditorProps) {
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const [sets, setSets] = useState(item.targetSets);
  const [min, setMin] = useState(item.targetRepsMin);
  const [max, setMax] = useState(item.targetRepsMax);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [replacementId, setReplacementId] = useState("");

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
      onError(ar ? "اكتب عدد سِتات وعدات صحيح." : "Enter valid sets and reps.");
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
          <p className="mt-0.5 truncate text-xs capitalize text-neutral-500">{item.targetSets} {ar ? "سِتات" : "sets"} · {item.targetRepsMin}–{item.targetRepsMax} {ar ? "عدات" : "reps"} · {t(muscleLabelAr(item.exercise.primaryMuscle))}</p>
        </button>
        {canEdit ? (
          <details className="gc-exercise-desktop-menu relative shrink-0">
            <summary className="gc-icon-button list-none [&::-webkit-details-marker]:hidden" aria-label={ar ? "خيارات التمرين" : "Exercise options"}><MoreVertical className="h-4 w-4" /></summary>
            <div className="gc-action-menu">
              <button type="button" disabled={busy || index === 0} onClick={() => void run(() => moveSplitExercise(item.id, -1))} className="gc-action-menu-item disabled:opacity-30"><ArrowUp className="h-4 w-4" /> {ar ? "طلّع لفوق" : "Move up"}</button>
              <button type="button" disabled={busy || index === count - 1} onClick={() => void run(() => moveSplitExercise(item.id, 1))} className="gc-action-menu-item disabled:opacity-30"><ArrowDown className="h-4 w-4" /> {ar ? "نزّل لتحت" : "Move down"}</button>
              <button type="button" disabled={busy} onClick={() => {
                if (window.confirm(ar ? `تشيل ${translateExerciseName(item.exercise.name)} من اليوم ده؟` : `Remove ${t(translateExerciseName(item.exercise.name))} from this day?`)) void run(() => removeSplitExercise(item.id));
              }} className="gc-action-menu-item text-red-500"><Trash2 className="h-4 w-4" /> {ar ? "شيل" : "Remove"}</button>
            </div>
          </details>
        ) : null}
      </div>

      {canEdit && editing ? (
        <div className="gc-exercise-mobile-actions">
          <button type="button" disabled={busy || index === 0} onClick={() => void run(() => moveSplitExercise(item.id, -1))} className="gc-exercise-mobile-action disabled:opacity-30"><ArrowUp className="h-4 w-4" /> {ar ? "طلّع" : "Up"}</button>
          <button type="button" disabled={busy || index === count - 1} onClick={() => void run(() => moveSplitExercise(item.id, 1))} className="gc-exercise-mobile-action disabled:opacity-30"><ArrowDown className="h-4 w-4" /> {ar ? "نزّل" : "Down"}</button>
          <button type="button" disabled={busy} onClick={() => {
            if (window.confirm(ar ? `تشيل ${translateExerciseName(item.exercise.name)} من اليوم ده؟` : `Remove ${t(translateExerciseName(item.exercise.name))} from this day?`)) void run(() => removeSplitExercise(item.id));
          }} className="gc-exercise-mobile-action gc-exercise-mobile-action-danger"><Trash2 className="h-4 w-4" /> {ar ? "شيل" : "Remove"}</button>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-3 space-y-3 border-t border-white/[0.06] pt-3">
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
            <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{ar ? "السِتات" : "Sets"}<input type="number" inputMode="numeric" min={1} max={20} value={sets} onChange={(event) => setSets(event.target.valueAsNumber)} className="gc-input mt-1 min-h-11 text-center text-lg font-bold" /></label>
            <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{ar ? "أقل عدات" : "Min reps"}<input type="number" inputMode="numeric" min={1} max={100} value={min} onChange={(event) => setMin(event.target.valueAsNumber)} className="gc-input mt-1 min-h-11 text-center text-lg font-bold" /></label>
            <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{ar ? "أعلى عدات" : "Max reps"}<input type="number" inputMode="numeric" min={1} max={100} value={max} onChange={(event) => setMax(event.target.valueAsNumber)} className="gc-input mt-1 min-h-11 text-center text-lg font-bold" /></label>
            <button type="button" disabled={busy} onClick={() => void saveTargets()} className="gc-primary-button min-h-11 min-[360px]:col-span-3"><Save className="h-4 w-4" /> {ar ? "احفظ الأهداف" : "Save targets"}</button>
          </div>
          {alternatives.length ? (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{ar ? "بديل لنفس العضلة" : "Same-muscle alternative"}</p>
              <div className="mt-2 flex gap-2">
                <select value={replacementId} onChange={(event) => setReplacementId(event.target.value)} className="gc-input min-w-0 flex-1 text-sm">
                  <option value="">{ar ? "اختار بديل…" : "Choose alternative…"}</option>
                  {alternatives.map((exercise) => <option key={exercise.id} value={exercise.id}>{t(translateExerciseName(exercise.name))}</option>)}
                </select>
                <button type="button" disabled={!replacementId || busy} onClick={() => void run(async () => { await replaceSplitExercise(item.id, replacementId as UUID); setReplacementId(""); })} className="gc-secondary-button shrink-0 px-3 disabled:opacity-40">{ar ? "بدّل" : "Replace"}</button>
              </div>
              <p className="mt-1.5 text-[10px] leading-4 text-neutral-600">{ar ? "بنحافظ على السِتات والعدات، والبدائل المعروضة لنفس العضلة الأساسية عشان هدف الخطة مايتغيرش." : "Sets and rep targets stay the same, and alternatives match the same primary muscle."}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function SplitManager({ mode, groupId, userId, role }: SplitManagerProps) {
  const searchParams = useSearchParams();
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const requestedWeekday = searchParams.get("day") as Weekday | null;
  const [view, setView] = useState<"week" | "base">(mode === "personal" ? "week" : "base");
  const [editingDay, setEditingDay] = useState(false);
  const [editingExercises, setEditingExercises] = useState(false);
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
          <p className="gc-eyebrow">{ar ? "ابدأ خطتك" : "Start your plan"}</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{ar ? "جدولك هو قلب OVRLD" : "Your plan is the core of OVRLD"}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">{ar ? "اعمل جدول يدوي، استورده، أو ابدأ بقالب وبعدها عدّل أي يوم براحتك." : "Build manually, import a plan, or start from a template and edit any day later."}</p>
        </section>
        <SplitSetupChooser onChanged={loadAll} />
      </div>
    ) : <p className="gc-card p-5 text-sm text-neutral-400">{ar ? "مفيش أيام في الجدول لسه." : "No plan days yet."}</p>;
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
            <button type="button" onClick={() => { setView("week"); setEditingDay(false); setEditingExercises(false); }} className={`min-h-14 rounded-xl text-sm font-bold transition ${view === "week" ? "bg-emerald-300 text-[#11131a]" : "text-neutral-400"}`}>{ar ? "الأسبوع ده" : "This Week"}<span className="mt-0.5 block text-[9px] font-semibold opacity-65">{ar ? "تغييرات الأسبوع الحالي فقط" : "Changes only this week"}</span></button>
            <button type="button" onClick={() => { setView("base"); setEditingDay(false); setEditingExercises(false); }} className={`min-h-14 rounded-xl text-sm font-bold transition ${view === "base" ? "bg-emerald-300 text-[#11131a]" : "text-neutral-400"}`}>{ar ? "الخطة المتكررة" : "Repeating Plan"}<span className="mt-0.5 block text-[9px] font-semibold opacity-65">{ar ? "جدولك الافتراضي كل أسبوع" : "Your default weekly schedule"}</span></button>
          </div>
        </section>
      ) : null}

      <section className="gc-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="gc-eyebrow">{view === "week" ? (ar ? "الأسبوع ده" : "This Week") : mode === "group" ? (ar ? "جدول الجروب" : "Group plan") : (ar ? "الجدول الأساسي" : "Repeating Plan")}</p>
            <h2 className="mt-1 text-lg font-black">{view === "week" ? (ar ? "اختار اليوم وعدّله" : "Choose a day to edit") : (ar ? "اختار اليوم وعدّل تمارينه" : "Choose a day and edit its workout")}</h2>
          </div>
          {view === "week" ? <button type="button" disabled={busy} onClick={() => void resetCurrentWeek()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.08]" aria-label={ar ? "رجّع الأسبوع ده" : "Reset this week"}><RotateCcw className="h-4 w-4" /></button> : mode === "personal" ? <button type="button" disabled={busy} onClick={() => void resetBase()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.08]" aria-label={ar ? "رجّع لجدول الجروب" : "Reset to group plan"}><RotateCcw className="h-4 w-4" /></button> : null}
        </div>

        {mode === "personal" ? (
          <div className="gc-plan-inline-stats mt-3">
            <span><strong>{activeTrainingDays}</strong> {ar ? "تمرين" : "training days"}</span>
            <span><strong>{7 - activeTrainingDays}</strong> {ar ? "راحة" : "rest days"}</span>
            <span><strong>{baseExerciseCount}</strong> {ar ? "تمرين محفوظ" : "saved exercises"}</span>
          </div>
        ) : null}

        <div className="gc-week-strip mt-3" role="tablist" aria-label={ar ? "اختار يوم من الجدول" : "Choose a plan day"}>
          {(view === "week" ? orderedWeek : orderedDays).map((day) => {
            const isWeekDay = "scheduleDate" in day;
            const weekday = isWeekDay ? getWeekdayFromDate(parseISODateOnly(day.scheduleDate)) : day.weekday;
            const active = isWeekDay ? day.scheduleDate === selectedWeek?.scheduleDate : day.id === selectedBase.id;
            const Icon = ICONS[day.iconKey];
            return (
              <button key={isWeekDay ? day.scheduleDate : day.id} type="button" role="tab" aria-selected={active} onClick={() => {
                if (isWeekDay) setSelectedWeekDate(day.scheduleDate); else selectBase(day);
                setEditingDay(false);
                setEditingExercises(false);
                setMessage(null);
              }} className={`gc-week-day-card ${active ? "gc-week-day-card-active gc-week-day-card-selected" : ""}`}>
                <span className={`block text-[10px] font-black uppercase ${active ? "text-emerald-200" : "text-neutral-500"}`}>{t(SHORT_DAY[weekday])}</span>
                <span className={`gc-week-day-icon ${day.workoutType === "rest" ? "gc-week-day-icon-rest" : ""}`}><Icon className="h-4 w-4" /></span>
                <span className={`mt-1.5 block truncate text-[11px] font-bold ${day.workoutType === "rest" ? "text-neutral-500" : "text-neutral-200"}`}>{t(translateWorkoutLabel(day.displayName) || (ar ? "تمرين" : "Workout"))}</span>
                {isWeekDay ? <span className="mt-1 block text-[9px] font-semibold text-neutral-600">{dateCaption(day.scheduleDate)}</span> : null}
              </button>
            );
          })}
        </div>

        {selected ? (() => {
          const exercises = view === "week" ? (selectedWeek?.exercises ?? []) : selectedBase.exercises;
          const metrics = getPlannedWorkoutMetrics(exercises);
          const setCount = metrics.totalSets;
          const minutes = metrics.estimatedMinutes;
          return (
            <div className="gc-split-overview-day mt-4">
              <div className="min-w-0 flex-1">
                <p className="gc-eyebrow">{t(view === "week" && selectedWeekday ? LONG_DAY[selectedWeekday] : LONG_DAY[selectedBase.weekday])}</p>
                <h3 className="mt-1 truncate text-xl font-black">{formType === "rest" ? (ar ? "راحة" : "Rest") : formName}</h3>
                <p className="mt-1 text-xs font-semibold text-neutral-500">{formType === "rest" ? (ar ? "يوم راحة" : "Rest day") : `${metrics.exerciseCount} ${ar ? "تمارين" : "exercises"} · ${setCount} ${ar ? "سِتات" : "sets"} · ~${minutes} min`}</p>
              </div>
              {canEdit ? <button type="button" onClick={() => { setEditingDay(true); setEditingExercises(false); }} className="gc-secondary-button shrink-0">{ar ? "عدّل اليوم" : "Edit day"}</button> : null}
            </div>
          );
        })() : null}
      </section>

      {mode === "personal" ? (
        <details className="gc-list-panel group">
          <summary className="gc-list-row min-h-16 list-none [&::-webkit-details-marker]:hidden">
            <span className="gc-workout-option-icon"><WandSparkles className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">{ar ? "أدوات الخطة" : "Plan tools"}</strong>
              <small className="mt-0.5 block text-[11px] font-semibold text-neutral-500">{ar ? "إنشاء · استيراد · تحليل" : "Create · Import · Analyze"}</small>
            </span>
            <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t border-[var(--border)] p-3">
            <SplitSetupChooser onChanged={loadAll} />
            <details className="rounded-xl border border-[var(--border)]">
              <summary className="gc-list-row list-none [&::-webkit-details-marker]:hidden"><Target className="h-4 w-4 text-emerald-400" /><span className="min-w-0 flex-1 font-bold">{ar ? "تحليل الخطة" : "Plan analysis"}</span><ChevronDown className="h-4 w-4 text-neutral-500" /></summary>
              <div className="border-t border-[var(--border)] p-2"><PlanAuditPanel userId={userId} revision={planRevision} /></div>
            </details>
          </div>
        </details>
      ) : null}

      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-300">{error}</p> : null}
      {message ? <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-300">{message}</p> : null}

      {selected && editingDay ? (
        <section className="gc-card overflow-visible">
          <div className="flex items-center gap-3 border-b border-[var(--border)] p-3 sm:px-5">
            <button type="button" onClick={() => { setEditingDay(false); setEditingExercises(false); }} className="gc-icon-button" aria-label={ar ? "ارجع" : "Back"}><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
            <div><p className="gc-eyebrow">{ar ? "تعديل اليوم" : "Edit Day"}</p><strong className="text-sm">{t(view === "week" && selectedWeekday ? LONG_DAY[selectedWeekday] : LONG_DAY[selectedBase.weekday])}</strong></div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="gc-eyebrow">{view === "week" && selectedWeekday ? `${t(LONG_DAY[selectedWeekday])} · ${t(dateCaption(selectedWeek!.scheduleDate))}` : t(LONG_DAY[selectedBase.weekday])}</p>
                <h2 className="mt-1 text-xl font-black">{t(formName || (ar ? "يوم تمرين" : "Training day"))}</h2>
                <p className="mt-1 text-xs font-semibold text-neutral-500">{formType === "rest" ? (ar ? "راحة" : "Rest") : `${view === "week" ? selectedWeek?.exercises.length ?? 0 : selectedBase.exercises.length} ${ar ? "تمارين" : "exercises"}`}</p>
              </div>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${COLOR_TONES[formColor]}`}><SelectedIcon className="h-4 w-4" /></span>
            </div>

            {canEdit ? (
              <div className="mt-5 space-y-4">
                {view === "week" ? (
                  <details className="rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] group">
                    <summary className="flex min-h-11 list-none items-center gap-2 px-3 text-xs font-black [&::-webkit-details-marker]:hidden"><ArrowLeftRight className="h-4 w-4 text-neutral-500" /><span className="min-w-0 flex-1">{ar ? "بدّل اليوم مع يوم تاني" : "Swap with another day"}</span><ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" /></summary>
                    <div className="flex gap-2 border-t border-[var(--border)] p-3">
                      <select value={swapTargetDate} onChange={(event) => setSwapTargetDate(event.target.value as ISODateOnlyString | "")} className="gc-input min-w-0 flex-1 text-sm">
                        <option value="">{ar ? "اختار يوم…" : "Choose a day…"}</option>
                        {orderedWeek.filter((day) => day.scheduleDate !== selectedWeek?.scheduleDate).map((day) => (
                          <option key={day.scheduleDate} value={day.scheduleDate}>{LONG_DAY[getWeekdayFromDate(parseISODateOnly(day.scheduleDate))]} · {translateWorkoutLabel(day.displayName)}</option>
                        ))}
                      </select>
                      <button type="button" disabled={!swapTargetDate || busy} onClick={() => void swapSelectedWeekDay()} className="gc-secondary-button shrink-0 px-3 disabled:opacity-40" aria-label={ar ? "بدّل اليومين" : "Swap days"}><ArrowLeftRight className="h-4 w-4" /></button>
                    </div>
                  </details>
                ) : null}

                {view === "week" ? (
                  <details className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] group">
                    <summary className="gc-list-row min-h-12 list-none [&::-webkit-details-marker]:hidden">
                      <Dumbbell className="h-4 w-4 text-emerald-400" />
                      <span className="min-w-0 flex-1"><strong className="block text-sm">{ar ? "غيّر التمرين" : "Change workout"}</strong><small className="mt-0.5 block text-[11px] font-semibold text-neutral-500">{selectedWeekSource ? titleFor(selectedWeekSource) : (ar ? "اختار من خطتك" : "Choose from your plan")}</small></span>
                      <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="grid gap-2 border-t border-[var(--border)] p-3 sm:grid-cols-2">
                      {orderedDays.filter((day) => day.workoutType !== "rest").map((day) => {
                        const active = weekSourceId === day.id && formType !== "rest";
                        const Icon = ICONS[day.iconKey];
                        return <button key={day.id} type="button" onClick={() => chooseWeekSource(day.id)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-start ${active ? "border-emerald-300/45 bg-emerald-300/[0.1]" : "border-white/[0.08] bg-white/[0.025]"}`}><Icon className="h-4 w-4 text-emerald-200" /><span className="min-w-0"><strong className="block truncate text-sm">{titleFor(day)}</strong><span className="block truncate text-[11px] text-neutral-500">{day.focusLabel ?? (ar ? "مخصص" : "Custom")}</span></span>{active ? <Check className="ms-auto h-4 w-4 text-emerald-200" /> : null}</button>;
                      })}
                      <button type="button" onClick={() => { setView("base"); setEditingDay(true); setEditingExercises(true); }} className="gc-secondary-button sm:col-span-2"><Plus className="h-4 w-4" /> {ar ? "أنشئ تمرين جديد" : "Create new workout"}</button>
                    </div>
                  </details>
                ) : null}

                <fieldset>
                  <legend className="text-[10px] font-bold uppercase tracking-[0.09em] text-neutral-500">{ar ? "خطة اليوم ده" : "Day type"}</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={setAsTrainingDay} className={`min-h-11 rounded-xl border text-sm font-bold ${formType !== "rest" ? "border-emerald-300/50 bg-emerald-300 text-[#11131a]" : "border-white/[0.08] text-neutral-400"}`}>{ar ? "تمرين" : "Training day"}</button>
                    <button type="button" onClick={() => { setFormType("rest"); setFormName("راحة"); setFormFocus("راحة"); setFormIcon("moon"); setFormColor("blue"); }} className={`min-h-11 rounded-xl border text-sm font-bold ${formType === "rest" ? "border-emerald-300/50 bg-emerald-300 text-[#11131a]" : "border-white/[0.08] text-neutral-400"}`}>{view === "week" ? (ar ? "راحة / إجازة" : "Rest / off") : (ar ? "راحة" : "Rest")}</button>
                  </div>
                </fieldset>
                {view === "week" ? <p className="text-[10px] leading-4 text-neutral-600">{ar ? "تغيير اليوم هنا للأسبوع ده بس. لو عندك مشوار أو محتاجة راحة، سجّليها عادي وGain Mode هيحسب الالتزام على الواقع بدل ما يمنعك." : "This change applies only to this week. Mark rest or schedule changes as they actually happen; Gain Mode will use the real adherence."}</p> : null}

                <details className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]">
                  <summary className="gc-list-row min-h-11 list-none text-sm font-bold [&::-webkit-details-marker]:hidden">{ar ? "اسم يوم مخصص" : "Custom day name"}<ChevronDown className="ms-auto h-4 w-4 text-neutral-500" /></summary>
                  <div className="border-t border-[var(--border)] p-3"><input value={formName} onChange={(event) => setFormName(event.target.value)} maxLength={40} placeholder={ar ? "مثال: Upper Strength" : "e.g. Upper Strength"} className="gc-input normal-case" /></div>
                </details>

                <details className="group rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                  <summary className="flex min-h-12 list-none items-center gap-3 px-3.5 text-sm font-bold [&::-webkit-details-marker]:hidden">
                    <MoreVertical className="h-4 w-4 text-neutral-500" />
                    <span className="min-w-0 flex-1">{ar ? "خيارات إضافية" : "More options"}</span>
                    <span className="text-xs font-semibold text-neutral-600">{ar ? "تركيز · شكل · ملاحظات" : "Focus · appearance · notes"}</span>
                    <ChevronDown className="h-4 w-4 text-neutral-600 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-4 border-t border-white/[0.06] p-3.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">{ar ? "تركيز اليوم" : "Day focus"}<input value={formFocus} onChange={(event) => setFormFocus(event.target.value)} maxLength={32} placeholder={ar ? "مثال: صدر وضهر" : "e.g. Chest & back"} className="gc-input mt-1 normal-case" /></label>
                    {view === "base" && formType !== "rest" ? (
                      <fieldset><legend className="text-[10px] font-bold uppercase tracking-[0.09em] text-neutral-500">{ar ? "فلتر مكتبة التمارين" : "Exercise library filter"}</legend><div className="mt-2 flex flex-wrap gap-2">{WORKOUT_FILTERS.map((filter) => <button key={filter.value} type="button" onClick={() => setFormType(filter.value)} className={`rounded-full border px-3 py-2 text-xs font-bold ${formType === filter.value ? "border-emerald-300/45 bg-emerald-300/[0.12] text-emerald-100" : "border-white/[0.08] text-neutral-500"}`}>{t(filter.label)}</button>)}</div></fieldset>
                    ) : null}
                    <fieldset><legend className="text-[10px] font-bold uppercase tracking-[0.09em] text-neutral-500">{ar ? "الأيقونة" : "Icon"}</legend><div className="mt-2 flex flex-wrap gap-2">{ICON_OPTIONS.map(({ key, label }) => { const Icon = ICONS[key]; return <button key={key} type="button" title={t(label)} aria-label={t(label)} onClick={() => setFormIcon(key)} className={`grid h-11 w-11 place-items-center rounded-xl border ${formIcon === key ? "border-emerald-300/50 bg-emerald-300 text-[#11131a]" : "border-white/[0.08] bg-white/[0.025] text-neutral-400"}`}><Icon className="h-4 w-4" /></button>; })}</div></fieldset>
                    <fieldset><legend className="text-[10px] font-bold uppercase tracking-[0.09em] text-neutral-500">{ar ? "اللون" : "Color"}</legend><div className="mt-2 flex gap-2">{COLOR_OPTIONS.map(({ key, className }) => <button key={key} type="button" aria-label={ar ? `لون ${COLOR_LABELS[key]}` : `${t(COLOR_LABELS[key])} color`} onClick={() => setFormColor(key)} className={`relative grid h-10 w-10 place-items-center rounded-full border ${formColor === key ? "border-white/70" : "border-white/[0.08]"}`}><span className={`h-5 w-5 rounded-full ${className}`} />{formColor === key ? <Check className="absolute h-3 w-3 text-[#11131a]" /> : null}</button>)}</div></fieldset>
                    <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500">{ar ? "ملاحظات اليوم" : "Day notes"}<textarea value={formNotes} onChange={(event) => setFormNotes(event.target.value)} maxLength={240} rows={3} placeholder={ar ? "المسكة، سرعة الحركة، شدة التمرين…" : "Grip, tempo, training intensity…"} className="gc-input mt-1 resize-none text-sm normal-case" /></label>
                  </div>
                </details>
                <button type="button" disabled={busy || formName.trim().length < 2 || formFocus.trim().length < 2 || (view === "week" && (!weekSourceId || !hasValidWeekSource))} onClick={() => void saveIdentity()} className="gc-primary-button w-full min-h-12 disabled:opacity-40"><Save className="h-4 w-4" /> {ar ? "احفظ" : "Save"}</button>
              </div>
            ) : null}
          </div>

          {view === "week" ? (
            <div className="border-t border-white/[0.06] p-4 sm:p-5">
              <p className="text-sm leading-6 text-neutral-500">{ar ? "التمارين جاية من" : "Exercises come from"} <strong className="text-neutral-300">{selectedWeek?.sourceDay ? t(titleFor(selectedWeek.sourceDay)) : (ar ? "جدولك الأساسي" : "your repeating plan")}</strong>. {ar ? "عشان تغيّر قائمة التمارين، افتح تبويب الجدول الأساسي." : "To change the exercise list, edit the repeating workout."}</p>
              <button type="button" onClick={() => { setView("base"); if (selectedWeek?.sourceSplitDayId) setSelectedBaseId(selectedWeek.sourceSplitDayId); setEditingDay(true); }} className="gc-secondary-button mt-3">{ar ? "عدّل تمارينه" : "Edit workout exercises"}</button>
            </div>
          ) : selectedBase.workoutType === "rest" ? (
            <div className="border-t border-white/[0.06] p-4 sm:p-5"><div className="rounded-2xl border border-dashed border-white/[0.1] p-5 text-center"><Moon className="mx-auto h-5 w-5 text-sky-200" /><p className="mt-2 font-bold">{ar ? "يوم راحة" : "Rest day"}</p><p className="mt-1 text-sm text-neutral-500">{ar ? "التمارين المحفوظة هتفضل موجودة وترجع لو اليوم بقى تمرين تاني." : "Saved exercises stay attached and return if this becomes a training day again."}</p></div></div>
          ) : editingExercises ? (
            <div className="border-t border-white/[0.06] p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-3">
                <button type="button" onClick={() => setEditingExercises(false)} className="gc-icon-button" aria-label={ar ? "ارجع" : "Back"}><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
                <div className="min-w-0 flex-1"><p className="gc-eyebrow">{formName}</p><h3 className="text-lg font-black">{ar ? "التمارين" : "Exercises"}</h3></div>
                <span className="gc-chip">{selectedBase.exercises.length}</span>
              </div>
              <ul className="space-y-2">{selectedBase.exercises.map((item, index) => <ExerciseEditor key={`${item.id}:${item.targetSets}:${item.targetRepsMin}:${item.targetRepsMax}`} item={item} index={index} count={selectedBase.exercises.length} canEdit={canEdit} alternatives={library.filter((exercise) => exercise.primaryMuscle === item.exercise.primaryMuscle && exercise.id !== item.exerciseId && !selectedBase.exercises.some((saved) => saved.exerciseId === exercise.id))} onReload={loadAll} onError={setError} />)}</ul>
              {selectedBase.exercises.length === 0 ? <p className="rounded-2xl border border-dashed border-white/[0.1] p-5 text-center text-sm text-neutral-500">{ar ? "اليوم ده فاضي. ضيف التمارين اللي بتلعبها فعلًا في الجيم." : "This day is empty. Add the exercises you actually train."}</p> : null}
              {canEdit ? (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2"><select value={selectedExercise} onChange={(event) => setSelectedExercise(event.target.value)} className="gc-input min-w-0 flex-1 text-sm"><option value="">{ar ? "اختار تمرين…" : "Choose an exercise…"}</option>{availableExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{t(translateExerciseName(exercise.name))}</option>)}</select><button type="button" disabled={!selectedExercise || busy} onClick={() => void addExercise()} className="gc-primary-button min-h-12 px-4 disabled:opacity-40"><Plus className="h-4 w-4" /> {ar ? "ضيف" : "Add"}</button></div>
                  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setShowCustomExercise((value) => !value)} className="gc-secondary-button"><Plus className="h-4 w-4" /> {ar ? "تمرين مخصص" : "Custom exercise"}</button><button type="button" disabled={selectedBase.exercises.length === 0 || busy} onClick={() => void clearDay()} className="gc-secondary-button text-red-300 disabled:opacity-40"><Trash2 className="h-4 w-4" /> {ar ? "فضّي اليوم" : "Clear day"}</button></div>
                  {showCustomExercise ? <CustomExerciseForm defaultWorkoutType={selectedBase.workoutType} onCreated={addExercise} onCancel={() => setShowCustomExercise(false)} /> : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="border-t border-white/[0.06] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div><p className="gc-eyebrow">{ar ? "التمرين" : "Workout"}</p><h3 className="mt-1 text-lg font-black">{t(formName)}</h3><p className="mt-1 text-xs font-semibold text-neutral-500">{getPlannedWorkoutMetrics(selectedBase.exercises).exerciseCount} {ar ? "تمارين" : "exercises"} · {getPlannedWorkoutMetrics(selectedBase.exercises).totalSets} {ar ? "سِتات" : "sets"}</p></div>
                <button type="button" onClick={() => setEditingExercises(true)} className="gc-secondary-button">{ar ? "عدّل التمارين" : "Edit exercises"}</button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
