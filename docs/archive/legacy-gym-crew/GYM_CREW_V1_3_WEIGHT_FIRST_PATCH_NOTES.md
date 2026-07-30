# Gym Crew v1.3 — Weight-First Workout Logging

This release turns the active workout into a replacement for a notes app: the previous completed performance is loaded automatically, the member changes only what changed today, and each completed set is compared immediately.

## What changed

- Loads the latest completed performance for every exercise in the active session with one history pass.
- Displays the date of the last workout and the last exercise note.
- Pre-fills each unfinished set with the matching previous weight and reps as an editable suggestion.
- Does not mark suggested values as completed; the set only counts after the member taps the check button.
- Tapping the previous set line restores the old values at any time.
- Shows an immediate result after completion: matched, weight change, and/or rep change.
- Keeps the rest timer behavior after a completed set.
- Saves edited incomplete drafts when using **Save & leave** or **Finish workout**.
- Adds a completed-workout comparison summary: improved, matched, adjusted, and new-baseline exercises.
- Shows previous values beside the completed workout details.
- Keeps previous-performance loading useful offline through the existing local workout history.

## Data behavior

- Previous performance is matched by `exercise_id`, not the exercise name or split-day position.
- Only completed sets from the most recent completed session containing that exercise are used.
- New exercises show a first-baseline state.
- Extra sets beyond the previous workout remain blank rather than inventing a value.
- No Supabase migration is required for this release.

## Verification

Run:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Manual flow:

1. Complete a workout with known weights and reps.
2. Start the next workout containing the same exercises.
3. Confirm the old values are already shown in today's inputs.
4. Tap check without editing to repeat a set.
5. Increase a weight or rep count and confirm the difference badge appears.
6. Edit an unfinished set, choose **Save & leave**, reopen the workout, and confirm the draft remains.
7. Finish the workout and review the comparison summary.
