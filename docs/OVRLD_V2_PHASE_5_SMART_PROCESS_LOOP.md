# OVRLD V2 — Phase 5: Smart Process Loop

Phase 5 turns the dashboard from a collection of stats into a daily decision surface. The product still treats the workout as the primary action, then explains the smallest useful next step in the user's process.

## Product loop

1. **Train today** — Today's workout stays first on Home.
2. **Read the process** — OVRLD combines weekly adherence, exercise momentum, and optional body tracking into one priority card.
3. **Act on one thing** — The card links to a weigh-in, an exercise trend, or the next workout instead of showing every metric at once.
4. **Keep the plan visible** — The flexible weekly plan remains one scroll below the process signal.

The process loop is deterministic. It does not call an AI model and it never changes the user's plan automatically.

## Priority rules

The Home priority card resolves signals in this order:

- A body goal with a missing/due weigh-in.
- A slipping or plateaued exercise.
- An incomplete weekly training loop.
- A clearly improving exercise.
- Collection of the first useful training baseline.
- Otherwise, a steady-state message that recommends staying consistent.

This ordering is intentionally conservative: a single noisy workout is not enough to tell the user to rewrite the program.

## Gym Mode progression hint

The quick set card now adds a small, optional progression hint based on the previous matching set and the plan's rep range:

- If the last set is below the top of the rep range, suggest one more rep at the same load.
- If the last set reached the top of the range, suggest a small load increase only if the set felt comfortable, then return to the bottom of the rep range.

The hint is framed as a suggestion, not a command. The user can always log what actually happened.

## Stale workout recovery

A long-abandoned `in_progress` session used to produce absurd timers such as 1000+ hours. Phase 5 treats an active session older than 18 hours as stale:

- The live timer renders `جلسة قديمة` instead of a huge duration.
- Gym Mode offers `كمّل من دلوقتي`.
- Resuming keeps all logged sets, moves the stale session onto today, and resets the active session clock to the current time.
- Finishing a still-stale session never writes the multi-day elapsed time as the workout duration.

No database migration is required for this behavior; the existing workout-session sync model already supports updating `started_at`.

## Database impact

**No new Phase 5 migration.**

Phase 5 depends on the Phase 3 migrations already applied for body progress and weekly schedule swapping:

- `202609080001_body_progress_v2.sql`
- `202609080002_week_schedule_swap_v2.sql`

## Main files

- `src/features/dashboard/components/SmartProcessLoop.tsx`
- `src/features/dashboard/services/process-loop.service.ts`
- `src/features/workouts/utils/session-time.ts`
- `src/features/workouts/components/SessionElapsedTime.tsx`
- `src/features/workouts/components/ActiveWorkoutClient.tsx`
- `src/features/workouts/services/workout-session.service.ts`
