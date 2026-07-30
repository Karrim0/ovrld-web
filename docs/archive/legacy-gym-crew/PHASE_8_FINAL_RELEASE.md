# Phase 8 — Final UI, PWA and Release Stability

## Included

- Forced dark gym theme with lime accent and consistent design tokens.
- Redesigned authentication, onboarding, dashboard, workout, progress, crew and profile entry screens.
- Mobile bottom navigation and active desktop sidebar.
- Improved loading, empty, error, offline and sync states.
- Production-only service-worker registration.
- Development cleanup for stale service workers and Gym Crew caches.
- Safer PWA navigation caching that skips React Server Component requests.
- Install prompt and PWA shortcuts.
- Deterministic group invite controls to prevent hydration mismatches.
- Webpack development and production builds for Windows filesystem stability.
- Limited Next.js build workers for reliable CI and Vercel builds.

## Runtime fixes

The previous hydration and `fetchTrainingTrend is not a function` failures were caused by stale client bundles served by the development service worker. The service worker is now disabled and cleaned up during development. Production caching only handles hashed static assets and full navigation requests; it does not intercept Next.js RSC requests.

The repeated Windows `EPERM rename` failures were occurring while the development bundler wrote multiple manifest files. The default scripts now use Webpack, and production page-data workers are capped at two.

## Database

No new migration is required for Phase 8. The latest required database migration remains:

`202607140006_analytics_group_polish.sql`

## Required environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Add both variables to Vercel for Preview and Production environments.

## Local verification

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run start
```

## Deployment

Push the release branch to create a Vercel Preview deployment. Test authentication, workouts, progress, crew pages, refreshes and PWA installation. Merge into `main` only after the Preview is stable.
