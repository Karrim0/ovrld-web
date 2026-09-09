# OVRLD Finalization — Pass 2

Pass 2 is the product-polish pass: identity, workout UX, Gain Mode UX, plan selection, and language hardening. It intentionally adds no new database migration.

## Identity
- Replaced the previous angular mark with the OVRLD progression mark: an open training loop crossed by an ascending load bar/arrow.
- Rebuilt 192/512/maskable/iOS app icons and the public SVG mark.
- Shifted the visual system from indigo-led to emerald/mint while preserving both Light and Dark themes.
- Dark surfaces now lean green-black instead of blue-black; Light surfaces use an off-white/mint-neutral base.
- Progress charts and muscle-focus graphics use the same emerald identity.

## Gain Mode
- Rebuilt the top summary as a product header with one options control.
- Consolidated secondary actions into a bottom sheet.
- Kept training, nutrition, body, history and review in a single clear hierarchy.
- Rebuilt the Gain training integration screen with explicit Arabic/English copy and the final Recommended Gain plan.

## Workout / Gym Mode
- Kept one workout options button in the header.
- Removed the duplicate add-exercise path from workout options; exercise editing now flows through Manage exercises -> Edit -> Add exercise.
- Strengthened the set logging card: larger weight/reps values, clearer +/- controls, stronger primary Log Set action, dedicated set-timer control.
- Localized the core logging and options flow explicitly for Arabic/English.
- Removed the unused `Save` icon import left by Pass 1.

## Plan selection
- Rebuilt the chooser around three explicit decisions: Ready plans, Import your plan, Build from scratch.
- Recommended Gain · Glutes + Legs is visible at the top and also appears inside the Ready plans list.
- Gain plan shows 4 training days / 3 rest days before applying.
- Applying any ready plan explains that it replaces the base plan but remains editable.
- Existing users get a clearer `Change or choose a plan` section instead of nested generic plan tools.

## Language hardening
- Added explicit bilingual copy to the most important Gain and Gym surfaces.
- Expanded runtime translations for dynamic weight, cm, plan-fit, counts and Gain analysis strings.
- Expanded the Arabic -> English map for workout errors, plan selection, exercise names, weekdays, validation errors, body/progress labels and common system messages.
- PWA shortcuts are English-neutral because the static web manifest cannot reliably follow the in-app localStorage language.

## Verification
Run:

```bash
npm run verify:pass2
npm run typecheck
npm run lint
npm run build
```

No Supabase migration is required for Pass 2. The final Gain plan migrations from Pass 1 remain unchanged.
