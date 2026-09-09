/**
 * Stable client-side storage contract for the OVRLD web app.
 *
 * The first public web builds used the `gym-crew:` prefix. We now write to
 * `ovrld:` while continuing to read and migrate legacy values so existing
 * users keep their preferences, timers, active workout helpers, and cached
 * settings after the product rename.
 */
export const CURRENT_STORAGE_PREFIX = "ovrld:";
export const LEGACY_STORAGE_PREFIX = "gym-crew:";

export const STORAGE_KEYS = {
  language: `${CURRENT_STORAGE_PREFIX}language`,
  legacyLanguage: `${LEGACY_STORAGE_PREFIX}language`,
  theme: `${CURRENT_STORAGE_PREFIX}theme`,
  legacyTheme: `${LEGACY_STORAGE_PREFIX}theme`,
  installDismissed: `${CURRENT_STORAGE_PREFIX}install-dismissed`,
  legacyInstallDismissed: "gym-crew-install-dismissed",
  restTimerPrefix: `${CURRENT_STORAGE_PREFIX}rest-timer`,
  legacyRestTimerPrefix: `${LEGACY_STORAGE_PREFIX}rest-timer`,
  stopwatchPrefix: `${CURRENT_STORAGE_PREFIX}stopwatch`,
  legacyStopwatchPrefix: `${LEGACY_STORAGE_PREFIX}stopwatch`,
  weightStepPrefix: `${CURRENT_STORAGE_PREFIX}weight-step`,
  setHaptics: `${CURRENT_STORAGE_PREFIX}set-haptics`,
  restHaptics: `${CURRENT_STORAGE_PREFIX}rest-haptics`,
  restSound: `${CURRENT_STORAGE_PREFIX}rest-sound`,
  legacyWeightStepPrefix: `${LEGACY_STORAGE_PREFIX}weight-step`,
  legacySetHaptics: `${LEGACY_STORAGE_PREFIX}set-haptics`,
  legacyRestHaptics: `${LEGACY_STORAGE_PREFIX}rest-haptics`,
  legacyRestSound: `${LEGACY_STORAGE_PREFIX}rest-sound`,
  syncQueueChangedEvent: `${CURRENT_STORAGE_PREFIX}sync-queue-changed`,
  legacySyncQueueChangedEvent: `${LEGACY_STORAGE_PREFIX}sync-queue-changed`,
} as const;

export const LANGUAGE_COOKIE_KEY = "ovrld_language";
export const LEGACY_LANGUAGE_COOKIE_KEY = "gym_crew_language";

export function readCompatibleStorage(
  currentKey: string,
  legacyKey?: string,
): string | null {
  if (typeof window === "undefined") return null;

  const current = window.localStorage.getItem(currentKey);
  if (current !== null || !legacyKey) return current;

  const legacy = window.localStorage.getItem(legacyKey);
  if (legacy !== null) {
    window.localStorage.setItem(currentKey, legacy);
  }
  return legacy;
}

export function migrateLegacyClientStorage(): void {
  if (typeof window === "undefined") return;

  const copies: Array<[string, string]> = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(LEGACY_STORAGE_PREFIX)) continue;

    const nextKey = `${CURRENT_STORAGE_PREFIX}${key.slice(LEGACY_STORAGE_PREFIX.length)}`;
    if (window.localStorage.getItem(nextKey) !== null) continue;

    const value = window.localStorage.getItem(key);
    if (value !== null) copies.push([nextKey, value]);
  }

  for (const [key, value] of copies) {
    window.localStorage.setItem(key, value);
  }

  if (!document.cookie.includes(`${LANGUAGE_COOKIE_KEY}=`)) {
    const legacyCookie = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${LEGACY_LANGUAGE_COOKIE_KEY}=`));
    const value = legacyCookie?.split("=")[1];
    if (value === "ar" || value === "en") {
      document.cookie = `${LANGUAGE_COOKIE_KEY}=${value}; path=/; max-age=31536000; samesite=lax`;
    }
  }
}

export function clearOvrldClientStorage(): void {
  if (typeof window === "undefined") return;

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (
      key?.startsWith(CURRENT_STORAGE_PREFIX) ||
      key?.startsWith(LEGACY_STORAGE_PREFIX)
    ) {
      window.localStorage.removeItem(key);
    }
  }
}
