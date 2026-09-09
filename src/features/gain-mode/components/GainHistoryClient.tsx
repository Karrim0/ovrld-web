"use client";

import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Flame, History, Ruler, Scale } from "lucide-react";
import type { UUID } from "@/types";
import { fetchGainHistory, type GainHistoryEvent, type GainHistoryEventType } from "../services/history.service";

type Filter = "all" | GainHistoryEventType;

function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

function iconFor(type: GainHistoryEventType) {
  if (type === "nutrition") return Flame;
  if (type === "weight") return Scale;
  if (type === "measurements") return Ruler;
  return Dumbbell;
}

function toneFor(type: GainHistoryEventType) {
  if (type === "nutrition") return "amber";
  if (type === "weight") return "sky";
  if (type === "measurements") return "emerald";
  return "indigo";
}

export function GainHistoryClient({ userId }: { userId: UUID }) {
  const [events, setEvents] = useState<GainHistoryEvent[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchGainHistory(userId, 90)
      .then((snapshot) => { if (active) setEvents(snapshot.events); })
      .catch(() => { if (active) setError("معرفناش نحمّل سجل الرحلة دلوقتي."); });
    return () => { active = false; };
  }, [userId]);

  const visible = useMemo(() => (events ?? []).filter((event) => filter === "all" || event.type === filter), [events, filter]);
  const grouped = useMemo(() => {
    const map = new Map<string, GainHistoryEvent[]>();
    for (const event of visible) map.set(event.date, [...(map.get(event.date) ?? []), event]);
    return [...map.entries()];
  }, [visible]);

  if (!events && !error) return <div className="mt-4 h-64 animate-pulse rounded-[20px] bg-[var(--surface-elevated)]" />;

  return (
    <div className="space-y-3 pb-24 pt-3">
      <section className="gc-history-hero">
        <div className="flex items-center gap-3"><span className="gc-history-icon"><History className="h-5 w-5" /></span><div><p className="gc-eyebrow">آخر 90 يوم</p><h2 className="mt-0.5 text-lg font-black">سجل الرحلة</h2></div></div>
        <p className="mt-2 text-xs leading-5 text-neutral-500">كل تسجيل مهم في مكان واحد: أكل، وزن، قياسات وتمرين.</p>
      </section>

      <div className="gc-history-filters">
        {([['all','الكل'],['nutrition','الأكل'],['weight','الوزن'],['measurements','القياسات'],['workout','التمرين']] as Array<[Filter,string]>).map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={filter === value ? "gc-history-filter-active" : ""}>{label}</button>)}
      </div>

      {error ? <p className="gc-inline-error">{error}</p> : null}
      {!error && grouped.length === 0 ? <section className="gc-card p-6 text-center"><History className="mx-auto h-6 w-6 text-neutral-500" /><h3 className="mt-2 text-base font-black">لسه مفيش تسجيلات هنا</h3><p className="mt-1 text-xs text-neutral-500">لما تسجّل أكل أو وزن أو تمرين هتظهر الرحلة بالتاريخ.</p></section> : null}

      {grouped.map(([date, dateEvents]) => (
        <section key={date} className="gc-history-day">
          <div className="gc-history-day-title">{formatDate(date)}</div>
          <div className="gc-history-day-events">
            {dateEvents.map((event) => {
              const Icon = iconFor(event.type);
              return (
                <article key={event.id} className="gc-history-event">
                  <span className={`gc-history-event-icon gc-history-event-${toneFor(event.type)}`}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><strong className="block text-xs">{event.title}</strong><span className="mt-0.5 block text-[10px] text-neutral-500">{event.secondary}</span>{event.meta.length ? <span className="mt-1 block text-[9px] leading-4 text-neutral-600">{event.meta.join(" · ")}</span> : null}</div>
                  <strong className="max-w-[42%] text-end text-xs tabular-nums">{event.primary}</strong>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
