# Gym Crew v1.1 — Critical Fixes and Product Restructure

This patch is built against the latest uploaded Gym Crew v1.0 release candidate.
It changes the product hierarchy, fixes production authentication redirects, and adds safe deletion of completed workout sessions.

## Product priorities

The authenticated experience now follows this order:

1. Personal split and weekly plan.
2. Today's workout.
3. Active workout / Gym Mode.
4. Personal progress, records, history and body map.
5. Crew tools grouped in a single hub.

The mobile and desktop primary navigation is now:

- Home
- Plan
- Train
- Progress
- More

`Train` opens today's workout directly. `More` contains workout history, profile, records, body map and crew access.

## Authentication fixes

- Signup now sends an explicit callback URL derived from the current deployed origin.
- Password reset now sends an explicit callback URL to `/auth/callback?next=/update-password`.
- The auth callback respects Vercel forwarded host/protocol headers.
- Signup provides visible success, confirmation and resend states.
- Attempting to register an existing confirmed email now shows a useful message instead of appearing to do nothing.
- Callback failures are shown on the login form.
- `NEXT_PUBLIC_APP_URL` was added as a canonical URL fallback.

Remote Supabase configuration is still required. See `AUTH_PRODUCTION_CHECKLIST.md`.

## Delete a completed workout

A completed workout can be deleted from:

`More -> Workout history -> Open a session -> Delete workout`

The deletion flow:

- Requires confirmation.
- Only allows the authenticated owner to delete the session.
- Removes the session, exercises and sets.
- Removes directly-related crew feed events.
- Recalculates personal records for affected exercises.
- Removes the local IndexedDB copy.
- Refreshes history, charts and adherence data.
- Requires an internet connection.

Database migration required:

`supabase/migrations/202607150007_auth_session_delete_product_restructure.sql`

## UI/UX restructure

- Replaced the high-contrast neon visual direction with a calmer charcoal/navy and soft-indigo system.
- Reduced oversized headings, excessive font weight, heavy shadows and decorative empty space.
- Made the personal split the first dashboard block.
- Added a clear seven-day split overview with today highlighted.
- Moved today's workout immediately below the split.
- Simplified the active workout screen around one exercise at a time, large weight/reps fields, prior performance and set completion.
- Consolidated group activity, leaderboard, invite, members, group split and privacy into one group hub.
- Added a dedicated `/more` route for secondary tools.
- Improved empty, loading, error and confirmation states.

## Mobile safe-area fixes

- The viewport uses `viewportFit: "cover"`.
- Top/left/right body padding uses `env(safe-area-inset-*)`.
- Bottom navigation positioning and page bottom spacing include the bottom safe-area inset.
- The iOS status bar uses a non-translucent dark style to reduce content overlap.

## Version and routes

- Package version: `1.1.0`
- New route: `/more`
- New migration: `007_auth_session_delete_product_restructure`

## Verification completed

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Next.js production build generated 35/35 routes.
- Production server smoke test:
  - `/login` returned HTTP 200.
  - `/api/health` returned `{ "status": "ok" }`.

## Important deployment note

Do not upload `.env.local` to GitHub or place a Supabase service-role key in a `NEXT_PUBLIC_` variable.
Apply the migration and configure Supabase/Vercel before testing new registrations or password-reset emails.
