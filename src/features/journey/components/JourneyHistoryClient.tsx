"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, Award, CalendarClock, Dumbbell, Pencil, Ruler, Scale, X } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { getArabicErrorMessage, translateExerciseName } from "@/lib/localization";
import type { UUID } from "@/types";
import { updateBodyMeasurement } from "@/features/body-progress/services/body-progress.service";
import { fetchJourneyHistory } from "../services/journey.service";
import type { JourneyEvent, JourneyEventType, JourneyHistorySnapshot } from "../types";

const FILTERS: Array<{ value: "all" | JourneyEventType; ar: string; en: string }> = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "exercise_log", ar: "التمرين", en: "Training" },
  { value: "body_weight", ar: "الوزن", en: "Weight" },
  { value: "body_measurement", ar: "المقاسات", en: "Measurements" },
];

function iconFor(type: JourneyEventType) {
  if (type === "exercise_log") return Dumbbell;
  if (type === "body_weight") return Scale;
  if (type === "body_measurement") return Ruler;
  return Award;
}

function eventClass(type: JourneyEventType) {
  if (type === "body_weight") return "gc-history-event-weight";
  if (type === "body_measurement") return "gc-history-event-measurement";
  if (type === "personal_record") return "gc-history-event-pr";
  return "gc-history-event-training";
}

