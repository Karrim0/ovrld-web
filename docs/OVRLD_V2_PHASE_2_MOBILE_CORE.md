# OVRLD v2 — Phase 2 Mobile Core

This pass focuses on the two moments that define the product: seeing the plan and logging a set inside the gym.

## Gym mode

The default set flow is now tap-first:

1. Pick an exercise.
2. OVRLD preloads the matching set from the previous performance when available.
3. The ready screen exposes weight and reps immediately with large +/- controls.
4. The user logs the set directly from that screen.
5. The rest timer starts after the log and the next set is prepared from its own previous-set values.

The old set-duration timer is retained as an optional secondary action instead of being required for every set. The detailed weight/reps picker remains available under “more options”.

Design goal: a normal set should require no keyboard and as few taps as possible.

## Today / Home

The compact today card now also shows:

- target set count
- estimated duration
- the first exercises as horizontally scrollable pills

The user can understand the workout before opening gym mode without turning Home into another analytics dashboard.

## Plan

The personal plan screen now starts with a compact plan summary:

- training days
- rest days
- saved exercise count

Creating/importing a completely new plan is moved into a collapsed secondary section. Normal users therefore land directly on the weekly/base schedule controls instead of repeatedly seeing setup UI after the plan already exists.

## Validation performed

The changed TypeScript/TSX files were run through TypeScript's syntax transpiler successfully.

A full dependency install/typecheck/build could not be completed in the working container because npm dependency installation timed out. Run these locally before deployment:

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```
