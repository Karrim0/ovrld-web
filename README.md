# OVRLD Web

OVRLD Web is the browser and installable PWA experience for the OVRLD training platform. It shares the same Supabase backend and workout data model as OVRLD Mobile, with individual training as the product core and Crews as an optional social layer.

## Stable release

**OVRLD Web v1.8.0**

This release completes the Gym Crew → OVRLD migration, aligns the web client with the mobile backend, repairs cross-platform workout freshness and offline synchronization, and prepares the repository for production deployment.

## Product capabilities

- Email authentication, confirmation, password recovery, and protected-route restoration.
- Individual and optional Crew onboarding.
- Personal and shared workout plans, templates, and exercise library.
- Gym Mode with weight, reps, set notes, timers, and session recovery.
- Workout history, volume, records, streaks, body map, and exercise progress.
- Offline workout storage with queued synchronization and retry backoff.
- Cross-platform workout freshness between OVRLD Web and OVRLD Mobile.
- Arabic/English with RTL/LTR layouts.
- Light and dark themes.
- Installable PWA with legacy cache and browser-storage migration.


## Current product iteration

**Finalization Pass 6 — Onboarding & Progressive Profile**

Pass 6 consolidates new-user setup into one five-step onboarding flow, adds only the missing general fitness basics to `profiles`, and computes contextual profile completeness from the existing body, goal, split, and Gain data sources. Missing details are requested progressively with direct CTAs instead of blocking popups. See `docs/OVRLD_FINALIZATION_PASS_6.md`.

**OVRLD V2 — Phase 14: Recommended Gain Plan**

Phase 14 adds the built-in 4-day Glutes + Legs plan, week-level day-off flexibility, same-muscle exercise swaps, private support notes, and tighter Gain Mode coaching. See [`docs/OVRLD_V2_PHASE_14_RECOMMENDED_GAIN_PLAN.md`](docs/OVRLD_V2_PHASE_14_RECOMMENDED_GAIN_PLAN.md).

**OVRLD V2 — Phase 13: Gain Architecture Cleanup**

Phase 13 turns Gain Mode into a compact control center with dedicated Nutrition, Body, Training, and History sections. Body progress now has a measurement map and trend view, the training section scores plan compatibility against the selected physique focus, and AI food logging is shown honestly as a Premium coming-soon capability while manual logging and saved meals remain available. See [`docs/OVRLD_V2_PHASE_13_GAIN_ARCHITECTURE.md`](docs/OVRLD_V2_PHASE_13_GAIN_ARCHITECTURE.md).


## Finalization Pass 5.1 — Quick Log and Gain UX

Pass 5.1 promotes Quick Log to a first-class workout logging path, keeps manual food logging visible before Premium AI estimation, adds a subtle women-focused treatment to the recommended Gain plan, and preserves the simplified Game Mode and muted visual system. See `docs/OVRLD_FINALIZATION_PASS_5_1.md`.

## Stack

- Next.js 16 and React 19
- TypeScript and Tailwind CSS 4
- Supabase Auth, PostgreSQL, Storage, and RLS
- Dexie and IndexedDB
- React Hook Form and Zod
- GitHub Actions and Vercel

## Requirements

- Node.js 22
- npm
- The same Supabase project used by OVRLD Mobile

## Configure

Copy the environment template:

```bash
cp .env.example .env.local
```

