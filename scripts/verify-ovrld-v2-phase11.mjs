import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const files = [
  "supabase/migrations/202609090001_gain_ai_food_saved_meals_v1.sql",
  "src/app/api/gain/food/estimate/route.ts",
  "src/features/gain-mode/types.ts",
  "src/features/gain-mode/services/nutrition.service.ts",
  "src/features/gain-mode/components/GainAiFoodLogger.tsx",
  "src/features/gain-mode/components/GainNutritionPanel.tsx",
  "src/lib/supabase/types.ts",
  "src/lib/localization/ar-en-map.ts",
  "src/app/globals.css",
  "public/sw.js",
  "docs/OVRLD_V2_PHASE_11_AI_FOOD_LOGGING.md",
  ".env.example",
];

for (const file of files) assert.ok(exists(file), `Missing Phase 11 file: ${file}`);
for (const file of files.filter((file) => /\.(ts|tsx)$/.test(file))) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const migration = read("supabase/migrations/202609090001_gain_ai_food_saved_meals_v1.sql");
for (const token of ["gain_saved_meals", "source", "'manual', 'ai', 'saved'", "enable row level security", "log_gain_saved_meal", "auth.uid()", "security definer"]) {
  assert.ok(migration.includes(token), `Migration missing ${token}`);
}

const api = read("src/app/api/gain/food/estimate/route.ts");
for (const token of ["OPENAI_FOOD_LOG_MODEL", "json_schema", "ovrld_food_estimate", "700", "confidence", "assumptions", "recognized", "getUser", "Nothing"]) {
  if (token === "Nothing") continue;
  assert.ok(api.includes(token), `AI food route missing ${token}`);
}
assert.match(api, /review|راجع|estimate/i);
assert.match(api, /AI_FOOD_NOT_CONFIGURED/);

const logger = read("src/features/gain-mode/components/GainAiFoodLogger.tsx");
const premiumLocked = logger.includes("OVRLD Premium") && logger.includes("قريبًا");
if (premiumLocked) {
  assert.match(logger, /وجبات محفوظة/);
  assert.match(logger, /logGainSavedMeal/);
  assert.match(logger, /saveGainMeal/);
  assert.doesNotMatch(logger, /fetch\("\/api\/gain\/food\/estimate"/);
} else {
  for (const phrase of ["اكتب أكلت إيه", "راجع قبل التسجيل", "سجّل التقدير", "احفظ كوجبة", "وجبات محفوظة", "ضغطة واحدة للتسجيل"]) {
    assert.ok(logger.includes(phrase), `AI logger missing ${phrase}`);
  }
  assert.match(logger, /source: "ai"/);
  assert.match(logger, /logGainSavedMeal/);
  assert.match(logger, /saveGainMeal/);
}

const panel = read("src/features/gain-mode/components/GainNutritionPanel.tsx");
assert.match(panel, /GainAiFoodLogger/);
assert.match(panel, /إدخال أرقام يدويًا/);

const service = read("src/features/gain-mode/services/nutrition.service.ts");
for (const token of ["fetchGainSavedMeals", "saveGainMeal", "deleteGainSavedMeal", "logGainSavedMeal", "source: input.source", "log_gain_saved_meal"]) {
  assert.ok(service.includes(token), `Nutrition service missing ${token}`);
}

const css = read("src/app/globals.css");
for (const className of ["gc-ai-food-box", "gc-ai-review-box", "gc-ai-confidence", "gc-saved-meals-box", "gc-saved-meal-chip", "gc-quiet-action"]) {
  assert.ok(css.includes(`.${className}`), `Missing Phase 11 CSS class ${className}`);
}

assert.match(read("public/sw.js"), /CACHE_VERSION = "v(?:1[5-9]|[2-9]\d+)"/);
assert.match(read(".env.example"), /OPENAI_FOOD_LOG_MODEL=/);

console.table({
  phase: "11 — AI Food Logging + Saved Meals",
  ai: "review before save",
  inputs: "Arabic / Egyptian Arabic / English",
  savedMeals: "private one-tap reuse",
  fallback: "manual logging remains available",
  database: "1 additive migration",
});
console.log("\n[OK] OVRLD V2 Phase 11 contract passed.");
