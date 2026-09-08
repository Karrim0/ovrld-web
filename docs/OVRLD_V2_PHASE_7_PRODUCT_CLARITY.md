# OVRLD V2 — Phase 7: Product Clarity & UX Polish

## Goal

Phase 7 does not add another large product feature. It makes the product that already exists easier to understand and faster to use on a phone.

The working UX rule is:

**numbers before paragraphs; one clear job per screen; a card only when the content actually needs a card.**

OVRLD remains a general gym tracker. Gain Mode remains an optional goal mode rather than the identity of the whole app.

## Product hierarchy

The primary mobile navigation remains:

`Home — My Plan — Workout — Progress — Account`

Crew is deliberately secondary and lives under Account rather than competing with the daily training flow.

## 1. Brand and PWA identity

Phase 7 introduces a compact geometric OVRLD mark that works without a large wordmark in the interface.

The same mark is used across:

- authentication surfaces
- dashboard header
- desktop sidebar
- installable PWA icons
- Apple touch icon
- maskable Android icon

The icon family is generated from the vector identity so the installed app does not fall back to the old generic workout branding.

## 2. Home is now Today-first

Home is intentionally short:

1. today's workout / active session / rest state
2. one Gain Mode or process priority
3. the current week

Large motivational headings and repeated explanatory copy were removed. The daily cards favor status, counts and one action.

When Gain Mode is active, its Home surface prioritizes current weight, target weight, protein reference and the next process action. It does not turn Home into a full nutrition dashboard yet.

## 3. Progress has two obvious jobs

Progress now has a visible segmented switch:

- Training
- Body

A user with no training history gets one useful empty state instead of a wall of zero metrics.

Once training data exists, the screen emphasizes a small weekly summary, compact momentum numbers, the eight-week trend and direct links to exercise progress, records and body map.

Body progress remains the place for body-weight trend and Gain Mode journey data.

## 4. Gain Mode is quieter and more numeric

The Gain Mode hub was reduced to:

- start weight
- current weight
- target weight
- delta
- one priority action
- protein reference
- appetite state
- direct links to training and weight trend

Long process explanations and science disclaimers are not repeated in the main daily UX. The underlying science/product specification remains in project documentation.

Full calorie and food logging is intentionally left for the next Gain Mode nutrition phase.

## 5. My Plan favors editing over explanation

When a plan exists, the page no longer leads with a large setup explanation.

The main surface now shows:

- training-day count
- rest-day count
- exercise count
- current week / base plan selector
- day selection and editing

Creating/importing a plan and plan analysis are secondary disclosure panels. Cosmetic day properties and notes remain available as advanced options rather than filling the default editor.

## 6. Account is a utility surface

Account now uses compact rows for:

- account details
- Gain Mode
- body and weight
- training plan
- optional Crew
- language/theme controls

This removes the old collection of equally heavy cards and keeps secondary product features out of the primary navigation.

## 7. Visual-system cleanup

Phase 7 adds a compact UI layer for daily panels, list rows, number cells, segmented controls and empty states. It also reduces card radius/shadows, reduces the oversized center navigation treatment, tightens week-day cards and preserves mobile bottom safe-area spacing.

## Database

**No new database migration is introduced in Phase 7.**

The latest expected migration remains:

`202609080003_gain_mode_v1.sql`

There is no reason to run `supabase db push` solely for Phase 7.

## Verification

The repository includes `scripts/verify-ovrld-v2-phase7.mjs` and the cumulative command:

```bash
npm run phase7:check
```

The structural Phase 1→7 verifiers pass in the packaging environment. A repository-wide TypeScript AST/import scan also passes.

The packaging environment does not contain a complete local npm dependency tree, so the final `typecheck`, `lint` and Next.js production build must still run in a normal project install before deployment.

## Next product phase

Phase 7 deliberately prepares the information hierarchy for the next deep Gain Mode feature:

**Nutrition & Daily Tracking**

That phase can add calorie/protein targets, food logging, daily status, weekly review and longer-term adjustment without reintroducing dashboard clutter.
