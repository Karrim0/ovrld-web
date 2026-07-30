# Phase 4 + 5 — Offline Workouts and Personal Progress

This phase makes the workout experience local-first and makes personal training data the product's primary source of value. Group features remain optional social context.

## Offline-first workout recording

Workout sessions, workout exercises and sets are normalized in IndexedDB through Dexie. Every edit is written locally before any network request is attempted.

Supported offline actions:

- Start a workout from the cached personal split.
- Continue the active workout after closing or refreshing the application.
- Edit weight, reps, completion and warm-up state.
- Add or delete sets.
- Add or remove exercises for the current session.
- Save exercise notes and session notes.
- Persist and restore the workout stopwatch.
- Finish a workout without connectivity.
- Open locally cached workout history and details.

## Synchronization

Each local mutation is added to an ordered sync queue. Client-generated UUIDs make retries idempotent.

The queue preserves this dependency order:

1. Workout session creation.
2. Workout exercises.
3. Workout sets.
4. Later updates, including session completion.

Synchronization runs when connectivity returns, periodically while online, and when the user manually retries. A failed parent mutation stops the current drain so dependent children are not sent first.

The interface exposes pending, syncing, synced and failed states. Supabase Row Level Security remains the final authorization boundary.

## Conflict behavior

Local edits are never silently discarded. The current strategy is conservative last-write-wins using `updatedAt`, while preserving newer completed local sets. The queue can be retried after authentication or connectivity errors.

## Personal and solo training

A user can create a private one-person training workspace from onboarding. It receives the same starter PPL split and supports the complete workout, history, records, adherence and streak experience without requiring other members.

Internally, a private workspace reuses the group-backed data model so workout foreign keys, RLS and split logic remain consistent. The `is_personal` field keeps private workspaces out of invite-code joining.

## Progress calculations

Progress is calculated from the athlete's own completed sessions, including unsynced local sessions:

- Weekly and monthly adherence based on the personal split and personal rest days.
- Current and longest completed-week streak.
- Total and monthly training volume.
- Total and average workout duration.
- Session counts for the week, month and all time.
- Completed-set distribution by primary muscle.
- Per-exercise max load, best set volume and estimated one-rep max.
- Session-by-session exercise history.
- Best reps at every previously used weight.

Make-up sessions use their planned `scheduledDate`, which keeps adherence accurate even when the workout is performed on another calendar day.

## Personal records

Three durable record types are stored in Supabase:

- Maximum working-set weight.
- Maximum repetitions in a working set.
- Maximum single-set volume (`weight × reps`).

Database triggers recalculate affected exercise records across the athlete's complete history after session completion and completed-set changes. The application also calculates records from local history, so new offline records are visible before synchronization.

## Service worker and private cache

The service worker caches application assets and uses a network-first strategy for authenticated pages. API and auth routes are never cached. The private page cache is cleared on logout.

## Database migration

Apply:

```bash
npx supabase db push
```

Migration:

```text
supabase/migrations/202607140004_offline_progress_solo.sql
```

Then regenerate database types:

```bash
npx supabase gen types typescript --linked --schema public > src/lib/supabase/types.ts
```

## Verification

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Recommended manual tests:

1. Load the personal split online once.
2. Start a workout and change several sets.
3. Disable the network and continue editing.
4. Refresh the app and continue the active session.
5. Finish the session while offline.
6. Restore connectivity and verify the sync indicator reaches `Synced`.
7. Open Progress, Records and the exercise detail page.
8. Repeat the flow in a private solo workspace.
