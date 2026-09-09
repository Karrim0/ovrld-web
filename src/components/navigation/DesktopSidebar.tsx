"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAVIGATION_ITEMS } from "@/constants/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { useLanguage } from "@/contexts/language-context";

export function DesktopSidebar() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const ar = language === "ar";

  if ((pathname.startsWith("/workout/active") || pathname.startsWith("/workout/quick"))) return null;

  return (
    <aside className="gc-desktop-sidebar gc-navigation-surface fixed inset-y-0 z-40 hidden w-[16.5rem] flex-col p-4 md:flex">
      <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-2 py-2">
        <span className="gc-brand-mark grid h-10 w-10 place-items-center rounded-xl"><BrandMark className="h-6 w-6" /></span>
        <span data-no-localize className="gc-muted min-w-0 truncate text-[11px] font-black tracking-[0.14em]">TRAIN · LOG · PROGRESS</span>
      </Link>

      <nav className="mt-7 flex flex-col gap-1.5" aria-label={ar ? "التنقل الرئيسي" : "Main navigation"}>
        {MAIN_NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.activePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
            && !(item.id === "workout" && pathname.startsWith("/workout/history"));
          return (
            <Link key={item.id} href={item.href} aria-current={active ? "page" : undefined} className={`gc-side-nav-item ${active ? "gc-side-nav-item-active" : ""}`}>
              <Icon className="h-5 w-5" aria-hidden /> <span className="truncate">{ar ? item.labelAr : item.labelEn}</span>
            </Link>
          );
        })}
      </nav>

      <div className="gc-sidebar-tip mt-auto p-4">
        <p className="text-sm font-semibold">{ar ? "النهارده أولاً" : "Today first"}</p>
        <p className="gc-muted mt-1 text-xs leading-5">{ar ? "تمرّن، سجّل، وسيب الأرقام تقولك إنت ماشي إزاي." : "Train, log, and let the numbers show where you are headed."}</p>
      </div>
    </aside>
  );
}
