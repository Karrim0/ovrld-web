# OVRLD v2 — Phase 3: Mobile Experience

This phase tightens the product around the agreed core loop: **plan → train → log → see progress**.

## What changed

### 1. Optional goal onboarding
- Solo onboarding now leads to `/body-goal` before plan setup.
- Body tracking is explicitly optional; `training_only` keeps OVRLD focused on the plan and workout logging.
- Supported goal choices: gain weight, lose weight, muscle gain, maintain weight, recomposition, or track weight only.
- When body tracking is enabled, only current weight is required; target weight, height, and weigh-in cadence are optional.
- Goal + starting measurement use the existing body-progress service and database foundation.

### 2. Mobile-first weekly plan
- The week is rendered as readable horizontal cards instead of squeezing seven tiny columns onto a phone.
- The same week-strip language is used on the dashboard and plan editor.
- A user can swap any two days for the current week without modifying the repeating/base split.

### 3. Atomic week-day swap
Migration: `202609080002_week_schedule_swap_v2.sql`

Adds `public.swap_week_schedule_days(first_schedule_date, second_schedule_date)`.
The RPC:
- requires authentication,
- ensures both schedule rows exist,
- locks both rows,
- swaps their workout contents in one transaction,
- keeps the base split untouched,
- validates the existing “no three consecutive rest days” rule after both writes.

### 4. Faster gym completion flow
- Weight/reps nudges provide light haptic feedback when supported.
- Logging the final planned set no longer starts a pointless rest timer.
- Final-set success uses a stronger haptic pattern and surfaces a direct “finish workout” action.
- Completed-workout states no longer push the user toward another exercise.

### 5. Body-progress check-in on Home
- If body tracking is unused, Home only shows a quiet optional entry point.
- If a weigh-in is due, the preview turns into a clear check-in prompt.
- If tracking is active but not due, it shows the latest weight, change from the previous reading, and target when available.

### 6. UI polish
- Added mobile week cards, goal choice cards, onboarding progress steps, quick swap treatment, gym log/finish states, and due check-in states.
- Small-screen rules keep controls reachable and readable.
- Existing dark/light theme and PWA safe-area behavior remain in place.

## Database migrations required
Apply migrations in order, including:
1. `202609080001_body_progress_v2.sql`
2. `202609080002_week_schedule_swap_v2.sql`

Do not apply production migrations until they have been reviewed against the live Supabase project.

## Validation status
- Changed TypeScript/TSX files were syntax-validated with TypeScript `transpileModule`.
- A complete `npm ci` could not finish in the execution environment before timeout, so full `typecheck`, `lint`, and production `build` are **not claimed as passed**.
- Before deployment run locally:
  - `npm ci`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
