# Phase 1 review and foundation changes

## Decisions fixed before feature implementation

1. `group_members` is the only source of truth for group membership.
2. Friday is the fixed `rest` split row. Additional personal rest days are
   stored only in `profiles.additional_rest_days`.
3. A split day uses `workoutType` as its single workout/rest discriminator.
4. IndexedDB rows are normalized. Session rows do not embed exercises and
   exercise rows do not embed sets.
5. Session, exercise, and set IDs are generated client-side for safe offline upserts.
6. Planned workouts are derived from the schedule; stored sessions begin at
   `in_progress`.

## Completed

- Initial Supabase migration applied to the linked cloud project.
- Generated database TypeScript types.
- Initial tables, constraints, indexes, profile trigger, group RPCs, default
  PPL rows, activity trigger, and RLS policies.
- TypeScript and production build verification after database integration.

## Still pending after Phase 1

- Offline queue draining and conflict resolution.
- Final streak and personal-record calculation rules.
- Exercise, split, workout, progress, and activity feature implementation.