function formatWhen(value: string, ar: boolean) {
  return new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function JourneyHistoryClient({ userId }: { userId: UUID }) {
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const [snapshot, setSnapshot] = useState<JourneyHistorySnapshot | null>(null);
  const [filter, setFilter] = useState<"all" | JourneyEventType>("all");
  const [selected, setSelected] = useState<JourneyEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setSnapshot(await fetchJourneyHistory(userId)); }
    catch (caught) { setError(getArabicErrorMessage(caught, ar ? "معرفناش نحمّل تاريخ الرحلة." : "Could not load journey history.")); }
  }

  useEffect(() => {
    let active = true;
    void fetchJourneyHistory(userId)
      .then((next) => {
        if (active) setSnapshot(next);
      })
      .catch((caught) => {
        if (active) setError(getArabicErrorMessage(caught, ar ? "معرفناش نحمّل تاريخ الرحلة." : "Could not load journey history."));
      });
    return () => { active = false; };
  }, [ar, userId]);
  const events = useMemo(() => snapshot?.events.filter((event) => filter === "all" || event.type === filter) ?? [], [filter, snapshot]);

  async function saveBody(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || (selected.type !== "body_weight" && selected.type !== "body_measurement")) return;
    const data = new FormData(event.currentTarget);
    const number = (key: string) => {
      if (!data.has(key)) {
        const existing = selected.metadata[key];
        return typeof existing === "number" ? existing : null;
      }
      const raw = String(data.get(key) ?? "").trim();
      return raw ? Number(raw) : null;
    };
    setSaving(true); setError(null);
    try {
      await updateBodyMeasurement(selected.sourceId, {
        weightKg: number("weightKg"), bodyFatPercentage: number("bodyFatPercentage"), waistCm: number("waistCm"), chestCm: number("chestCm"), hipsCm: number("hipsCm"), thighCm: number("thighCm"), upperArmCm: number("upperArmCm"), calfCm: number("calfCm"), neckCm: number("neckCm"),
      });
      setSelected(null); await load();
    } catch (caught) { setError(getArabicErrorMessage(caught, ar ? "معرفناش نعدّل القراءة." : "Could not update this entry.")); }
    finally { setSaving(false); }
  }

  if (!snapshot && !error) return <div className="space-y-3 pt-4"><div className="h-28 animate-pulse rounded-[20px] bg-white/[0.03]" /><div className="h-72 animate-pulse rounded-[20px] bg-white/[0.025]" /></div>;

  return (
    <div className="space-y-4 pb-24 pt-4">
      {error ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p> : null}
      {snapshot ? (
        <section className="gc-card p-4 sm:p-5">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300"><Activity className="h-5 w-5" /></span><div><p className="gc-eyebrow">{ar ? "رحلتك" : "Your journey"}</p><h2 className="text-xl font-black">{snapshot.firstEventAt ? (ar ? `متابعة من ${new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(snapshot.firstEventAt))}` : `Tracking since ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(snapshot.firstEventAt))}`) : (ar ? "لسه هنبدأ أول سجل" : "Your first entry starts the journey")}</h2></div></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="gc-stat"><strong>{snapshot.workoutCount}</strong><span>{ar ? "تمرين" : "workouts"}</span></div><div className="gc-stat"><strong>{snapshot.weightEntryCount}</strong><span>{ar ? "وزن" : "weigh-ins"}</span></div><div className="gc-stat"><strong>{snapshot.measurementEntryCount}</strong><span>{ar ? "مقاسات" : "measurements"}</span></div></div>
        </section>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">{FILTERS.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`gc-history-filter ${filter === item.value ? "gc-history-filter-active" : ""}`}>{ar ? item.ar : item.en}</button>)}</div>

      <section className="space-y-2">
        {events.length === 0 ? <div className="gc-empty-state"><CalendarClock className="h-6 w-6 text-neutral-500" /><h2 className="mt-2 font-black">{ar ? "مفيش أحداث هنا لسه" : "No events here yet"}</h2></div> : events.map((event) => {
          const Icon = iconFor(event.type);
          return <button key={event.id} type="button" onClick={() => setSelected(event)} className={`gc-history-event ${eventClass(event.type)}`}><span className="gc-history-event-icon"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1 text-start"><strong className="block truncate">{event.type === "exercise_log" || event.type === "personal_record" ? t(translateExerciseName(event.title)) : event.title}</strong><span className="mt-0.5 block text-xs font-semibold text-neutral-500">{event.summary}</span></span><span className="text-end text-[10px] font-semibold text-neutral-600">{formatWhen(event.occurredAt, ar)}</span></button>;
        })}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 p-3 sm:items-center sm:justify-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="gc-eyebrow">{formatWhen(selected.occurredAt, ar)}</p><h2 className="mt-1 truncate text-xl font-black">{selected.type === "exercise_log" || selected.type === "personal_record" ? t(translateExerciseName(selected.title)) : selected.title}</h2><p className="mt-1 text-sm font-semibold text-neutral-400">{selected.summary}</p></div><button type="button" onClick={() => setSelected(null)} className="gc-icon-button"><X className="h-4 w-4" /></button></div>

            {selected.type === "exercise_log" && selected.sessionId ? <div className="mt-4 grid grid-cols-2 gap-2"><Link href={`/workout/${selected.sessionId}`} className="gc-secondary-button">{ar ? "التفاصيل" : "Details"}</Link><Link href={`/workout/quick?session=${selected.sessionId}&edit=1`} className="gc-primary-button"><Pencil className="h-4 w-4" /> {ar ? "تعديل الأرقام" : "Edit numbers"}</Link></div> : null}

            {(selected.type === "body_weight" || selected.type === "body_measurement") ? <form onSubmit={saveBody} className="mt-4 space-y-3"><div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-neutral-500">{ar ? "الوزن كجم" : "Weight kg"}<input name="weightKg" type="number" step="any" defaultValue={selected.metadata.weightKg ?? ""} className="gc-input mt-1" /></label>{selected.type === "body_measurement" ? <><label className="text-xs font-bold text-neutral-500">{ar ? "الوسط سم" : "Waist cm"}<input name="waistCm" type="number" step="any" defaultValue={selected.metadata.waistCm ?? ""} className="gc-input mt-1" /></label><label className="text-xs font-bold text-neutral-500">{ar ? "الصدر سم" : "Chest cm"}<input name="chestCm" type="number" step="any" defaultValue={selected.metadata.chestCm ?? ""} className="gc-input mt-1" /></label><label className="text-xs font-bold text-neutral-500">{ar ? "الأرداف سم" : "Hips cm"}<input name="hipsCm" type="number" step="any" defaultValue={selected.metadata.hipsCm ?? ""} className="gc-input mt-1" /></label><label className="text-xs font-bold text-neutral-500">{ar ? "الفخذ سم" : "Thigh cm"}<input name="thighCm" type="number" step="any" defaultValue={selected.metadata.thighCm ?? ""} className="gc-input mt-1" /></label><label className="text-xs font-bold text-neutral-500">{ar ? "الذراع سم" : "Arm cm"}<input name="upperArmCm" type="number" step="any" defaultValue={selected.metadata.upperArmCm ?? ""} className="gc-input mt-1" /></label><label className="text-xs font-bold text-neutral-500">{ar ? "السمانة سم" : "Calf cm"}<input name="calfCm" type="number" step="any" defaultValue={selected.metadata.calfCm ?? ""} className="gc-input mt-1" /></label></> : null}</div><button type="submit" disabled={saving} className="gc-primary-button w-full disabled:opacity-50"><Pencil className="h-4 w-4" /> {saving ? (ar ? "بنحفظ…" : "Saving…") : (ar ? "احفظ التعديل" : "Save changes")}</button></form> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
