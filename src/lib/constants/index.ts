/**
 * Low-level, infrastructure-facing constants used inside `src/lib`.
 *
 * These are distinct from `src/constants`, which holds domain/business
 * constants (the weekly split, rest-day rules, navigation labels) that
 * features and UI code reference directly. Nothing here should be
 * business-meaningful on its own — if a value would make sense to a
 * product manager, it belongs in `src/constants` instead.
 */

/**
 * Kept on the legacy IndexedDB name intentionally. Renaming a Dexie database
 * creates a new empty database, so this stable physical name protects existing
 * offline workouts during the Gym Crew -> OVRLD product rename.
 */
export const OFFLINE_DATABASE_NAME = "gym-crew";

/** How often the app attempts to drain the sync queue while online. */
export const SYNC_INTERVAL_MS = 30_000;

export const SERVICE_WORKER_URL = "/sw.js";
