# OVRLD Finalization Pass 5 — Home Restore + Focused Gym Mode

## Goal
Restore the stronger, organized Home hierarchy, add a fast numbers-only workout logging path, and reduce Game Mode to the few decisions a user needs during a set.

## Home
The dashboard is back to the richer hierarchy:

1. **Today’s Workout** — primary action.
2. **Quick add** — food, body weight, measurements.
3. **Gain Mode snapshot** — compact process context.
4. **This week** — compact weekly split overview.

The Today card now offers two workout-entry paths:

- **Start workout** → guided Game Mode.
- **Quick log** → numbers-only weight/reps logging.

## Quick workout logging
New route: `/workout/quick?session=...`

Purpose: for users who do not want Game Mode and only need to enter the numbers and leave.

- All exercises and sets are shown in one compact form.
- Weight and reps are editable directly.
- Previous-session values are shown as input placeholders/reference.
- A set with reps is saved as completed.
- **Save & exit** saves changes and leaves the workout active.
- **Finish** saves changes and completes the workout.
- Main navigation and the rest-timer launcher are hidden in this mode.

## Game Mode simplification
The guided workout screen is now set-first.

### Main screen keeps
- workout title + elapsed time
- overall progress bar
- current exercise
- target reps
- concise last-time numbers
- concise overload suggestion
- compact set tabs
- large weight/reps controls
- Complete Set
- Do Later
- rest timer after completion
- Undo for the latest set

### Moved out of the main flow
- warm-up toggle
- RIR / Failure
- exercise notes
- exercise queue editing
- add/remove exercise
- keep-awake and feedback settings

These remain available under Workout Options.

### Removed from the primary flow
- dedicated set stopwatch screen
- large progression suggestion card
- next-exercise preview card
- duplicated collapsed queue
- persistent previous-note row
- full post-set screen after every set

After a normal set, Game Mode automatically prepares the next set. The post state is only used when an exercise is complete.

## Visual identity cleanup
The base theme was shifted from green-tinted surfaces to a neutral visual system:

- Dark background: charcoal (`#0d0f12`)
- Dark surfaces: neutral graphite
- Accent: muted sage/emerald (`#76a98f`)
- Light theme: neutral off-white/gray
- Green is now an action/progress/success accent instead of the color of the whole screen.

Home and Game Mode use tokenized accent colors instead of neon hard-coded emerald values.

## PWA
- Cache bumped to `v22`.
- `/workout/quick` added to the offline navigation route set.

## Verification
Static verifier status in the delivery environment:

- Phase 1–14 verifiers: passed
- Pass 2: passed
- Pass 3: passed
- Pass 4: passed
- Pass 5: **28/28 passed**
- TypeScript parser sweep: 305 TS/TSX files, 0 syntax-error files

The delivery environment does not contain a complete installable `node_modules`, so final `typecheck`, `lint`, and production `build` must be run on the local project after replacement.
