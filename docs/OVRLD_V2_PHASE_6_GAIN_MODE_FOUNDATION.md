# OVRLD V2 — Phase 6: Gain Mode Foundation

## Product decision

OVRLD remains a general gym tracker. Phase 6 does **not** turn the whole product into a weight-gain app.

Instead, OVRLD introduces one optional Goal Mode that is intentionally deep before any other goal is added:

**Gain Mode — healthy weight-gain support for adult women.**

A user who does not choose Gain Mode keeps the standard OVRLD experience: plan, Gym Mode, workout logging and training progress.

## What changed

### 1. Onboarding is now explicit

The old onboarding treated having a personal workspace/group membership as if onboarding had finished. A newly-created solo workspace could therefore skip the body-goal screen.

Phase 6 adds `profiles.onboarding_completed_at`. New users are not considered onboarded until they explicitly choose:

- Standard OVRLD
- Gain Mode

Existing users are marked complete when the migration lands so the migration does not throw established users back into onboarding.

### 2. Gain Mode baseline

When Gain Mode is selected, V1 captures only information that changes the experience:

- current body weight
- height
- age (V1 is 18+)
- optional target weight
- general activity level
- appetite level
- whether large meals are difficult / early fullness is common
- dietary pattern
- weigh-in cadence

The baseline is stored in the existing body-progress tables plus the new one-to-one `gain_mode_profiles` table.

### 3. Gain Mode is a journey, not a hidden setting

Gain Mode has its own route at `/progress/gain` with:

- start → current → target weight journey
- current process review
- simple nutrition strategy based on appetite/activity
- an approximate protein reference
- explicit connection back to Gym Mode and strength progress
- settings collapsed below the journey

The Home process card becomes Gain-aware when the mode is active. If it is inactive, the existing deterministic Smart Process Loop remains unchanged.

The Gain review deliberately waits for enough signal before suggesting a food adjustment: V1 requires at least three recent measurements spanning roughly two weeks, and estimates the recent trend from the last ~21 days. This keeps one noisy weigh-in from changing the plan. The displayed journey also keeps the true first body-weight measurement even after the chart window grows beyond 24 recent readings.

### 4. Progress is clearer

`Progress` is split into two visible surfaces:

- Training
- Body & weight

A fresh account no longer opens a wall of zero-valued training statistics. It gets an actionable empty state first.

The Body & weight page no longer advertises six half-built body goals. The only deep goal currently available is Gain Mode. Generic users may still record body weight as optional tracking data.

### 5. Home and Plan cleanup

Home priority is now:

1. What do I need to do today?
2. What is the most important process action?
3. What does my week look like?

The weekly plan is compact on Home. Plan analysis and cosmetic day settings are secondary/collapsible in the Plan editor.

### 6. Mobile-first cleanup

Language and theme controls are hidden from the compact header on mobile/tablet and remain available on larger layouts/settings surfaces. New Phase 6 surfaces are included in the existing Arabic/English runtime localization bridge. The primary mobile navigation remains:

`Home — My Plan — Workout — Progress — Account`

Crew remains a secondary Account/social feature.

## Database migration

New migration:

`202609080003_gain_mode_v1.sql`

It adds:

- `profiles.onboarding_completed_at`
- `gain_mode_profiles`
- row-level security limiting each user to their own Gain Mode profile
- updated-at trigger

Do not push this migration blindly. First run:

```bash
npx supabase migration list
npx supabase db push --dry-run
```

The expected pending migration for this phase is only:

`202609080003_gain_mode_v1.sql`

## Scope deliberately NOT included yet

Phase 6 is the foundation, not the final nutrition engine. It intentionally does not add:

- full calorie/food logging
- meal-plan prescriptions
- automatic clinical recommendations
- menstrual-cycle-based workout algorithms
- AI-generated health advice
- extra Goal Modes such as weight loss/recomposition

Those should not be added until Gain Mode's core loop has been tested with real users.

## Verification notes

The cumulative Phase 1→6 structural contracts pass, including the Phase 6 migration/route/product checks. A repository-wide TypeScript parser/import-resolution pass also covers 293 `ts/tsx` source files with no parse errors, unresolved internal imports, or duplicate object-literal keys.

A full `tsc`/Next production build still has to be run in a complete local dependency install. The isolated build environment used for packaging could not finish `npm ci`; its generated `node_modules/@types/*` directories were incomplete, so that environment cannot provide a meaningful `tsc --noEmit` result.
