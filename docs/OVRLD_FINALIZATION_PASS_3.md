# OVRLD Finalization — Pass 3

Pass 3 applies the final product-flow architecture around the two main user intents: **Train** and **Log Data**.

## Home
- Home is reduced to the two core decisions: Train and Log Data.
- Log Data opens Food, Weight, and Measurements directly.
- Today's workout card is the primary CTA and resumes an active session when present.

## Workout execution
- Active Workout remains full-screen with no bottom navigation.
- Header shows workout identity, elapsed time, exercise/set progress, and one options entry point.
- Last-session values continue to auto-fill the current set.
- Current set rows, warm-up tagging, optional RIR/failure, undo, Do Later, Next Exercise, and a collapsed queue are supported.
- Rest timer includes 1m, 1:30, 2m, 3m, 5m, Custom, +30s, and End Rest.
- Rest timing is timestamp-based and persists in background; preferred rest duration is remembered per exercise.
- Optional screen wake lock is available from workout options.

## My Split
- Overview is the default surface; editing is a deliberate second step.
- This Week and Repeating Plan are differentiated.
- Day editing, workout selection, and exercise editing are progressively disclosed instead of stacked in one long page.
- Plan tools remain secondary.

## Global polish
- Bottom navigation highlights only the current route.
- Existing safe-area/mobile container system remains the shared layout source.
- English coverage was expanded for the new flow and localization map was kept duplicate-free.
- Service worker cache version bumped to v20.

No new database migration is required for this pass.

## Final execution safeguards

- Back/exit now opens a protected in-progress workout sheet with **Resume workout**, **End workout**, and **Exit without ending**.
- Workout haptics can be toggled independently and persist locally.
- Both logging paths use one primary **Complete Set** CTA.
- Warm-up sets stay out of PR and working-volume calculations.
