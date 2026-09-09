# OVRLD V2 — Final Product Audit

This audit is based on the full project snapshot supplied after Phases 1–11 and the Phase 12 integration pass. The objective is a clean, mobile-first product rather than another layer of features.

## Final product hierarchy

1. **Home** — today first: workout + the one process signal that matters now.
2. **My Plan** — weekly plan first; setup, analysis, cosmetics and swaps stay secondary.
3. **Gym Mode** — active set first; weight, reps, log. Editing lives behind compact controls.
4. **Progress** — Training and Body are distinct views; empty accounts get an action instead of a wall of zeroes.
5. **Account** — settings and optional Crew features stay out of the core training loop.
6. **Gain Mode** — an optional goal mode inside OVRLD, not a separate product and not gender-gated.

## Gym Mode

The premium rule is: **execution beats configuration while the user is training**.

- Existing sessions open on the next unfinished set.
- Weight and reps are the dominant controls.
- Previous performance is visible as context, not a large history card.
- Progression suggestions are small, reversible suggestions based on previous matching sets and the rep range.
- Reorder, add exercise, notes, remove exercise, finish early and delete session are secondary actions.
- Reordering is disabled until Edit is explicitly enabled.
- Rest timer and set timer remain available without taking over the primary logging flow.
- Stale sessions cannot create absurd multi-day timers.

## Gain Mode

Gain Mode is now one connected process:

**Nutrition → body weight → measurements → training execution → strength trend → review → explicit adjustment**

It includes:

- calorie and protein targets,
- daily food logging,
- optional AI food estimation with manual fallback,
- saved meals,
- weight trend,
- circumference measurements,
- 7-day and 28-day review windows,
- the user's real training plan and weekly overrides,
- workout adherence,
- exercise progress / plateau signals,
- small adaptive calorie suggestions with a cooldown and explicit confirmation.

A missing training plan or weak training consistency pauses nutrition-adjustment logic because scale movement alone is not enough context for the goal.

## Universal Gain Mode

Gain Mode is available to any adult user. Product copy is gender-neutral. The female/male input is requested only for the initial calorie equation and never controls eligibility. Fresh setup requires an explicit choice rather than silently assuming one value.

## UI / UX cleanup rules preserved in the final code

- One primary action per moment.
- Large cards only when the information needs visual hierarchy.
- Secondary actions use rows, icon buttons, details panels or sheets.
- Numbers come before explanatory paragraphs where possible.
- Empty states give one next action.
- Crew remains optional and secondary.
- Destructive actions are separated from normal flow.
- No automatic change to workout programming, calorie targets, weight, reps or measurements.

## Repository cleanup

The final release tree removes:

- unused legacy workout components,
- unused legacy split components,
- historical root patch files,
- generated TypeScript build-info,
- local Supabase CLI state from release packages,
- build/dependency directories from release packages.

Historical documentation under `docs/archive` is retained because it does not ship into the user interface and can still be useful for maintenance.

## External dependencies and non-blocking limitations

- AI food estimation requires a configured server-side API key and provider quota. Manual food logging and saved meals remain fully usable without it.
- AI estimates are approximate and require user review before saving.
- Progress photos are intentionally not part of the final core flow yet; adding private body imagery deserves a dedicated storage/privacy design instead of a casual upload feature.
- Final TypeScript, ESLint and production-build gates must run on the developer machine or CI with a complete dependency install.

## Release gate

Before deployment:

```bash
npm run typecheck
npm run lint
npm run build
npx supabase migration list
npx supabase db push --dry-run
```

When Phases 1–11 are already applied, only this migration should be pending:

```text
202609090002_gain_mode_training_integration_v1.sql
```

Then run the app on a real phone and smoke-test:

- fresh training-only onboarding,
- fresh Gain Mode onboarding for both equation inputs,
- rest day and training day Home,
- Gym Mode first-use exercise,
- returning exercise progression suggestion,
- reorder/add/remove through workout options,
- food logging with AI unavailable,
- food logging with AI available if configured,
- saved meal reuse,
- weight and measurement check-ins,
- Gain weekly review with and without a training plan,
- Arabic and English,
- light and dark themes,
- installed PWA after clearing the previous service-worker cache.
