"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface LanguageSwitcherProps {
  variant?: "compact" | "panel" | "row";
  className?: string;
}

export function LanguageSwitcher({ variant = "compact", className = "" }: LanguageSwitcherProps) {
  const { language, setLanguage, toggleLanguage } = useLanguage();

  if (variant === "panel") {
    return (
      <section data-no-localize className={`gc-settings-panel ${className}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="gc-settings-icon">
            <Languages className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold">{language === "ar" ? "لغة التطبيق" : "App language"}</h2>
            <p className="gc-muted mt-1 text-xs leading-5">
              {language === "ar" ? "غيّر اللغة من غير ما بيانات تمرينك تتأثر." : "Switch language without changing your workout data."}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label={language === "ar" ? "اختار لغة التطبيق" : "Choose app language"}>
          <button
            type="button"
            onClick={() => setLanguage("ar")}
            aria-pressed={language === "ar"}
            className={`gc-choice-button ${language === "ar" ? "gc-choice-button-active" : ""}`}
          >
            العربية
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            aria-pressed={language === "en"}
            className={`gc-choice-button ${language === "en" ? "gc-choice-button-active" : ""}`}
          >
            English
          </button>
        </div>
      </section>
    );
  }


  if (variant === "row") {
    return (
      <button
        data-no-localize
        type="button"
        onClick={toggleLanguage}
        className={`gc-list-row w-full text-start ${className}`}
      >
        <Languages className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
        <span className="min-w-0 flex-1 font-bold">{language === "ar" ? "لغة التطبيق" : "App language"}</span>
        <span className="text-xs font-black text-neutral-500">{language === "ar" ? "العربية" : "English"}</span>
      </button>
    );
  }

  const label = language === "ar" ? "Switch to English" : "حوّل للعربي";
  return (
    <button
      data-no-localize
      type="button"
      onClick={toggleLanguage}
      title={label}
      aria-label={label}
      className={`gc-icon-button gap-1.5 px-2.5 ${className}`}
    >
      <Languages className="h-4 w-4" aria-hidden />
      <span dir="ltr" className="text-[11px] font-black">{language === "ar" ? "EN" : "ع"}</span>
    </button>
  );
}
