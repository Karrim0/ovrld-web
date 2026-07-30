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

Smart Plan Import optionally uses these server-only values:

```env
OPENAI_API_KEY=YOUR_SERVER_ONLY_KEY
OPENAI_PLAN_IMPORT_MODEL=gpt-5.6-luna
```

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
npm run phase3:check
```

On Windows:

```bat
VERIFY_OVRLD_WEB_FINAL.cmd
```

The gate covers the Phase 1 backend contract, Phase 2 synchronization contract, final repository/release contract, TypeScript, ESLint, production build, and Git whitespace validation.

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

## License

Use and distribution are governed by the license configured for this repository.
