# OVRLD V2 — Phase 12: Premium Product Integration

Phase 12 is the final product-integration pass after the feature build-out. Its job is not to add another dashboard; it makes the existing product feel like one coherent mobile app.

## Product rules

1. **Gym Mode is execution-first.** The active set is the default view. Reordering, adding exercises, notes, finishing early and destructive actions live behind compact controls instead of occupying the workout flow.
2. **Progression is assistive, not automatic.** OVRLD uses the matching previous set and the exercise rep range to suggest a small next step. The user confirms the numbers before logging.
3. **Gain Mode is universal.** Weight gain is a goal mode, not a women-only product. Sex is requested only as an input to the initial Mifflin–St Jeor calorie estimate and never gates feature access.
4. **Gain Mode includes training.** Nutrition, weight, measurements, plan adherence and exercise-performance trends are viewed together. Adaptive calorie decisions pause when the training plan is missing or weekly execution is too inconsistent to interpret the result safely.
5. **One primary action per moment.** Secondary controls are rows, icons or sheets. Large cards are reserved for information that genuinely needs hierarchy.
6. **No silent automation.** OVRLD can suggest a calorie or progression change, but it does not change the user's nutrition target, workout plan, weight or reps without an explicit action.

## Gym Mode changes

- Existing sessions open directly on the next active set instead of a reorder/coach screen.
- Exercise list is a compact queue; reorder controls appear only after tapping **Edit**.
- The set screen keeps weight, reps and the primary log action in focus.
- First use creates a baseline suggestion; returning exercises use the matching previous set.
- Rep progression prefers +1 rep while still inside the range.
- Reaching the top of the rep range can suggest a small load increase using the exercise's inferred plate increment (for example 2.5 or 5 kg) and resets to the lower end of the rep range.
- Full number pickers, the set timer and exercise list are secondary tools.
- PWA notification clicks now respect each notification's target route instead of hard-coding one destination.
- Workout notes, add exercise, reorder, finish and delete are moved into a bottom options sheet.

## Gain Mode + training integration

A new training summary combines:

- configured training days,
- planned sets/exercise slots,
- completed vs scheduled workouts,
- weekly adherence,
- improving exercises,
- plateau/slipping exercise signals.

The 7-day and 28-day Gain reviews now calculate scheduled workouts from the real personal plan plus weekly schedule overrides. The adaptive nutrition decision does not treat low training execution as evidence that calories need to change.

## Universal calorie estimate

`gain_mode_profiles.equation_sex` stores the sex reference used by the initial calorie equation (`female` or `male`). Existing Gain Mode users are backfilled to `female` to preserve the estimate they previously received, because earlier versions were explicitly women-focused. New Gain Mode onboarding does not silently assume either value: the user must choose the equation input explicitly. This field is an equation input only and never gates feature access.

Migration:

`202609090002_gain_mode_training_integration_v1.sql`

## Repository cleanup

Historical root patch artifacts, generated TypeScript build-info and unused placeholder workout/split components are removed from the final tree. Active product code remains under the current feature modules and archived product history remains in `docs/archive`.

## Verification

Run:

```bash
npm run verify:phase12
npm run typecheck
npm run lint
npm run build
```

Before database deployment:

```bash
npx supabase migration list
npx supabase db push --dry-run
```

Only the Phase 12 migration should be pending when Phases 1–11 are already applied.

## Final QA notes

- Active Gain Mode copy is gender-neutral; the food-estimation fallback is neutral as well.
- Fresh Gain Mode setup requires an explicit calorie-equation sex reference instead of defaulting a new user to female.
- `supabase/.temp`, `.next`, `node_modules`, TypeScript build-info, local env files and legacy root patch artifacts are excluded from release packages.
- The full Phase 1→12 structural verifier chain and a TypeScript parser/import sweep are run before packaging.
- Final `npm run typecheck`, `npm run lint`, and `npm run build` remain local/CI quality gates because the artifact environment does not contain a complete install of project dependencies.
