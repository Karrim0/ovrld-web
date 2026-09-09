# OVRLD Finalization — Pass 1

This pass starts the final-product cleanup requested after the Phase 14 Gain-plan integration.

## Fixed release blocker

- Renamed the click handler `useRecommendedPlan` to `applyRecommendedPlan` so ESLint no longer treats a normal event handler as a React Hook.

## Progress

- Removed the large Gain Mode promo/status card from the main Training Progress screen.
- Gain Mode remains available through its dedicated flow instead of competing with training progress hierarchy.

## Gym Mode

- Reduced the sticky command bar to one explicit options button.
- Removed duplicate list/leave controls from the top bar.
- Kept the session title itself as the lightweight route back to the exercise overview.
- Rebuilt the workout options sheet as a single clean list.
- Removed the duplicate “add exercise” action.
- Removed “finish workout” from the options sheet so finishing remains part of the natural workout flow.
- Moved “save and leave” into the options sheet.
- Strengthened the geometry and hierarchy of the active set logger: clearer weight/reps blocks, larger numbers, stronger primary log action.

## Recommended Gain plan correction

Forward migration: `202609090005_gain_recommended_plan_v2.sql`

Final program corrections:

- Saturday: `Leg Press Calf Raise — 3×8–12`
- Monday: `Hip Adduction Machine — 2×10–15` replaces the earlier kickback placeholder.
- Wednesday: `Standing Calf Raise — 2×12–20`
- Total deliberate calf work: 5 direct sets/week.

The current broad muscle taxonomy does not yet have an `adductors` enum, so the Hip Adduction Machine catalog entry is temporarily grouped under the broad `quads` bucket. The exercise itself and programmed movement remain correct; a later taxonomy cleanup can split inner-thigh analytics without blocking this release.

## Verification performed in this environment

- Parsed all 300 TypeScript/TSX source files with the TypeScript parser: **0 parse errors**.
- Full `npm ci` could not complete in this sandbox because npm itself terminated with `Exit handler never called`, so the full project `typecheck/lint/build` gates must be run on the Windows project after copying this pass.

## Developer-machine gate

```bat
npm install
npm run typecheck
npm run lint
npm run build
npx supabase migration list
npx supabase db push --dry-run
```

Then apply the migration when ready:

```bat
npx supabase db push
```

If the Recommended Gain plan had already been applied before v2, re-apply it once from Gain Mode / My Plan after the migration so the existing materialized split receives the corrected calves + adduction exercises.
