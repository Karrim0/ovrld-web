# Phase 6 — Gym Mode and Personal Training

This phase makes the mobile workout experience the primary product surface.
The athlete sees one exercise at a time, records two working sets quickly,
and can use an independent rest timer from any authenticated screen.

## Product decisions

- The app defaults to **two working sets** per exercise.
- The important timer is the **rest timer**, with 3, 4, and 5 minute presets.
- Whole-session duration is tracked automatically from the session start time.
- There is no timer per individual exercise.
- Personal workout data and personal splits remain the source of truth.
- Group plans are optional starting templates, not restrictions.

## Gym Mode

The active workout page now includes:

- One focused exercise at a time.
- Large weight and rep inputs for mobile use.
- Previous-set context and one-tap copy of the last session.
- Set and exercise progress.
- Previous/next exercise navigation.
- Session and exercise notes.
- Session-only or permanent exercise additions.
- Custom exercises with an athlete-defined name.
- Automatic local/offline saving inherited from Phase 4.
- Automatic session duration calculation when finishing.

## Rest timer

The rest timer is app-wide and independent from workout sessions.

- 3, 4, and 5 minute presets.
- Start, pause, reset, plus/minus 30 seconds.
- Persists across navigation and refreshes.
- Uses an end timestamp so browser throttling does not lose time.
- Vibrates on supported mobile devices when rest is complete.

## Personal split improvements

Athletes can now:

- Rename any non-Friday training day.
- Change a day between Push, Pull, Legs, and Custom.
- Add exercises from the shared library.
- Create exercises with their own names.
- Pick the primary muscle for accurate future body-map analytics.
- Edit sets and rep targets.
- Reorder or remove exercises.
- Clear an entire day.
- Keep up to two additional rest days without deleting the saved plan.

Friday remains the fixed rest day.
