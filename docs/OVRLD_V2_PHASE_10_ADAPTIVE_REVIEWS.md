# OVRLD V2 — Phase 10: Adaptive Gain Reviews

Phase 10 turns Gain Mode from passive tracking into a review loop.

## Product contract

- Weekly review uses the last 7 completed days, not a partially logged current day.
- 28-day review combines nutrition, workouts, weight and available body measurements.
- The adaptive engine never changes calories automatically.
- A calorie increase is only suggested when there is enough weight history, at least 5 logged nutrition days, intake is close to the current target, and training consistency is not the obvious missing signal.
- The only automatic recommendation in this phase is a small +100 kcal suggestion when weight is effectively flat under the review heuristics.
- After an accepted adaptive or numeric manual calorie change, Gain Mode observes for 14 days before another adaptive increase can be suggested.
- Every accepted numeric calorie target change is auditable in `gain_calorie_adjustments`.

## Main surfaces

- `/progress/gain`: compact weekly review preview.
- `/progress/gain/review`: full weekly decision, last-7-day numbers, last-28-day numbers, measurement deltas and calorie adjustment history.

## Database

Migration: `202609080006_gain_reviews_adaptive_v1.sql`

Adds:

- `gain_calorie_adjustments`
- RLS policies scoped to the authenticated user
- `apply_gain_calorie_adjustment(...)` RPC for an atomic explicit target update + audit row

The RPC authorizes against `auth.uid()` and does not accept a user id from the client.

## Important boundary

The review engine is a product heuristic, not a medical diagnosis or a prescription. It deliberately prefers collecting more data or holding a plan steady over frequent target changes.
