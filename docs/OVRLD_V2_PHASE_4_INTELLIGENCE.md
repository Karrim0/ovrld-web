# OVRLD V2 — Phase 4: Process Intelligence

Phase 4 turns the data that OVRLD already records into useful feedback without pretending that one workout or one weigh-in can prove whether a program is good or bad.

## Product rule

The app must answer two questions quickly:

1. **Is my performance moving?**
2. **What does my plan actually emphasize?**

The answers are deterministic and explainable. Phase 4 does **not** call an LLM, auto-rewrite the user's program, or present a medical/nutrition verdict.

## Progress intelligence

`progress-intelligence.service.ts` groups completed sessions by exercise and compares recent performance with the previous window.

Signals:

- improving
- steady
- plateau candidate
- slipping / needs attention
- new / not enough history

The strength signal uses estimated 1RM from completed working sets. The UI deliberately calls these **signals, not judgments** because a short-term drop can come from normal workout-to-workout variation.

Body-goal context is optional. When body tracking exists, OVRLD can close the loop between gym performance and the direction of repeated weight measurements. It never claims the workout plan alone causes scale change.

## Plan audit

`plan-audit.service.ts` reads the personal base split and produces an approximate map of:

- training/rest days
- planned sets
- exercise slots
- muscle coverage
- exposure days per muscle
- approximate weighted load per muscle

Primary-muscle sets count fully. Secondary-muscle sets receive a smaller weight to make the map useful without presenting them as identical stimulus.

The audit flags visible gaps and unusually concentrated distributions. It does not silently edit the plan.

## Mobile UX

The intelligence panels are built for the same phone-first rule as Gym Mode:

- no spreadsheet view
- compact status chips
- short Arabic explanations
- direct links to exercise detail
- the plan audit sits inside **My Plan**, not in a separate admin-style analytics area

## No database migration

Phase 4 requires no new database tables. It uses existing workout history, split data, and the optional body-progress tables introduced earlier.
