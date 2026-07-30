# Gym Crew v1.3.2 — Workout Mobile Layout Hotfix

## Fixed

- Prevented the Reps input and Complete Set button from overflowing on narrow mobile screens.
- Made Weight and Reps columns use shrink-safe `minmax(0, 1fr)` grid tracks.
- Added explicit minimum-width protection to the active workout card and numeric inputs.
- Shortened mobile field labels to `Weight` and `Reps` for faster scanning in the gym.
- Added tabular numeric rendering for stable weight and reps alignment.
- Made last-workout dates independent of the phone locale, using a stable format such as `15 Jul 2026`.

## Database

No Supabase migration is required.

## Verification

- TypeScript: passed
- ESLint: passed
- Production build: passed
