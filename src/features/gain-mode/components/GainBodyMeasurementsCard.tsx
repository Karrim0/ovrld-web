import Link from "next/link";
import { ArrowUpLeft, Ruler } from "lucide-react";
import type { BodyProgressSnapshot } from "@/features/body-progress/types";

function cm(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} سم`;
}

function daysUntil(value: string | null) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

export function GainBodyMeasurementsCard({ body }: { body: BodyProgressSnapshot }) {
  const latest = body.latestCircumference;
  const dueInDays = daysUntil(body.nextBodyMeasurementAt);
  const due = !latest || (dueInDays !== null && dueInDays <= 0);
  const latestValue = (key: "waistCm" | "hipsCm" | "thighCm") => body.measurements.find((measurement) => measurement[key] != null)?.[key] ?? null;

  return (
    <section className="gc-gain-measurements-card">
      <div className="flex items-center gap-3">
        <span className="gc-measurements-icon"><Ruler className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="gc-eyebrow">تطور الجسم</p>
          <h3 className="mt-0.5 text-sm font-black">القياسات</h3>
        </div>
        <span className={`gc-day-status ${due ? "gc-day-status-due" : ""}`}>{!latest ? "ابدئي" : due ? "مستحق" : dueInDays === null ? "كل 4 أسابيع" : `بعد ${dueInDays} يوم`}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 divide-x divide-x-reverse divide-[var(--border)] rounded-xl bg-[var(--surface-overlay)]">
        <div className="px-2 py-2.5 text-center"><span className="block text-[10px] font-bold text-neutral-500">الوسط</span><strong className="mt-1 block text-sm tabular-nums">{cm(latestValue("waistCm"))}</strong></div>
        <div className="px-2 py-2.5 text-center"><span className="block text-[10px] font-bold text-neutral-500">الأرداف</span><strong className="mt-1 block text-sm tabular-nums">{cm(latestValue("hipsCm"))}</strong></div>
        <div className="px-2 py-2.5 text-center"><span className="block text-[10px] font-bold text-neutral-500">الفخذ</span><strong className="mt-1 block text-sm tabular-nums">{cm(latestValue("thighCm"))}</strong></div>
      </div>

      <Link href="/progress/body#measurements" className="gc-review-action mt-3">
        {latest ? "شوفي القياسات" : "سجّلي أول قياسات"}<ArrowUpLeft className="h-4 w-4" />
      </Link>
    </section>
  );
}
