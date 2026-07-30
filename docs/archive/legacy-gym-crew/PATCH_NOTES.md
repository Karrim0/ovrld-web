# Gym Crew — Phase 4 + 5 Patch

This overlay patch adds local-first offline workouts, ordered Supabase synchronization, solo/private training mode, personal records, adherence, streaks and detailed exercise progress.

## Apply safely

1. Start from the latest merged `main` branch that already contains Phase 3.
2. Create a feature branch:

```bash
git checkout main
git pull origin main
git checkout -b feature/offline-progress
```

3. Copy everything inside this patch folder into the project root and choose **Replace files in the destination**. Do not copy the outer patch folder itself.
4. Verify that this migration exists:

```text
supabase/migrations/202607140004_offline_progress_solo.sql
```

5. Link Supabase if this clone/folder is not currently linked:

```bash
npx supabase link --project-ref mbzbjmqxknkjvrnoibvt
```

6. Apply the migration and regenerate types:

```bash
npx supabase db push
npx supabase gen types typescript --linked --schema public > src/lib/supabase/types.ts
```

7. Verify the project:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

No new npm dependency is required by this patch.

## Manual test checklist

- Open the personal split while online once, then start a workout.
- Change weights/reps and refresh; the active session and stopwatch should restore.
- Turn the network off, add/edit/delete sets, write notes and finish the workout.
- Restore the network and confirm the sync indicator reaches `Synced`.
- Verify the session appears in Workout History and Supabase.
- Open Progress, Personal Records and an Exercise Details page.
- Register a fresh account and test **Continue as a solo athlete**.
- Start a make-up workout and choose its planned date; adherence should use that date.

## Important behavior

- Local IndexedDB data is written before network synchronization.
- Client-generated UUIDs make retries idempotent.
- Group features are optional; personal progress works in a one-person private workspace.
- API/auth responses are not cached by the service worker. Private route cache is cleared on logout.

See `docs/PHASE_4_5_OFFLINE_PROGRESS.md` for implementation details.
