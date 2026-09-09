import { AR_TO_EN } from "./ar-en-map";
import { LANGUAGE_COOKIE_KEY, STORAGE_KEYS, readCompatibleStorage } from "@/config/storage";

export type AppLanguage = "ar" | "en";

export const LANGUAGE_STORAGE_KEY = STORAGE_KEYS.language;

const ARABIC_RE = /[\u0600-\u06ff]/u;
const ATTRIBUTES = ["aria-label", "title", "placeholder", "alt"] as const;
const SKIP_TEXT_SELECTOR = "script, style, code, pre, textarea, [data-no-localize], [contenteditable='true']";
const SKIP_ATTRIBUTE_SELECTOR = "script, style, code, pre, [data-no-localize], [contenteditable='true']";

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
    .replace(/(\d+(?:\.\d+)?)\s*سم\b/gu, "$1 cm")
    .replace(/^أهلاً،\s*(.+)$/u, "Hi, $1")
    .replace(/^([+-]?\d+(?:\.\d+)?)\s+من البداية$/u, "$1 from the start")
    .replace(/^كل\s+(\d+)\s+يوم$/u, "Every $1 days")
    .replace(/^بعد\s+(\d+)\s+يوم$/u, "in $1 days")
    .replace(/^(وسط|أرداف|صدر|فخذ)\s+(\d+(?:\.\d+)?)\s*cm$/u, (_, area, value) => `${({ وسط: "Waist", أرداف: "Hips", صدر: "Chest", فخذ: "Thigh" } as Record<string, string>)[area] ?? area} ${value} cm`)
    .replace(/^([+-]?\d+(?:\.\d+)?)\s*kg\s*من آخر قراءة$/u, "$1 kg since last reading")
    .replace(/^([+-]?\d+(?:\.\d+)?)\s*kg\/أسبوع$/u, "$1 kg/week")
    .replace(/^(\d+)\s+تمارين\s+·\s+(\d+)\s+سِت$/u, "$1 exercises · $2 sets")
    .replace(/^(\d+)\s+دقيقة$/u, "$1 min")
    .replace(/^(\d+(?:,\d{3})*(?:\.\d+)?)\s*kg\s+volume$/u, "$1 kg volume")
    .replace(/(\d+(?:\.\d+)?)\s*g\s*بروتين/gu, "$1g protein")
    .replace(/(\d+(?:\.\d+)?)%\s*توافق/gu, "$1% fit")
    .replace(/(\d+)\s*تسجيلات?/gu, "$1 logs")
    .replace(/(\d+)\s*قراءات?/gu, "$1 readings")
    .replace(/بعد\s+(\d+)\s+أيام?/gu, "in $1 days")
    .replace(/(\d+)\s+مناطق أساسية حجمها قليل نسبيًا\./gu, "$1 core areas have relatively low volume.")
    .replace(/تغطية الخطة\s+(\d+)\/10\s+مناطق\s+·\s+(\d+)\s+أيام تمرين\./gu, "Plan coverage: $1/10 areas · $2 training days.")
    .replace(/الـlower body حوالي\s+(\d+)%\s+من الحمل المحسوب\s+·\s+(\d+)\s+أيام تمرين\./gu, "Lower body is about $1% of calculated volume · $2 training days.")
    .replace(/باقي\s+(\d+)\s*kcal\s+·\s+(\d+(?:\.\d+)?)g\s+بروتين/gu, "$1 kcal · $2g protein left")
    .replace(/باقي\s+(\d+)\s*kcal/gu, "$1 kcal left")
    .replace(/(\d+)\s*عدة/gu, "$1 reps")
    .replace(/(\d+)\s*سِتات?/gu, "$1 sets")
    .replace(/(\d+)\s*تمارين?/gu, "$1 exercises")
    .replace(/(\d+)\s*ث(?:انية)?\b/gu, "$1s")
    .replace(/(\d+)\s*د\b/gu, "$1m")
    .replace(/فاضلك\s+(\d+)\s+تمرين(?:ة|ات)\s+على\s+الخطة/gu, "$1 workouts left on plan")
    .replace(/ابدأ بوزن مريح وخلّي هدفك (\d+)[–-](\d+) عدة بفورم نضيف\./gu, "Start with a comfortable weight and aim for $1–$2 clean reps.")
    .replace(/آخر مرة كانت (\d+) عدات\. ثبّت الوزن وحاول توصل (\d+) بفورم نضيف قبل الزيادة\./gu, "Last time was $1 reps. Hold the weight and reach $2 clean reps before increasing.")
    .replace(/نفس الوزن · هدف (\d+) عدات لو الفورم لسه نضيف\./gu, "Same weight · aim for $1 reps if form stays clean.")
    .replace(/وصلت سقف العدات\. جرّب (\d+(?:\.\d+)?) كجم × (\d+) لو آخر سِت كانت مستقرة\./gu, "You hit the rep ceiling. Try $1 kg × $2 if the last set was stable.")
    .replace(/هدف صغير:\s+نفس الوزن وحاول\s+(\d+)\s+عدة لو الفورم لسه نضيف\./gu, "Small target: keep the weight and try $1 reps if form stays clean.")
    .replace(/وصلت سقف العدات\. لو السِت كانت مريحة، جرّب \+(\d+(?:\.\d+)?) كجم وابدأ من (\d+) عدات\./gu, "You hit the top of the rep range. If the set felt comfortable, try +$1 kg and restart at $2 reps.")
    .replace(/مؤشر القوة التقديري أعلى بحوالي\s+(\d+(?:\.\d+)?)%\s+مقارنة بالفترة اللي قبلها\./gu, "Estimated strength is up about $1% versus the previous period.")
    .replace(/مؤشر القوة أعلى بحوالي\s+(\d+(?:\.\d+)?)%/gu, "Strength estimate is up about $1%")
    .replace(/الوزن طالع\s+(\d+(?:\.\d+)?)\s*كجم/gu, "Weight is up $1 kg")
    .replace(/الوزن نازل\s+(\d+(?:\.\d+)?)\s*كجم/gu, "Weight is down $1 kg")
    .replace(/الوزن اتحرك\s+(\d+(?:\.\d+)?)\s*كجم/gu, "Weight changed by $1 kg")
    .replace(/المؤشر التقديري نازل حوالي\s+(\d+(?:\.\d+)?)%\.\s*راقب أكتر من تمرينة قبل أي قرار كبير\./gu, "Estimated strength is down about $1%. Watch more than one session before making a major change.")
    .replace(/التمرين\s+(\d+)\s+من\s+(\d+)/gu, "Exercise $1 of $2")
    .replace(/السِت\s+(\d+)/gu, "Set $1")
    .replace(/آخر\s+سِت\s+(\d+)/gu, "Last set $1")
    .replace(/فاضل\s+(\d+)\s+يوم قبل ما نحكم على تعديل السعرات الأخير\./gu, "$1 days left before judging the last calorie adjustment.")
    .replace(/مسجل\s+(\d+)\s+من\s+7\s+أيام\. محتاجين\s+5\s+أيام على الأقل عشان القرار يبقى له معنى\./gu, "$1 of 7 days logged. We need at least 5 days for a useful decision.")
    .replace(/اتطبق الهدف الجديد:\s*(\d+)\s*kcal/gu, "New target applied: $1 kcal")
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceKnownPhraseSafely(value: string, source: string, target: string): string {
  if (!value.includes(source)) return value;

  const startsWithWord = /^[\p{L}\p{N}]/u.test(source);
  const endsWithWord = /[\p{L}\p{N}]$/u.test(source);
  const leftBoundary = startsWithWord ? "(?<![\\p{L}\\p{N}])" : "";
  const rightBoundary = endsWithWord ? "(?![\\p{L}\\p{N}])" : "";
  const pattern = new RegExp(`${leftBoundary}${escapeRegExp(source)}${rightBoundary}`, "gu");
  return value.replace(pattern, target);
}

function replaceKnownPhrases(value: string, language: AppLanguage): string {
  const phrases = language === "en" ? ARABIC_PHRASES : ENGLISH_PHRASES;
  let output = value;

  for (const [source, target] of phrases) {
    output = replaceKnownPhraseSafely(output, source, target);
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

function shouldSkipText(element: Element | null): boolean {
  return Boolean(element?.closest(SKIP_TEXT_SELECTOR));
}

function shouldSkipAttributes(element: Element | null): boolean {
  return Boolean(element?.closest(SKIP_ATTRIBUTE_SELECTOR));
}

function localizeTextNode(node: Text, language: AppLanguage): void {
  const parent = node.parentElement;
  if (!parent || shouldSkipText(parent)) return;

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
  if (shouldSkipAttributes(element)) return;
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
