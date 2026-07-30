# Phase 3 Implementation

This package completes the first three usable product phases on top of the Phase 2 authentication scaffold.

## Implemented

### Group and onboarding

- Join an existing group with its eight-character invite code.
- Group overview with invite-code copy feedback and member count.
- Member list with profile names and avatars.
- Owner, admin and member roles.
- Owners can promote members to admin, return admins to member, and remove non-owner members.
- Profile name editing.
- Avatar upload through the public `avatars` Supabase Storage bucket with owner-only write policies.

### Exercise library and split

- Seeded Push, Pull and Legs exercise library.
- Starter PPL exercises are added to existing groups and all newly created groups.
- Shared group split is editable by owners and admins.
- Personal split is cloned lazily from the group split.
- Friday remains a fixed rest day.
- Each profile can select up to two additional rest days.
- Add, remove and reorder exercises.
- Edit target sets and rep ranges.
- Reset a personal split to the current group split.

### Workout recording

- Today screen resolves the member's personal split and additional rest days.
- Start one active workout at a time.
- Split exercises and their target set counts are copied into the workout session atomically.
- Record weight, reps and completion for every set.
- Add and delete sets.
- Add an exercise for the current session only or permanently to the personal split.
- Exercise notes and overall workout notes.
- Stopwatch with pause, start and reset controls.
- Previous completed performance for each exercise.
- Finish workout and save its duration.
- Workout history and read-only workout details.

## Database migration

Apply:

```bash
npx supabase db push
```

The new migration is:

```text
supabase/migrations/202607140003_group_split_workouts.sql
```

It seeds exercises, backfills starter group splits, adds personal-split and workout RPC functions, adds member-role update rules, and creates the avatar Storage bucket and policies.

After applying it, regenerate database types to keep the generated file synchronized:

```bash
npx supabase gen types typescript --linked --schema public > src/lib/supabase/types.ts
```

The packaged `types.ts` already includes the function signatures required by this phase, so the project compiles before regeneration as well.

## Run

Create `.env.local` beside `package.json` using `.env.example`, then:

```bash
npm install
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npm run dev
```

## Verified

The delivered source passed:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Still intentionally pending

- Offline write queue and synchronization.
- Personal-record detection.
- Streak and adherence calculations wired to UI.
- Progress charts and body map.
- Group activity feed and challenges.
- Final visual design/localization pass.
