import { AR_TO_EN } from "./ar-en-map";
import { LANGUAGE_COOKIE_KEY, STORAGE_KEYS, readCompatibleStorage } from "@/config/storage";

export type AppLanguage = "ar" | "en";

export const LANGUAGE_STORAGE_KEY = STORAGE_KEYS.language;

const ARABIC_RE = /[\u0600-\u06ff]/u;
const ATTRIBUTES = ["aria-label", "title", "placeholder", "alt"] as const;
const SKIP_SELECTOR = "script, style, code, pre, textarea, [data-no-localize], [contenteditable='true']";

const ARABIC_DIGITS: Readonly<Record<string, string>> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const MONTHS_AR_TO_EN: Readonly<Record<string, string>> = {
  يناير: "Jan",
  فبراير: "Feb",
  مارس: "Mar",
  أبريل: "Apr",
  ابريل: "Apr",
  مايو: "May",
  يونيو: "Jun",
  يوليو: "Jul",
  أغسطس: "Aug",
  اغسطس: "Aug",
  سبتمبر: "Sep",
  أكتوبر: "Oct",
  اكتوبر: "Oct",
  نوفمبر: "Nov",
  ديسمبر: "Dec",
};

const EN_TO_AR = Object.entries(AR_TO_EN).reduce<Record<string, string>>((result, [arabic, english]) => {
  if (!result[english]) result[english] = arabic;
  return result;
}, {});

const ARABIC_PHRASES = Object.entries(AR_TO_EN)
  .filter(([arabic]) => !arabic.includes("${") && arabic.length >= 4)
  .sort(([left], [right]) => right.length - left.length);

const ENGLISH_PHRASES = Object.entries(EN_TO_AR)
  .filter(([english]) => !english.includes("${") && english.length >= 4)
  .sort(([left], [right]) => right.length - left.length);

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function preserveWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/u)?.[0] ?? "";
  const trailing = source.match(/\s*$/u)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function latinDigits(value: string): string {
  return value.replace(/[٠-٩]/gu, (digit) => ARABIC_DIGITS[digit] ?? digit);
}

function translateArabicDynamic(value: string): string {
  let output = latinDigits(value);

  output = output
    .replace(/^(\d+)\s*سِتات?$/u, "$1 sets")
    .replace(/^(\d+)\s*عدات?$/u, "$1 reps")
    .replace(/^(\d+)\s*تمارين?$/u, "$1 exercises")
    .replace(/^(\d+)\s*أيام?$/u, "$1 days")
    .replace(/^(\d+)\s*دقيقة(?:\s|$)/gu, "$1 min ")
    .replace(/^(\d+)\s*دقايق(?:\s|$)/gu, "$1 min ")
    .replace(/(\d+(?:\.\d+)?)\s*كجم/gu, "$1 kg")
    .replace(/(\d+)\s*عدة/gu, "$1 reps")
    .replace(/(\d+)\s*سِتات?/gu, "$1 sets")
    .replace(/(\d+)\s*تمارين?/gu, "$1 exercises")
    .replace(/(\d+)\s*ث(?:انية)?\b/gu, "$1s")
    .replace(/(\d+)\s*د\b/gu, "$1m")
    .replace(/فاضلك\s+(\d+)\s+تمرين(?:ة|ات)\s+على\s+الخطة/gu, "$1 workouts left on plan")
    .replace(/هدف صغير:\s+نفس الوزن وحاول\s+(\d+)\s+عدة لو الفورم لسه نضيف\./gu, "Small target: keep the weight and try $1 reps if form stays clean.")
    .replace(/وصلت سقف العدات\. لو السِت كانت مريحة، جرّب \+(\d+(?:\.\d+)?) كجم وابدأ من (\d+) عدات\./gu, "You hit the top of the rep range. If the set felt comfortable, try +$1 kg and restart at $2 reps.")
    .replace(/مؤشر القوة أعلى بحوالي\s+(\d+(?:\.\d+)?)%/gu, "Strength estimate is up about $1%")
    .replace(/التمرين\s+(\d+)\s+من\s+(\d+)/gu, "Exercise $1 of $2")
    .replace(/السِت\s+(\d+)/gu, "Set $1")
    .replace(/آخر\s+سِت\s+(\d+)/gu, "Last set $1")
    .replace(/آخر مرة\s+/gu, "Last ")
    .replace(/منذ أقل من دقيقة/gu, "less than a minute ago")
    .replace(/منذ دقيقة واحدة/gu, "1 minute ago")
    .replace(/منذ دقيقتين/gu, "2 minutes ago")
    .replace(/منذ (\d+) دقائق/gu, "$1 minutes ago")
    .replace(/منذ ساعة واحدة/gu, "1 hour ago")
    .replace(/منذ ساعتين/gu, "2 hours ago")
    .replace(/منذ (\d+) ساعات/gu, "$1 hours ago")
    .replace(/أمس/gu, "yesterday")
    .replace(/اليوم/gu, "today")
    .replace(/غدًا|غدا/gu, "tomorrow");

  for (const [month, english] of Object.entries(MONTHS_AR_TO_EN)) {
    output = output.replaceAll(month, english);
  }

  return output;
}

