# OVRLD V2 — Phase 14: Recommended Gain Plan

Phase 14 turns the Gain training integration into an actionable plan system instead of a passive score.

## Recommended Gain · Glutes + Legs

The built-in four-day template uses a Saturday-starting week and keeps Thursday + Friday as fixed recovery days:

- Saturday — Lower A · Glutes + Quads
- Sunday — Upper · Maintenance + Shape
- Monday — Lower B · Glutes + Hamstrings
- Tuesday — Recovery
- Wednesday — Lower C · Shape + Volume
- Thursday — Recovery
- Friday — Recovery

The template ships with target sets and rep ranges, sets the Gain physique focus to `glutes_legs` when Gain Mode is already active, and is available both from the split setup chooser and from Gain Mode → Training.

## Flexibility without losing intent

- Weekly schedule changes are temporary; the base plan remains intact.
- Extra rest/day-off entries are allowed instead of being blocked by the old three-rest-days validator.
- Gain Mode reads the effective week and actual adherence.
- Exercise replacement is available from the base split editor and is restricted to alternatives with the same primary muscle, preserving the set/rep targets.

## Coaching guardrails

The training view keeps advice short and actionable: 1–2 RIR for most work sets, longer rest for compounds, warm-up guidance, sleep/nutrition reminders, and a pain/safety warning.

## Personal encouragement

Gain settings now include an optional private support name + note. The note is shown inside Gain Mode only for the profile owner and is not required for the training system.

## Database

Migrations: `202609090004_gain_recommended_plan_v1.sql` + final plan correction `202609090005_gain_recommended_plan_v2.sql`

It adds the optional private support fields, two missing catalog movements, the recommended-plan RPC, and removes the hard database block on three consecutive rest days so real-life schedule changes can be represented honestly.


## Finalization correction

The approved plan deliberately trains calves with 5 direct sets/week (3 Saturday + 2 Wednesday), and Monday Lower B uses hip adduction instead of the earlier kickback placeholder. The forward-only v2 migration updates the RPC for databases where Phase 14 v1 was already applied.
