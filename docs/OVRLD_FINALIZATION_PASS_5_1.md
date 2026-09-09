# OVRLD Pass 5.1 — Quick Log + Food Hierarchy + Gain Plan Identity

## Quick Log is now a first-class logging path

The primary Quick Log action finalizes the workout session after at least one set is logged. It writes sets through the same `updateWorkoutSet` service used by Game Mode and finalizes through `finishWorkoutSession`, so completed Quick Log sessions enter the same completed workout history consumed by Progress, previous performance/Last Time, adherence, Gain reviews, history, and PR processing.

A secondary **Draft** action remains available when the user intentionally wants to leave the workout active and continue later.

Quick Log also adds:
- one-tap **Use last** per set;
- a compact saved confirmation;
- working-set volume feedback;
- direct return to Home after saving.

## Food logging hierarchy

Nutrition now prioritizes the action the user came to perform:
1. daily calories/protein progress;
2. visible manual food entry;
3. saved meals;
4. optional collapsed Premium AI entry point.

The Premium card no longer blocks the manual logging path visually.

## Gain plan identity

The recommended `Gain · Glutes + Legs` plan now carries a clear **Women-focused / موجّه للبنات** badge and a restrained dusty-blush visual hint. The app-wide identity remains neutral charcoal + muted emerald; blush is used only as a contextual audience cue for this plan.

## Verification

`verify:pass5` now covers Pass 5.1 behavior and visual hierarchy in addition to the existing Pass 5 checks.
