"use client";

import { useLanguage } from "@/contexts/language-context";

interface LocalizedTextProps {
  children?: string;
  ar?: string;
  en?: string;
}

export function LocalizedText({ children, ar, en }: LocalizedTextProps) {
  const { language, t } = useLanguage();
  if (ar !== undefined || en !== undefined) {
    return <>{language === "ar" ? (ar ?? children ?? en ?? "") : (en ?? (children ? t(children) : ar ?? ""))}</>;
  }
  return <>{children ? t(children) : null}</>;
}