Set the public client values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
NEXT_PUBLIC_APP_URL=https://YOUR_OVRLD_DOMAIN.example
```

Smart Plan Import and optional AI food estimation use these server-only values:

```env
OPENAI_API_KEY=YOUR_SERVER_ONLY_KEY
OPENAI_PLAN_IMPORT_MODEL=gpt-5.6-luna
OPENAI_FOOD_LOG_MODEL=gpt-5.6-luna
```

The AI key is optional. If it is absent or the provider quota is unavailable, manual food logging and saved meals continue to work normally.

Never expose service-role keys, private API keys, or signing credentials through `NEXT_PUBLIC_` variables.

## Install and develop

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Quality gates

Run the complete final gate:

```bash
npm run check
```

On Windows:

```bat
VERIFY_OVRLD_WEB_FINAL.cmd
```

The gate covers the cumulative Phase 1→14 product contracts, Finalization Passes 2–6, TypeScript, ESLint, and the production build. The Windows final verifier also runs Git whitespace validation.

Validate production environment values before deployment:

```bash
npm run verify:production-env
```

## Security audit

Run production and full dependency audits separately:

```bash
npm run security:audit:production
npm run security:audit:all
```

Do not use `npm audit fix --force` on the release branch. Review and upgrade affected packages deliberately on a dedicated dependency branch. See [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md).

## Database safety

The committed migrations match the active OVRLD Mobile chain. Do not run `npx supabase db push` against production unless `npx supabase migration list` confirms the linked project follows the same chain.

## Production release

Follow [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md) for GitHub, Vercel, Supabase Auth redirect, PWA, smoke-test, and rollback steps.

## Main directories

```text
src/app                 Next.js App Router pages and API routes
src/components          Shared UI, layout, and provider components
src/features            Auth, Crew, plans, workouts, and progress features
src/lib/offline         IndexedDB storage and synchronization
src/lib/supabase        Supabase clients and generated database types
supabase/migrations     Shared active backend migration chain
supabase/tests          Database regression tests
scripts                 Verification and release scripts
docs                    Architecture, deployment, and release documentation
docs/archive            Historical Gym Crew and implementation notes
```

## Release identity

- Product: `OVRLD Web`
- Version: `1.8.0`
- Package: `ovrld-web`
- Default release branch: `main`
- Recommended repository name: `ovrld-web`

## OVRLD V2 Phase 8

Gain Mode now includes private daily calorie/protein logging, editable nutrition targets, a seven-day nutrition signal, and a clearer start/current/goal weight journey. See `docs/OVRLD_V2_PHASE_8_GAIN_NUTRITION.md`.

## License

Use and distribution are governed by the license configured for this repository.

## OVRLD V2 product work

The current V2 product direction is mobile-first workout execution plus process tracking. Phase 5 adds a Smart Process Loop on Home, micro-progression hints in Gym Mode, and stale-session timer recovery without auto-changing the user's program. See `docs/OVRLD_V2_PHASE_5_SMART_PROCESS_LOOP.md`.

## Phase 4.1 body-progress hotfix

- Prevents the Body Progress route from rendering chart components with a null snapshot after a failed Supabase fetch.
- Replaces the unsafe non-null assertion passed to `WeightSparkline` with a guarded render path.
- Shows a recoverable retry state instead of crashing the whole route.
- Detects the common case where the new body-progress schema has not been applied yet and shows a friendly database-update message.

The body-progress and flexible-week-swap migrations still need to be applied to the linked Supabase project before those features can write/read their new database objects.


## Phase 5 smart process loop

- Home now resolves training adherence, exercise momentum, and optional body check-ins into one next-step card.
- Gym Mode offers a small progression hint from the previous matching set and the current rep range.
- Active sessions older than 18 hours are treated as stale so abandoned workouts never display or save multi-day gym timers.
- No Phase 5 database migration is required.

## OVRLD V2 Phase 12

- Gym Mode opens on the next active set and keeps reorder/add/delete/notes behind compact controls.
- Progression suggestions use previous-set performance and the rep range; the user always confirms the values.
- Gain Mode is available to any adult user and asks for the sex reference only for the starting calorie equation.
- Gain reviews combine nutrition, weight, measurements, training-plan execution, adherence, and strength trends.
- One additive migration connects the universal Gain profile to the new equation input while preserving existing users.

See `docs/OVRLD_V2_PHASE_12_PREMIUM_INTEGRATION.md`.


## OVRLD V2 Phase 13

- Gain Mode is a compact overview with dedicated Nutrition, Body, Training, and History routes.
- Body progress adds a measurement-location silhouette and trend charts without pretending to predict body shape.
- Split analysis can use balanced, lower-body, or glutes-and-legs physique focus and reports plan compatibility separately from nutrition.
- AI food logging is presented as an honest Premium coming-soon capability; manual logging and saved meals remain available.
- One additive migration adds `physique_focus` to the private Gain Mode profile.

## OVRLD V2 Phase 14

Recommended Gain plan + flexible weekly execution + private support notes.

## Finalization Pass 4 — Release Candidate polish

Pass 4 completes the remaining workout-feedback controls, shared workout metrics, localization sweep, navigation consistency, and Workout Summary progression highlight. Run `npm run pass4:check` before release and use Node 22. See `docs/OVRLD_FINALIZATION_PASS_4.md`.
