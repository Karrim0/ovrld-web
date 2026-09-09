"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileCheck2, FileSpreadsheet, ImagePlus, Loader2, PencilLine, Sparkles, Trash2, X } from "lucide-react";
import type { ImportedPlan } from "../types";
import { applyImportedSplit } from "../services/split.service";

interface SplitImportWizardProps {
  onClose: () => void;
  onImported: () => Promise<void> | void;
}

const DAY_LABELS: Record<ImportedPlan["days"][number]["weekday"], string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

export function SplitImportWizard({ onClose, onImported }: SplitImportWizardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<ImportedPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  const lowConfidenceCount = useMemo(
    () => plan?.days.flatMap((day) => day.exercises).filter((exercise) => (exercise.confidence ?? 1) < 0.75).length ?? 0,
    [plan],
  );

  async function readPlan() {
    if (!file && text.trim().length < 4) {
      setError("ارفع ملف أو الصق نص الجدول الأول.");
      return;
    }
    setBusy(true);
    setError(null);
    setProcessingMessage(null);
    try {
      const body = new FormData();
      if (file) body.append("file", file);
      if (text.trim()) body.append("text", text.trim());
      const response = await fetch("/api/split/import", { method: "POST", body });
      const payload = await response.json().catch(() => null) as { plan?: ImportedPlan; error?: string; message?: string; processing?: "local" | "ai" } | null;
      if (!response.ok || !payload?.plan) throw new Error(payload?.error ?? "معرفناش نقرا الجدول ده.");
      setPlan(payload.plan);
      setProcessingMessage(payload.message ?? (payload.processing === "local" ? "اتقرا محليًا — من غير تكلفة AI." : null));
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نقرا الجدول ده."));
    } finally {
      setBusy(false);
    }
  }

  function updateDay(dayIndex: number, patch: Partial<ImportedPlan["days"][number]>) {
    setPlan((current) => current ? {
      ...current,
      days: current.days.map((day, index) => index === dayIndex ? { ...day, ...patch } : day),
    } : current);
  }

  function updateExercise(dayIndex: number, exerciseIndex: number, patch: Partial<ImportedPlan["days"][number]["exercises"][number]>) {
    setPlan((current) => current ? {
      ...current,
      days: current.days.map((day, index) => index === dayIndex ? {
        ...day,
        exercises: day.exercises.map((exercise, itemIndex) => itemIndex === exerciseIndex ? { ...exercise, ...patch } : exercise),
      } : day),
    } : current);
  }

  function removeExercise(dayIndex: number, exerciseIndex: number) {
    setPlan((current) => current ? {
      ...current,
      days: current.days.map((day, index) => index === dayIndex ? {
        ...day,
        exercises: day.exercises.filter((_, itemIndex) => itemIndex !== exerciseIndex),
      } : day),
    } : current);
  }

  function hasThreeConsecutiveRestDays(currentPlan: ImportedPlan) {
    const rest = currentPlan.days.map((day) => day.workoutType === "rest");
    return rest.some((_, index) => rest[index] && rest[(index + 1) % 7] && rest[(index + 2) % 7]);
  }

  async function confirmImport() {
    if (!plan) return;
    if (hasThreeConsecutiveRestDays(plan)) {
      setError("حرّك يوم راحة. مينفعش يبقى فيه أكتر من يومين راحة ورا بعض.");
      return;
    }
    const invalidDay = plan.days.find((day) => day.title.trim().length < 2 || day.focus.trim().length < 2);
    if (invalidDay) {
      setError("كل يوم محتاج اسم وتركيز من حرفين على الأقل.");
      return;
    }
    const invalidExercise = plan.days.flatMap((day) => day.exercises).find((exercise) => exercise.name.trim().length < 2 || exercise.sets < 1 || exercise.repsMin < 1 || exercise.repsMax < exercise.repsMin);
    if (invalidExercise) {
      setError("راجع أسماء التمارين والسِتات ونطاق العدات قبل الإدخال.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await applyImportedSplit(plan);
      setSaved(true);
      await onImported();
    } catch (caught) {
      setError(getArabicErrorMessage(caught, "معرفناش نحفظ الجدول اللي دخلته."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gc-modal-backdrop fixed inset-0 z-[90] overflow-y-auto p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="دخّل جدولك الجاهز">
      <section className="gc-modal-card mx-auto min-h-full w-full max-w-3xl rounded-[24px] sm:rounded-[28px]">
        <header className="gc-modal-header sticky top-0 z-10 flex min-w-0 items-center justify-between gap-3 rounded-t-[24px] px-4 py-4 sm:rounded-t-[28px] sm:px-6">
          <div>
            <p className="gc-eyebrow">إدخال الجدول الذكي</p>
            <h2 className="mt-1 text-xl font-bold">حوّل ملفك لجدول تمرين</h2>
          </div>
          <button type="button" onClick={onClose} className="gc-icon-button rounded-full" aria-label="قفل"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          {!plan && !saved ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => inputRef.current?.click()} className="rounded-2xl border border-dashed border-emerald-300/30 bg-emerald-300/[0.06] p-5 text-start transition hover:bg-emerald-300/[0.1]">
                  <ImagePlus className="h-6 w-6 text-emerald-200" />
                  <strong className="mt-3 block">صورة أو PDF أو ملف جداول</strong>
                  <span className="mt-1 block text-sm leading-5 text-neutral-500">Excel وCSV والنص المنسوخ بيتقروا مجانًا. الصور وPDF بيستخدموا AI اختياري.</span>
                </button>
                <label className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-200" />
                  <strong className="mt-3 block">أو الصق الجدول</strong>
                  <textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} placeholder="السبت أبر: بنش بريس 3×8–12…" className="gc-input mt-3 resize-none text-sm" />
                </label>
              </div>
              <input ref={inputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv,.xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              {file ? (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3.5">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{file.name}</p><p className="text-xs text-neutral-500">{Math.max(1, Math.round(file.size / 1024))} KB</p></div>
                  <button type="button" onClick={() => setFile(null)} className="text-xs font-bold text-neutral-400">شيل</button>
                </div>
              ) : null}
              <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.045] p-4 text-sm leading-6 text-neutral-400">
                <div className="flex items-start gap-3">
                  <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <p><strong className="text-neutral-200">المجاني الأول.</strong> ملفات Excel وCSV والنص المنسوخ بيتقروا محليًا من غير رصيد API. الصور وPDF بيستخدموا قراءة ذكية اختيارية، والملف المرفوع مش بيتحفظ.</p>
                </div>
              </div>
              <button type="button" disabled={busy || (!file && text.trim().length < 4)} onClick={() => void readPlan()} className="gc-primary-button w-full min-h-12 disabled:opacity-40">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : file && /\.(xlsx|csv|txt)$/i.test(file.name) ? <FileSpreadsheet className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />} اقرأ جدولي
              </button>
            </>
          ) : null}

          {plan && !saved ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="gc-eyebrow">راجع قبل الحفظ</p><h3 className="mt-1 text-2xl font-bold">{plan.title}</h3><p className="mt-1 text-sm text-neutral-500">عدّل أي حاجة اتقرت غلط.</p>{processingMessage ? <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1 text-xs font-bold text-emerald-200"><FileCheck2 className="h-3.5 w-3.5" /> {processingMessage}</p> : null}</div>
                <button type="button" onClick={() => { setPlan(null); setProcessingMessage(null); }} className="gc-secondary-button"><PencilLine className="h-4 w-4" /> اختار ملف تاني</button>
              </div>

              {plan.warnings.length > 0 || lowConfidenceCount > 0 ? (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100">
                  <div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> راجع الحاجات دي</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/75">
                    {plan.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                    {lowConfidenceCount > 0 ? <li>{lowConfidenceCount} اسم تمرين{lowConfidenceCount === 1 ? "" : "s"} محتاجين مراجعة كويسة.</li> : null}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-3">
                {plan.days.map((day, dayIndex) => (
                  <article key={day.weekday} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <div className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr]">
                      <div><span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">اليوم</span><p className="mt-2 font-bold">{DAY_LABELS[day.weekday]}</p></div>
                      <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">الاسم<input value={day.title} onChange={(event) => updateDay(dayIndex, { title: event.target.value })} className="gc-input mt-1 text-sm normal-case" maxLength={40} /></label>
                      <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">التركيز<input value={day.focus} onChange={(event) => updateDay(dayIndex, { focus: event.target.value })} className="gc-input mt-1 text-sm normal-case" maxLength={32} /></label>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => updateDay(dayIndex, { workoutType: day.workoutType === "rest" ? "custom" : day.workoutType, iconKey: day.iconKey === "moon" ? "dumbbell" : day.iconKey, title: day.title === "راحة" ? "يوم تمرين" : day.title, focus: day.focus === "راحة" ? "مخصص" : day.focus })} className={`min-h-10 rounded-xl border text-xs font-bold ${day.workoutType !== "rest" ? "border-emerald-300/45 bg-emerald-300 text-[#11131a]" : "border-white/[0.08] text-neutral-500"}`}>تمرين</button>
                      <button type="button" onClick={() => updateDay(dayIndex, { workoutType: "rest", title: "راحة", focus: "راحة", iconKey: "moon", colorKey: "blue", exercises: [] })} className={`min-h-10 rounded-xl border text-xs font-bold ${day.workoutType === "rest" ? "border-emerald-300/45 bg-emerald-300 text-[#11131a]" : "border-white/[0.08] text-neutral-500"}`}>راحة</button>
                    </div>
                    {day.workoutType === "rest" ? <p className="mt-3 text-sm text-neutral-500">يوم راحة متخططلها. مش هنضيف تمارين لليوم ده.</p> : (
                      <div className="mt-3 space-y-2">
                        {day.exercises.map((exercise, exerciseIndex) => (
                          <div key={`${exercise.name}-${exerciseIndex}`} className={`gc-import-exercise-row grid grid-cols-2 items-end gap-2 rounded-xl border p-2.5 sm:grid-cols-[minmax(0,1fr)_4rem_4rem_4rem_2.5rem] ${Number(exercise.confidence ?? 1) < 0.75 ? "border-amber-300/25 bg-amber-300/[0.04]" : "border-white/[0.06] bg-black/10"}`}>
                            <label className="col-span-2 min-w-0 text-[9px] font-bold uppercase tracking-wide text-neutral-600 sm:col-span-1">التمرين<input value={exercise.name} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { name: event.target.value })} className="gc-input mt-1 min-w-0 text-sm normal-case" /></label>
                            <label className="min-w-0 text-[9px] font-bold uppercase tracking-wide text-neutral-600">السِتات<input type="number" inputMode="numeric" min={1} max={20} value={exercise.sets} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { sets: Math.max(1, Number(event.target.value) || 1) })} className="gc-input mt-1 min-w-0 px-2 text-center" /></label>
                            <label className="min-w-0 text-[9px] font-bold uppercase tracking-wide text-neutral-600">أقل<input type="number" inputMode="numeric" min={1} max={100} value={exercise.repsMin} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { repsMin: Math.max(1, Number(event.target.value) || 1) })} className="gc-input mt-1 min-w-0 px-2 text-center" /></label>
                            <label className="min-w-0 text-[9px] font-bold uppercase tracking-wide text-neutral-600">أعلى<input type="number" inputMode="numeric" min={1} max={100} value={exercise.repsMax} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { repsMax: Math.max(1, Number(event.target.value) || 1) })} className="gc-input mt-1 min-w-0 px-2 text-center" /></label>
                            <button type="button" onClick={() => removeExercise(dayIndex, exerciseIndex)} className="min-h-10 rounded-xl border border-red-300/15 text-xs font-bold text-red-300 sm:col-span-1 sm:grid sm:h-10 sm:min-h-0 sm:w-10 sm:place-items-center" aria-label={`شيل ${exercise.name}`}><Trash2 className="mx-auto h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
              <button type="button" disabled={busy} onClick={() => void confirmImport()} className="gc-primary-button w-full min-h-12">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} اعمل الجدول ده
              </button>
            </>
          ) : null}

          {saved ? (
            <div className="py-12 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-300/12 text-emerald-300"><CheckCircle2 className="h-8 w-8" /></span>
              <h3 className="mt-4 text-2xl font-bold">جدولك جاهز</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">الجدول اللي دخلته تقدر تعدّله زي أي جدول على OVRLD.</p>
              <button type="button" onClick={onClose} className="gc-primary-button mt-6">راجع جدولي</button>
            </div>
          ) : null}

          {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-semibold text-red-300">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
