# OVRLD Web

OVRLD Web is the browser and PWA experience for the OVRLD training platform. It shares the same Supabase backend as OVRLD Mobile and supports individual training first, with optional Crew features.

## Current alignment phase

Phase 2 repairs cross-platform workout freshness, sync recovery, and protected-route login behavior after the Phase 1 backend alignment.

Included across Phase 1 and Phase 2:

- the complete active Supabase migration chain used by OVRLD Mobile;
- aligned generated database types and RPC definitions;
- OVRLD metadata, PWA manifest, visible product copy, and package identity;
- safe migration from legacy `gym-crew:` browser settings to `ovrld:` settings;
- preserved IndexedDB data for existing offline users;
- OVRLD service-worker cache names with legacy cache cleanup;
- automated backend-alignment and rename verification;
- safe post-login route restoration;
- remote workout refresh without overwriting pending offline changes;
- interrupted-sync recovery and retry backoff;
- target-rep and set-note preservation across web, mobile backend, and IndexedDB.

See [`docs/OVRLD_WEB_PHASE_1.md`](docs/OVRLD_WEB_PHASE_1.md) for the compatibility and database-safety rules.

## Product capabilities

- Authentication and password recovery.
- Individual and optional Crew onboarding.
- Personal and shared workout plans.
- Ready-made and custom splits.
- Exercise library and plan import.
- Gym Mode with set, weight, rep, note, timer, and stopwatch logging.
- Workout history, personal records, streaks, body map, and progress summaries.
- Offline workout storage and queued synchronization.
- Arabic/English and RTL/LTR support.
- Light and dark themes.
- Installable PWA experience.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, PostgreSQL, Storage, and RLS
- Dexie and IndexedDB
- React Hook Form and Zod

## Requirements

- Node.js 22 recommended
- npm
- The same Supabase project used by OVRLD Mobile

## Configure

Copy the environment template:

```bash
cp .env.example .env.local
```

Set public client values only:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
NEXT_PUBLIC_APP_URL=https://YOUR_OVRLD_DOMAIN.example
```

`OPENAI_API_KEY` is server-only and is used only by Smart Plan Import. Never expose service-role keys or private credentials through `NEXT_PUBLIC_` variables.

## Install and develop

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Phase 2 verification

```bash
npm run verify:phase2
npm run typecheck
npm run lint
npm run build
```

Or on Windows:

```bat
VERIFY_OVRLD_WEB_PHASE2.cmd
```

## Database safety

The committed migration files now match the OVRLD Mobile repository. Do not run `npx supabase db push` against production until `npx supabase migration list` confirms the linked project already follows the same active migration chain.

## Main directories

```text
src/app                 Next.js App Router pages and API routes
src/components          Shared interface and provider components
src/features            Auth, groups, plans, workouts, and progress features
src/lib/offline         IndexedDB storage and synchronization
src/lib/supabase        Supabase clients and generated database types
supabase/migrations     Shared active backend migration chain
supabase/tests          Database regression tests
scripts                 Repository verification scripts
docs                    Product and implementation documentation
```
