"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyDocumentLanguage,
  localizeDom,
  localizeRuntimeText,
  readStoredLanguage,
  type AppLanguage,
} from "@/lib/localization/runtime";

interface LanguageContextValue {
  language: AppLanguage;
  direction: "rtl" | "ltr";
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  t: (value: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

type LocalizationRuntimeProfile = {
  callbacks: number;
  records: number;
  lastDurationMs: number;
  maxDurationMs: number;
};

type ProfiledWindow = Window & {
  __OVRLD_LOCALIZATION_PROFILE__?: LocalizationRuntimeProfile;
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("ar");
  const languageRef = useRef<AppLanguage>("ar");

  useEffect(() => {
    const stored = readStoredLanguage();
    languageRef.current = stored;
    if (stored !== "ar") queueMicrotask(() => setLanguageState(stored));
  }, []);

  useEffect(() => {
    languageRef.current = language;
    applyDocumentLanguage(language);
    localizeDom(document.documentElement, language);

    const observer = new MutationObserver((records) => {
      const shouldProfile = process.env.NODE_ENV === "development";
      const startedAt = shouldProfile ? performance.now() : 0;
      for (const record of records) {
        if (record.type === "characterData") {
          localizeDom(record.target, languageRef.current);
          continue;
        }
        if (record.type === "attributes") {
          localizeDom(record.target, languageRef.current);
          continue;
        }
        for (const node of record.addedNodes) localizeDom(node, languageRef.current);
      }

      // Instrument the current runtime approach before changing it. In dev,
      // inspect window.__OVRLD_LOCALIZATION_PROFILE__ during Gym Mode to see
      // whether mutation-driven localization is actually a hot path.
      if (shouldProfile) {
        const profiledWindow = window as ProfiledWindow;
        const durationMs = performance.now() - startedAt;
        const previous = profiledWindow.__OVRLD_LOCALIZATION_PROFILE__ ?? { callbacks: 0, records: 0, lastDurationMs: 0, maxDurationMs: 0 };
        profiledWindow.__OVRLD_LOCALIZATION_PROFILE__ = {
          callbacks: previous.callbacks + 1,
          records: previous.records + records.length,
          lastDurationMs: durationMs,
          maxDurationMs: Math.max(previous.maxDurationMs, durationMs),
        };
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["aria-label", "title", "placeholder", "alt", "value"],
      characterData: true,
      childList: true,
      subtree: true,
    });

    const nativeConfirm = window.confirm.bind(window);
    const nativeAlert = window.alert.bind(window);
    const nativePrompt = window.prompt.bind(window);

    window.confirm = (message?: string) => nativeConfirm(localizeRuntimeText(String(message ?? ""), languageRef.current));
    window.alert = (message?: unknown) => nativeAlert(localizeRuntimeText(String(message ?? ""), languageRef.current));
    window.prompt = (message?: string, defaultValue?: string) => nativePrompt(
      localizeRuntimeText(String(message ?? ""), languageRef.current),
      defaultValue,
    );

    requestAnimationFrame(() => {
      document.documentElement.removeAttribute("data-gc-i18n-pending");
      document.documentElement.dataset.gcI18nReady = "true";
    });

    return () => {
      observer.disconnect();
      window.confirm = nativeConfirm;
      window.alert = nativeAlert;
      window.prompt = nativePrompt;
    };
  }, [language]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    languageRef.current = nextLanguage;
    setLanguageState(nextLanguage);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(languageRef.current === "ar" ? "en" : "ar");
  }, [setLanguage]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    direction: language === "ar" ? "rtl" : "ltr",
    setLanguage,
    toggleLanguage,
    t: (text) => localizeRuntimeText(text, language),
  }), [language, setLanguage, toggleLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider.");
  return context;
}
