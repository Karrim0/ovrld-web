# OVRLD v2 — Phase 13: Gain Mode Architecture Cleanup

Phase 13 turns Gain Mode from one long feature page into a small product architecture with clear destinations.

## Product structure

- **Gain Overview**: weight journey, today's calories/protein/training, weekly review, and four shortcuts only.
- **Nutrition**: food logging, saved meals, targets, and nutrition history. Body measurements are not rendered here.
- **Body**: one dedicated experience for weight, circumference measurements, body-shape map, and measurement trends.
- **Training**: reads the user's real personal split and compares weekly volume/exposure with the selected physique focus.
- **History**: one 90-day timeline for nutrition, weight, circumference measurements, and completed workouts.

## AI Food Logging

The AI parser code remains in the repository for a future paid product tier, but the live Gain Nutrition UI intentionally renders a static **OVRLD Premium · Coming soon** lock. It does not pretend that checkout or a subscription exists. Manual logging and saved meals remain fully usable.

## Physique focus

`gain_mode_profiles.physique_focus` is one of:

- `balanced`
- `lower_body`
- `glutes_legs`

This value only changes split analysis. It does not silently change calories or training data.

The training compatibility score is a product-level planning indicator. It uses weighted weekly sets, exposure days, lower-body share, and a minimum amount of upper-body maintenance. It is not a medical score and does not guarantee a physique outcome.

For plan-volume accounting, direct sets count as 1.0 and secondary-muscle participation counts as 0.5 weighted sets. The score is intentionally conservative and is used to surface review prompts, not automatically rewrite the user's split.

## Body visual

The body silhouette is a measurement-location map. It does **not** morph to claim what the user's body looks like. Real progress is represented by circumference values, deltas, and trend charts.

## Database

One additive migration:

`202609090003_gain_mode_architecture_v1.sql`

It adds only `physique_focus` to `public.gain_mode_profiles` with a check constraint.
