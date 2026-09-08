# OVRLD V2 — Phase 8: Gain Mode Daily Nutrition & Clarity

## Product goal

Phase 8 turns Gain Mode from a mostly descriptive goal page into a daily operating loop. OVRLD remains a general gym tracker; this nutrition layer only becomes active for users who enable Gain Mode.

The UI rule for this phase is **numbers first, copy second**. The Gain Mode hub is ordered as:

1. start / current / goal weight and recent trend
2. today's calories and protein
3. quick food entry
4. last-seven-days nutrition signal
5. one current review / next action
6. workout, weight and settings links

## Daily nutrition model

Each food log entry stores a label, calories and protein. A user can use any external food estimator (including ChatGPT) and copy the estimated numbers into OVRLD; Phase 8 deliberately does not claim food recognition or exact calorie estimation.

Daily totals are compared with two targets:

- **Calories:** user override when present; otherwise a starting estimate.
- **Protein:** user override when present; otherwise `1.6 g/kg/day` from current body weight.

### Starting calorie estimate

The automatic starting target is intentionally marked as an estimate:

1. Female Mifflin–St Jeor resting energy equation: `10W + 6.25H - 5A - 161`.
2. Broad activity multiplier from the user's Gain Mode activity choice.
3. Add a conservative `+300 kcal/day` starting surplus.
4. Round to the nearest 50 kcal.

The target is editable. The application does not call the result a prescription or guaranteed maintenance value.

## Why conservative

The NHS describes gradual weight gain and suggests adults can try adding roughly 300–500 kcal/day. Larger surpluses are not assumed to produce proportionally more muscle, so OVRLD starts conservatively and relies on weight and training trends before suggesting changes.

## Protein reference

The default protein reference remains `1.6 g/kg/day`, consistent with the breakpoint found in the Morton et al. resistance-training meta-analysis. It is a practical reference, not a medical requirement.

## Database

Migration: `202609080004_gain_nutrition_v1.sql`

Adds optional target overrides to `gain_mode_profiles` and a private `gain_nutrition_entries` table protected with RLS.

## UX cleanup included

- Gain Mode progress summary now explicitly labels **start / current / goal**.
- Home Gain Mode card prioritizes calories, protein and current weight.
- Plan setup/import/audit are grouped under one secondary `Plan tools` disclosure.
- Week-day swapping is secondary instead of dominating the day editor.
- Language and appearance controls are compact account rows instead of large settings panels.

## Safety boundaries

OVRLD does not diagnose causes of low weight, eating disorders, menstrual changes, GI symptoms or other medical conditions. Existing Gain Mode safety copy remains in onboarding/settings. Sudden or unexplained weight loss should be assessed clinically rather than handled by automatic calorie escalation.

## Science references

- NHS. *Healthy ways to gain weight.* Gradual gain and around 300–500 additional kcal/day as a practical adult starting suggestion.
- Mifflin MD et al. *A new predictive equation for resting energy expenditure in healthy individuals.* Am J Clin Nutr. 1990.
- Morton RW et al. *Protein supplementation and resistance training-induced gains in muscle mass and strength.* Br J Sports Med. 2018.
- Helms ER et al. *Effect of Small and Large Energy Surpluses on Strength, Muscle, and Skinfold Thickness in Resistance-Trained Individuals.* 2023.
