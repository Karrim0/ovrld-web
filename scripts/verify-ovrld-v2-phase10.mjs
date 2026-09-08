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
  "supabase/migrations/202609080006_gain_reviews_adaptive_v1.sql",
  "src/features/gain-mode/types.ts",
  "src/features/gain-mode/services/review.service.ts",
  "src/features/gain-mode/services/nutrition.service.ts",
  "src/features/gain-mode/components/GainReviewPreview.tsx",
  "src/features/gain-mode/components/GainReviewClient.tsx",
  "src/features/gain-mode/components/GainModeHubClient.tsx",
  "src/app/(dashboard)/progress/gain/review/page.tsx",
  "src/lib/supabase/types.ts",
  "src/lib/localization/ar-en-map.ts",
  "src/lib/localization/runtime.ts",
  "src/app/globals.css",
  "public/sw.js",
  "docs/OVRLD_V2_PHASE_10_ADAPTIVE_REVIEWS.md",
];

for (const file of files) assert.ok(exists(file), `Missing Phase 10 file: ${file}`);
for (const file of files.filter((file) => /\.(ts|tsx)$/.test(file))) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const migration = read("supabase/migrations/202609080006_gain_reviews_adaptive_v1.sql");
for (const token of ["gain_calorie_adjustments", "apply_gain_calorie_adjustment", "auth.uid()", "adaptive_review", "manual", "enable row level security"]) {
  assert.ok(migration.includes(token), `Migration missing ${token}`);
}

const reviewService = read("src/features/gain-mode/services/review.service.ts");
for (const token of ["fetchGainReviewSnapshot", "fetchGainCalorieAdjustments", "applyGainCalorieAdjustment", "daysLogged < 5", "< 0.9", "+ 100", "14 - daysSince", "0.75", "0.1"]) {
  assert.ok(reviewService.includes(token), `Review service missing ${token}`);
}
assert.match(reviewService, /state: "suggest"/);
assert.match(reviewService, /canApply: nextTarget > calorieTargetKcal/);

const client = read("src/features/gain-mode/components/GainReviewClient.tsx");
for (const phrase of ["قرار الأسبوع", "آخر 7 أيام مكتملة", "آخر 28 يوم", "طبّقي التعديل", "تعديلات السعرات", "OVRLD يقترح فقط"]) {
  assert.ok(client.includes(phrase), `Review client missing ${phrase}`);
}

const preview = read("src/features/gain-mode/components/GainReviewPreview.tsx");
assert.match(preview, /مراجعة الأسبوع/);
assert.match(preview, /progress\/gain\/review/);

const nutrition = read("src/features/gain-mode/services/nutrition.service.ts");
assert.match(nutrition, /adjustment_source: "manual"/);
assert.match(nutrition, /apply_gain_calorie_adjustment/);

const hub = read("src/features/gain-mode/components/GainModeHubClient.tsx");
assert.match(hub, /GainReviewPreview/);

const css = read("src/app/globals.css");
for (const className of ["gc-review-decision", "gc-review-section", "gc-review-metric-grid", "gc-calorie-change", "gc-inline-success"]) {
  assert.ok(css.includes(`.${className}`), `Missing Phase 10 CSS class ${className}`);
}
assert.match(read("public/sw.js"), /CACHE_VERSION = "v(?:1[4-9]|[2-9]\d+)"/);

console.table({
  phase: "10 — Adaptive Gain Reviews",
  weekly: "7 completed days",
  monthly: "28-day summary",
  adaptive: "explicit +100 kcal suggestion",
  cooldown: "14 days",
  audit: "manual + adaptive numeric target changes",
  database: "1 additive migration",
});
console.log("\n[OK] OVRLD V2 Phase 10 contract passed.");
