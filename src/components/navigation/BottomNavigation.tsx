"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAVIGATION_ITEMS } from "@/constants/navigation";
import { useVirtualKeyboard } from "@/hooks/use-virtual-keyboard";

export function BottomNavigation() {
  const pathname = usePathname();
  const keyboardOpen = useVirtualKeyboard();

  if (pathname.startsWith("/workout/active") || keyboardOpen) return null;

  return (
    <nav className="gc-bottom-nav gc-navigation-surface fixed z-50 mx-auto max-w-lg rounded-[20px] p-1.5 md:hidden" aria-label="التنقل الرئيسي">
      <div className="grid grid-cols-5 gap-1">
        {MAIN_NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.activePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) && !(item.id === "workout" && pathname.startsWith("/workout/history"));
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`gc-bottom-nav-item ${active ? "gc-bottom-nav-active" : ""}`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
