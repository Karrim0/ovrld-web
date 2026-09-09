"use client";

import { useLanguage } from "@/contexts/language-context";

export function LocalizedText({ children }: { children: string }) {
  const { t } = useLanguage();
  return <>{t(children)}</>;
}
