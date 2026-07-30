# Gym Crew v1.2 — Gym-first UX patch

This patch restructures the product around the path a member actually follows in the gym:

`My split → Today's workout → Log sets → Finish → Progress / Crew`

## Main product changes

- Replaces **More** with a dedicated **Crew** navigation tab.
- Uses one stable bottom navigation: Home, My split, Workout, Crew, Progress.
- Moves Profile and settings to the header avatar.
- Removes duplicated History, Records and Body map cards from Home.
- Rebuilds Home into four clear areas: weekly split, today's workout, progress snapshot and crew entry.
- Hides normal sync noise; sync status appears only while offline, pending, syncing or failed.

## Flexible split logic

- Friday is no longer forced as a rest day.
- Every weekday can be changed between training and recovery.
- Rest state is stored directly on `split_days.workout_type`.
- Existing exercises stay saved underneath a rest day and return when the day becomes trainable again.
- Legacy `profiles.additional_rest_days` selections are migrated into personal split days and then cleared.
- The split editor now focuses on one selected day instead of expanding the whole week at once.
- Exercise deletion and ordering actions are moved into a quieter overflow menu.

## Workout flow

- Missing plan data is no longer incorrectly displayed as a rest day.
- “Train anyway” opens a real alternate-day starter instead of linking back to the same screen.
- Alternate training on a recovery day is explained as an extra workout.
- Active workout set entry is more compact and designed for one-handed gym use.
- Weight and reps are only saved once when the set action is pressed; blur no longer creates duplicate mutations.
- Set values are validated before completion.
- Completing a set automatically starts the rest timer.
- The rest timer is scoped to the active workout session and is cleared on finish or discard.
- Adds explicit **Save & leave**, **Finish workout** and **Discard workout** flows.
- Protects the database with one active workout per user.

## Progress, offline and safety

- Adherence now derives rest days from the personal split only.
- Crew adherence ignores extra sessions logged on recovery days.
- Progress preview distinguishes loading and error states instead of showing an endless skeleton.
- Logout clears workout sessions, queue entries, cached split/profile/exercises and Gym Crew localStorage data.
- App version moves from `1.1.0` to `1.2.0`.

## Apply

From the project root:

```bash
git apply --check gym-crew-v1.2-gym-first-ux.patch
git apply gym-crew-v1.2-gym-first-ux.patch
npm ci
```

Apply the new Supabase migration:

```bash
npx supabase db push
```

Then verify:

```bash
npm run typecheck
npm run lint
npm run build
```

## New migration

`supabase/migrations/202607150008_flexible_schedule_and_workout_safety.sql`

Do not deploy the frontend before this migration is applied, because the old database function still rejects Friday training and non-Friday rest days.
