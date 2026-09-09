# OVRLD Finalization Pass 6 — Onboarding & Progressive Profile

Pass 6 keeps onboarding lightweight while making the profile progressively more useful. It deliberately reuses the existing OVRLD data model instead of introducing a parallel onboarding/profile store.

## Canonical onboarding

The only rendered new-user flow is `/onboarding`:

1. Welcome
2. Basic Info — age, height, current weight
3. Goal
4. Training Setup — level, weekly availability, ready plan or own split
5. Ready — setup summary and Home CTA

`/body-goal` remains only as a legacy redirect to `/onboarding`. Crew creation/join paths return to the same onboarding route.

The ready-plan chooser and the normal Split setup screen both consume `src/features/splits/constants/starter-plans.ts`. The 4-day `gain_glutes_4` plan is recommended when the selected goal is Gain-compatible and the availability is four days, but it is never auto-selected or forced. General onboarding does not activate Gain Mode or choose Gain equation inputs.

## Data sources of truth

Pass 6 writes mandatory onboarding data into existing sources wherever they already exist:

- current weight → `body_measurements`
- height + goal → `user_body_goals`
- selected/own split → existing split RPC/service path
- age + training level + weekly availability → `profiles`

The three profile fields are the only new general persisted fields because they previously had no non-Gain source. `profiles.age_years` is now the canonical general-profile age. The existing required `gain_mode_profiles.age_years` column is retained as a compatibility mirror. Two guarded database triggers keep the values synchronized in either direction so Web, Mobile, and existing Gain writes cannot drift.

Migration: `202609100001_onboarding_progressive_profile_v1.sql`.

## Profile completeness engine

The completeness percentage is never stored. `calculateProfileCompleteness` computes it from current source data:

- age/basic info
- current, non-stale weight
- height
- goal
- training level
- weekly availability
- active split with real exercises
- baseline body measurements
- nutrition target only while Gain Mode is active

This makes the denominator contextual. A user who is not using Gain Mode cannot lose completeness for missing calorie/protein targets.

Weight freshness follows the user's existing weigh-in cadence, bounded to a practical 1–30 day interval with a 14-day fallback.

## Progressive profiling

Profile shows one contextual missing action at a time instead of popups. Actions deep-link to the exact source UI:

- age → `/profile/settings#profile-age`
- height → `/profile/settings#profile-height`
- goal → `/profile/settings#profile-goal`
- training level → `/profile/settings#profile-training-level`
- weekly availability → `/profile/settings#profile-weekly-availability`
- weight → `/progress/body#weight`
- body measurements → `/progress/body#measurements`
- training setup → `/split/personal`
- active Gain nutrition targets → `/progress/gain/nutrition#nutrition-targets`

The nutrition target section opens automatically when reached by its hash, so the CTA does not land on a generic page or a collapsed target.

## Verification

`npm run check` now includes `verify:pass6` after the complete Phase 1–14 and Finalization Pass 2–5.1 chain. Pass 6 verification parses the changed TypeScript and executes the pure completeness engine to verify contextual denominator behavior, stale-weight handling, direct next actions, shared starter-plan metadata, migration shape, and the single onboarding route architecture.

Legacy verifiers were updated only where they depended on deleted UI strings or a former component layout; their feature contracts remain intact.
