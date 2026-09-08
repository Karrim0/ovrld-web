# OVRLD V2 — Phase 9: Body Measurements & Body Progress

Phase 9 turns body progress into a real part of Gain Mode without making daily body-checking noisy.

## Product rules

- Weight remains the frequent trend signal.
- Circumference measurements are a separate, slower check-in (default: every 28 days).
- Core measurements: waist, hips, chest, thigh and upper arm.
- Optional measurements: calf, neck and body-fat estimate.
- Measurement changes are shown neutrally; a larger/smaller circumference is not automatically labelled good or bad.
- The body screen is split into **Weight** and **Measurements** so the UI stays focused.
- Gain Mode surfaces a compact measurement summary and links directly to the measurement check-in.

## Database

Migration: `202609080005_body_measurements_v1.sql`

It adds circumference columns to `body_measurements` and a separate `body_measurement_interval_days` cadence to `user_body_goals`.

No progress photos are stored in this phase. Photos remain a later, privacy-sensitive feature.
