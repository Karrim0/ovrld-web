# OVRLD Web Phase 1 — Backend Alignment and Safe Rename

## Purpose

This phase aligns the web repository with the Supabase migration chain and generated database types already used by OVRLD Mobile, then starts the Gym Crew to OVRLD rename without losing existing browser data.

## Backend alignment

- The web repository now contains the same 15 active Supabase migrations used by the mobile app.
- Remote schema baselines, recovery snapshots, seed data, and database regression tests are included for reproducibility.
- `src/lib/supabase/types.ts` is aligned with the mobile database contract.
- A checksum-based verifier prevents silent migration drift.

## Safe rename rules

The visible product name is now OVRLD.

New browser settings are written under the `ovrld:` prefix. Existing values under `gym-crew:` are copied forward when first read, including:

- language;
- theme;
- PWA dismissal;
- rest timers;
- workout stopwatch values;
- per-exercise weight steps.

The physical IndexedDB database name remains `gym-crew` during this phase. Dexie treats a renamed database as a different empty database, so keeping the original physical name protects cached plans, active workouts, sets, profiles, and pending sync mutations. This internal name is not user-facing.

The service worker uses new OVRLD cache names and cleans stale caches from both namespaces.

## Production database safety

Do not run `supabase db push` blindly against the production project.

Before any database write:

1. Link the same Supabase project used by OVRLD Mobile.
2. Run `npx supabase migration list`.
3. Confirm the remote migration timestamps match the committed active chain.
4. Run the committed SQL tests against a disposable or local database first.

The Phase 1 patch synchronizes repository artifacts; it does not require a new production migration when the mobile backend is already current.

## Verification

```bash
npm run verify:phase1
npm run typecheck
npm run lint
npm run build
```

On Windows:

```bat
VERIFY_OVRLD_WEB_PHASE1.cmd
```
