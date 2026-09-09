"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Plus, Ruler, Scale, Utensils, X } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export function HomeLogDataAction({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const ar = language === "ar";

  const items = [
    {
      href: "/progress/gain/nutrition",
      icon: Utensils,
      title: ar ? "الأكل" : "Food",
      detail: ar ? "سجّل وجبة أو يومك الغذائي" : "Log a meal or your nutrition",
    },
    {
      href: "/progress/body#weight",
      icon: Scale,
      title: ar ? "الوزن" : "Weight",
      detail: ar ? "أضف قراءة وزن سريعة" : "Add a quick weigh-in",
    },
    {
      href: "/progress/body#measurements",
      icon: Ruler,
      title: ar ? "القياسات" : "Measurements",
      detail: ar ? "حدّث قياسات الجسم" : "Update body measurements",
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact ? "gc-home-quick-data group w-full text-start" : "gc-home-log-cta group w-full text-start"}
        aria-haspopup="dialog"
      >
        <span className={compact ? "gc-home-quick-data-icon" : "gc-home-log-icon"}>
          {compact ? <Plus className="h-4 w-4" /> : <Scale className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          {compact ? (
            <>
              <strong className="block text-sm font-black">{ar ? "إضافة سريعة" : "Quick add"}</strong>
              <span className="mt-0.5 block text-xs font-semibold text-neutral-500">{ar ? "أكل · وزن · قياسات" : "Food · Weight · Measurements"}</span>
            </>
          ) : (
            <>
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
                {ar ? "سجّل بيانات" : "Log Data"}
              </span>
              <strong className="mt-0.5 block text-lg font-black tracking-[-0.025em]">
                {ar ? "أكل · وزن · قياسات" : "Food · Weight · Measurements"}
              </strong>
              <span className="mt-1 block text-xs font-semibold text-neutral-500">
                {ar ? "كل تسجيلاتك السريعة في مكان واحد" : "Your quick logs in one place"}
              </span>
            </>
          )}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
      </button>

      {open ? (
        <div
          className="gc-modal-backdrop fixed inset-0 z-[90] flex items-end p-2 pb-[max(.5rem,env(safe-area-inset-bottom,0px))] sm:items-center sm:justify-center"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <section className="gc-home-log-sheet w-full max-w-md" role="dialog" aria-modal="true" aria-label={ar ? "سجّل بيانات" : "Log data"}>
            <div className="gc-workout-options-handle" />
            <div className="flex items-start justify-between gap-3 px-4 pt-2 sm:px-5">
              <div>
                <p className="gc-eyebrow">{ar ? "إضافة سريعة" : "Quick add"}</p>
                <h2 className="mt-1 text-xl font-black">{ar ? "إيه اللي عايز تسجله؟" : "What do you want to log?"}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="gc-icon-button" aria-label={ar ? "اقفل" : "Close"}><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2 p-4 sm:p-5">
              {items.map(({ href, icon: Icon, title, detail }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className="gc-home-log-option">
                  <span className="gc-home-log-option-icon"><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><small className="mt-0.5 block text-xs font-semibold text-neutral-500">{detail}</small></span>
                  <ChevronRight className="h-4 w-4 text-neutral-500 rtl:rotate-180" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
