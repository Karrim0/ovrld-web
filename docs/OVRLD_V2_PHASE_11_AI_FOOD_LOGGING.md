# OVRLD V2 — Phase 11: AI Food Logging + Saved Meals

Phase 11 makes daily nutrition logging materially faster without turning AI estimates into hidden truth.

## Product contract

- Gain Mode accepts a natural-language meal description in Arabic, Egyptian Arabic or English.
- AI returns an approximate calorie/protein estimate with item-level breakdown, assumptions and a confidence label.
- Nothing from AI is written to the nutrition log automatically.
- The user reviews and can edit the label, calories and protein before pressing **Log estimate**.
- If AI is unavailable or not configured, manual calorie/protein logging continues to work.
- Repeated meals can be saved privately and logged later with one tap.
- Saved meals are user-owned, protected by RLS, and never social/shared.
- AI raw food text is not persisted by Phase 11; only the user-approved nutrition entry is saved.

## Main surface

`/progress/gain` → Nutrition

The order is:

1. Calories/protein status for today.
2. Natural-language AI food logger.
3. Review-before-save estimate.
4. Saved meals for one-tap reuse.
5. Manual numeric entry as a secondary fallback.
6. Today history + 7-day status + nutrition target settings.

## AI route

`POST /api/gain/food/estimate`

- Authenticated users only.
- Maximum description length: 700 characters.
- Structured JSON response.
- Model configured with `OPENAI_FOOD_LOG_MODEL`; falls back to `OPENAI_PLAN_IMPORT_MODEL`, then `gpt-5.6-luna`.
- The route estimates only calories and protein because those are the nutrition signals Gain Mode currently uses.

## Database

Migration: `202609090001_gain_ai_food_saved_meals_v1.sql`

Adds:

- `source` to `gain_nutrition_entries` (`manual`, `ai`, `saved`).
- `gain_saved_meals` with private per-user RLS.
- `log_gain_saved_meal(...)` security-definer RPC that validates ownership through `auth.uid()`, logs the meal, and updates reuse statistics atomically.

## Safety / trust boundary

Food estimates can be wrong because serving size, brands, recipes and cooking methods vary. OVRLD therefore treats the AI result as a draft, labels uncertainty, shows assumptions, and requires explicit user review before storage.
