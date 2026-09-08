# OVRLD v2 — Product Direction

## Product sentence

**Your training plan in front of you, every set recorded with almost no friction, and your progress explained back to you.**

OVRLD is not primarily a social network and it is not a generic health dashboard. The product has two core jobs:

1. Make the user's training plan flexible and instantly usable in the gym.
2. Turn logged workouts into understandable progress over time.

Body-weight and measurement tracking is optional and only appears when it helps a user's goal. Crew/social competition remains a later layer.

## Mobile-first rule

The default mental model is a user holding a phone with one hand between sets. The web build must therefore behave like a native-feeling PWA first and a desktop web app second.

Primary UI rules:
- The next action is obvious without scrolling through dashboards.
- Weight/reps logging uses taps and remembered previous values before typing.
- Notes and advanced fields are optional and collapsed.
- Core controls are reachable with one thumb and have large tap targets.
- The active workout hides unrelated navigation.
- Desktop gets more space, not a different product hierarchy.

## Core hierarchy

### Home
1. Today's workout / resume active workout.
2. This week's flexible schedule.
3. Training progress snapshot.
4. Optional body-progress snapshot.
5. History shortcut.

### Plan
- User chooses training frequency/system.
- Days can be moved, swapped, converted to rest, or changed for one week without destroying the base plan.
- Plan import/manual/template all remain available.

### Gym mode
- One exercise at a time.
- Previous performance is visible at the decision point.
- Weight and reps are tap-first.
- Rest timer starts automatically after logging a set.
- Extra exercise, notes, reordering, and destructive actions are secondary.

### Progress
Training first:
- adherence
- exercise trends
- PRs
- workout volume
- streak/history

Optional body layer:
- current weight
- target weight/goal type
- measurement history
- weigh-in cadence
- body-fat/waist fields only when the user wants them

## Crew — phase 2

Crew is retained in the system but removed from primary navigation. Later it can provide:
- target/progress leaderboards
- challenges
- friends/crew activity
- opt-in sharing controls

It must never make the solo training workflow feel like a secondary mode.

## v2 foundation implemented in this branch

- Home reordered around today's workout, weekly plan, performance, and optional body tracking.
- Crew removed from primary navigation and moved under Account.
- New optional body-goal + body-measurement schema with RLS.
- New body progress screen with quick weigh-in controls, trend chart, target progress, cadence, and notification permission.
- PWA shortcut/offline cache updated for body tracking.
- Mobile bottom navigation keeps the workout action visually dominant.

## Phase 3 status — mobile experience

Implemented after the mobile-core pass:
- optional body-goal onboarding before personal plan setup,
- wider thumb-friendly week cards,
- current-week day swapping without changing the base split,
- final-set-aware gym flow and haptic feedback,
- due weigh-in prompt on Home,
- additional small-screen visual polish.

The product hierarchy stays unchanged: **training is primary, body tracking is optional, Crew is later**.