function translateEnglishDynamic(value: string): string {
  return value
    .replace(/^(\d+)\s+sets?$/giu, "$1 سِتات")
    .replace(/^(\d+)\s+reps?$/giu, "$1 عدات")
    .replace(/^(\d+)\s+exercises?$/giu, "$1 تمارين")
    .replace(/^(\d+)\s+days?$/giu, "$1 أيام")
    .replace(/(\d+(?:\.\d+)?)\s*kg\b/giu, "$1 كجم")
    .replace(/Exercise\s+(\d+)\s+of\s+(\d+)/giu, "التمرين $1 من $2")
    .replace(/Last set\s+(\d+)/giu, "آخر سِت $1")
    .replace(/Set\s+(\d+)/giu, "السِت $1");
}

function replaceKnownPhrases(value: string, language: AppLanguage): string {
  const phrases = language === "en" ? ARABIC_PHRASES : ENGLISH_PHRASES;
  let output = value;

  for (const [source, target] of phrases) {
    if (output.includes(source)) output = output.replaceAll(source, target);
  }

  return output;
}

export function localizeRuntimeText(value: string, language: AppLanguage): string {
  if (!value) return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  const normalizedEnglish = trimmed.replaceAll("’", "'");
  const exact = language === "en"
    ? AR_TO_EN[trimmed]
    : EN_TO_AR[trimmed] ?? EN_TO_AR[normalizedEnglish];
  if (exact) return preserveWhitespace(value, exact);

  if (language === "en" && !ARABIC_RE.test(trimmed)) return value;
  if (language === "ar" && ARABIC_RE.test(trimmed)) return value;

  let translated = language === "en"
    ? translateArabicDynamic(trimmed)
    : translateEnglishDynamic(trimmed);

  translated = replaceKnownPhrases(translated, language);
  return preserveWhitespace(value, translated);
}

function shouldSkip(element: Element | null): boolean {
  return Boolean(element?.closest(SKIP_SELECTOR));
}

function localizeTextNode(node: Text, language: AppLanguage): void {
  const parent = node.parentElement;
  if (!parent || shouldSkip(parent)) return;

  const current = node.data;
  let source = originalText.get(node);

  if (source === undefined) {
    source = current;
    originalText.set(node, source);
  } else {
    const currentForArabic = localizeRuntimeText(source, "ar");
    const currentForEnglish = localizeRuntimeText(source, "en");
    if (current !== currentForArabic && current !== currentForEnglish) {
      source = current;
      originalText.set(node, source);
    }
  }

  const next = localizeRuntimeText(source, language);
  if (current !== next) node.data = next;
}

function localizeAttribute(element: Element, attribute: string, language: AppLanguage): void {
  if (shouldSkip(element)) return;
  const current = element.getAttribute(attribute);
  if (!current) return;

  let originals = originalAttributes.get(element);
  if (!originals) {
    originals = new Map<string, string>();
    originalAttributes.set(element, originals);
  }

  let source = originals.get(attribute);
  if (source === undefined) {
    source = current;
    originals.set(attribute, source);
  } else {
    const currentForArabic = localizeRuntimeText(source, "ar");
    const currentForEnglish = localizeRuntimeText(source, "en");
    if (current !== currentForArabic && current !== currentForEnglish) {
      source = current;
      originals.set(attribute, source);
    }
  }

  const next = localizeRuntimeText(source, language);
  if (current !== next) element.setAttribute(attribute, next);
}

function localizeElement(element: Element, language: AppLanguage): void {
  for (const attribute of ATTRIBUTES) localizeAttribute(element, attribute, language);

  if (element instanceof HTMLInputElement && ["button", "submit", "reset"].includes(element.type)) {
    localizeAttribute(element, "value", language);
  }
}

export function localizeDom(root: Node, language: AppLanguage): void {
  if (root.nodeType === Node.TEXT_NODE) {
    localizeTextNode(root as Text, language);
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) localizeElement(root as Element, language);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) localizeTextNode(current as Text, language);
    else localizeElement(current as Element, language);
    current = walker.nextNode();
  }
}

export function readStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") return "ar";
  const stored = readCompatibleStorage(LANGUAGE_STORAGE_KEY, STORAGE_KEYS.legacyLanguage);
  return stored === "en" ? "en" : "ar";
}

export function applyDocumentLanguage(language: AppLanguage): void {
  const root = document.documentElement;
  root.lang = language === "ar" ? "ar-EG" : "en";
  root.dir = language === "ar" ? "rtl" : "ltr";
  root.dataset.gcLanguage = language;
  document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}
