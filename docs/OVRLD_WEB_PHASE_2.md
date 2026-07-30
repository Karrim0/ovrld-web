# OVRLD Web Phase 2 — Functional Repair and Cross-Platform Sync

## Scope

This phase repairs the web flows that can diverge from OVRLD Mobile while keeping the current interface intact.

## Repairs

- Login now honors a safe relative `next` path from protected routes.
- Workout reads refresh from Supabase while online instead of returning an indefinitely stale IndexedDB copy.
- Pending local mutations remain authoritative until they sync, preventing a remote refresh from deleting offline work.
- A workout completed or cancelled on another client no longer remains as a stale active workout on the web.
- Active Gym Mode refreshes when the tab regains focus, becomes visible, or reconnects.
- Sync rows left in `processing` after an interrupted tab are recovered automatically.
- Failed mutations use capped exponential retry backoff instead of retrying every interval forever.
- Workout exercise target-rep ranges and workout-set notes are preserved across IndexedDB, Supabase, and the sync API.
- Legacy IndexedDB rows are hydrated with safe target-rep and note defaults.

## Database safety

This phase does not add or apply a production migration. It consumes fields already present in the shared OVRLD backend. Do not run `supabase db push` for this patch.

## Verification

```bash
npm run verify:phase2
npm run typecheck
npm run lint
npm run build
```

On Windows:

```bat
VERIFY_OVRLD_WEB_PHASE2.cmd
```

## Manual cross-platform checks

1. Start a workout on the web, log a set offline, reconnect, and confirm it appears once on mobile.
2. Complete a workout on mobile, return to the web tab, and confirm the stale active session disappears.
3. Open a protected web route while signed out, sign in, and confirm the requested route resumes.
4. Close the tab during sync, reopen after two minutes, and confirm the queue recovers.
