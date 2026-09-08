"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useTheme } from "@/contexts/theme-context";

interface ThemeSwitcherProps {
  variant?: "compact" | "panel" | "row";
  className?: string;
}

export function ThemeSwitcher({ variant = "compact", className = "" }: ThemeSwitcherProps) {
  const { language } = useLanguage();
  const { theme, mounted, setTheme, toggleTheme } = useTheme();
  const isArabic = language === "ar";

  if (variant === "panel") {
    return (
      <section data-no-localize className={`gc-settings-panel ${className}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="gc-settings-icon">
            <SunMoon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold">{isArabic ? "شكل التطبيق" : "App appearance"}</h2>
            <p className="gc-muted mt-1 text-xs leading-5">
              {isArabic
                ? "اختار الوضع المريح لعينك، واختيارك هيفضل محفوظ على الجهاز."
                : "Choose the mode that feels best. Your choice stays saved on this device."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label={isArabic ? "اختار شكل التطبيق" : "Choose app appearance"}>
          <button
            type="button"
            onClick={() => setTheme("light")}
            aria-pressed={mounted && theme === "light"}
            className={`gc-choice-button ${mounted && theme === "light" ? "gc-choice-button-active" : ""}`}
          >
            <Sun className="h-4 w-4" aria-hidden />
            {isArabic ? "فاتح" : "Light"}
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            aria-pressed={mounted && theme === "dark"}
            className={`gc-choice-button ${mounted && theme === "dark" ? "gc-choice-button-active" : ""}`}
          >
            <Moon className="h-4 w-4" aria-hidden />
            {isArabic ? "داكن" : "Dark"}
          </button>
        </div>
      </section>
    );
  }


  if (variant === "row") {
    const dark = mounted && theme === "dark";
    return (
      <button
        data-no-localize
        type="button"
        onClick={toggleTheme}
        className={`gc-list-row w-full text-start ${className}`}
      >
        <SunMoon className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden />
        <span className="min-w-0 flex-1 font-bold">{isArabic ? "شكل التطبيق" : "App appearance"}</span>
        <span className="text-xs font-black text-neutral-500">{isArabic ? dark ? "داكن" : "فاتح" : dark ? "Dark" : "Light"}</span>
      </button>
    );
  }

  const dark = mounted && theme === "dark";
  const label = isArabic
    ? dark ? "حوّل للوضع الفاتح" : "حوّل للوضع الداكن"
    : dark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      data-no-localize
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className={`gc-icon-button ${className}`}
    >
      {!mounted ? <SunMoon className="h-4 w-4" aria-hidden /> : dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  );
}
