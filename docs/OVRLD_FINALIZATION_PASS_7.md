# OVRLD Finalization Pass 7 — Journey & Historical Intelligence

Pass 7 keeps raw workout/body data in the existing sources of truth and adds a unified journey view over them.

## Delivered
- Canonical `profiles.sex` with Gain equation-sex synchronization.
- Mandatory sex selection in onboarding and editable training profile.
- Male/female-aware body measurement silhouette defaults.
- Unified `/progress/history` timeline for exercise performance, body weight, body measurements, and PR events.
- Event details use original timestamps; body entries can be edited in place and exercise events open the canonical completed workout for editing.
- Quick Log now pre-fills previous performance directly, saves per exercise, shows partial/full completion, warns on large unexplained performance drops, and reopens completed days as Edit.
- A one-time manual legacy reset SQL is provided under `supabase/manual/`; it is intentionally not an automatic migration.

## Source-of-truth rule
No activity/event table was added. The timeline is a projection over `workout_sessions`/`workout_sets`, `body_measurements`, and `personal_records`.
