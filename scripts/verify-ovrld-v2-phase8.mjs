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
  "supabase/migrations/202609080004_gain_nutrition_v1.sql",
  "src/features/gain-mode/services/nutrition.service.ts",
  "src/features/gain-mode/components/GainNutritionPanel.tsx",
  "src/features/gain-mode/components/GainModeHubClient.tsx",
  "src/features/gain-mode/components/GainModeHomeCard.tsx",
  "src/features/gain-mode/components/GainModeProgressCard.tsx",
  "src/features/gain-mode/services/gain-mode.service.ts",
  "src/features/gain-mode/types.ts",
  "src/lib/supabase/types.ts",
  "src/app/(dashboard)/profile/page.tsx",
  "src/features/splits/components/SplitManager.tsx",
  "src/app/globals.css",
  "public/sw.js",
];
for (const file of files) assert.ok(exists(file), `Missing Phase 8 file: ${file}`);

for (const file of files.filter((file) => /\.(ts|tsx)$/.test(file))) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const migration = read("supabase/migrations/202609080004_gain_nutrition_v1.sql");
for (const token of ["gain_nutrition_entries", "calorie_target_kcal", "protein_target_grams", "enable row level security", "auth.uid() = user_id"]) {
  assert.ok(migration.includes(token), `Migration missing ${token}`);
}

const nutrition = read("src/features/gain-mode/services/nutrition.service.ts");
for (const token of ["fetchGainNutritionWeek", "addGainNutritionEntry", "deleteGainNutritionEntry", "saveGainNutritionTargets", "summarizeNutritionDay"]) {
  assert.ok(nutrition.includes(token), `Nutrition service missing ${token}`);
}

const gain = read("src/features/gain-mode/services/gain-mode.service.ts");
assert.match(gain, /estimateCalorieTarget/);
assert.match(gain, /10 \* weightKg \+ 6\.25 \* heightCm - 5 \* ageYears \+ sexConstant/);
assert.match(gain, /equationSex === "male" \? 5 : -161/);
assert.match(gain, /\+ 300/);
assert.match(gain, /estimateProteinTarget/);
assert.match(gain, /fetchGainNutritionDay/);
assert.match(gain, /nutritionAvailable/);

const panel = read("src/features/gain-mode/components/GainNutritionPanel.tsx");
for (const phrase of ["السعرات", "البروتين", "آخر 7 أيام", "أهداف الأكل"]) assert.ok(panel.includes(phrase));
assert.ok(panel.includes("سجّل أكلك") || panel.includes("GainAiFoodLogger") || panel.includes("إدخال أرقام يدويًا"));
assert.match(panel, /gc-progress-track/);
assert.match(panel, /gc-nutrition-week/);

const home = read("src/features/gain-mode/components/GainModeHomeCard.tsx");
assert.match(home, /todayNutrition/);
assert.match(home, /سجّل أكلك/);
assert.doesNotMatch(home, /شوفي الرحلة/);

const hub = read("src/features/gain-mode/components/GainModeHubClient.tsx");
assert.ok(/GainNutritionPanel/.test(hub) || hub.includes("/progress/gain/nutrition"), "Gain nutrition must remain accessible from Gain Mode.");
assert.match(hub, /gc-gain-dashboard/);
assert.match(hub, /المراجعة الحالية|GainReviewPreview/);

const progress = read("src/features/gain-mode/components/GainModeProgressCard.tsx");
for (const label of ["البداية", "الحالي", "الهدف"]) assert.ok(progress.includes(label));

const profile = read("src/app/(dashboard)/profile/page.tsx");
assert.match(profile, /LanguageSwitcher variant="row"/);
assert.match(profile, /ThemeSwitcher variant="row"/);

const split = read("src/features/splits/components/SplitManager.tsx");
assert.ok(/أدوات الخطة|Plan tools/.test(split), "Plan tools must remain available as a secondary action.");
assert.match(split, /بدّل اليوم مع يوم تاني/);

const css = read("src/app/globals.css");
for (const className of ["gc-gain-dashboard", "gc-nutrition-panel", "gc-progress-track", "gc-nutrition-week", "gc-gain-progress-link"]) {
  assert.ok(css.includes(`.${className}`), `Missing Phase 8 CSS class ${className}`);
}

const sw = read("public/sw.js");
assert.match(sw, /CACHE_VERSION = "v(?:1[2-9]|[2-9]\d+)"/);

console.table({
  phase: "8 — Gain Mode daily nutrition & clarity",
  daily: "calories + protein + food entries",
  week: "7-day nutrition signal",
  weight: "start · current · goal · recent trend",
  plan: "secondary tools collapsed",
  account: "language/theme compact rows",
  database: "1 new private nutrition migration",
});
console.log("\n[OK] OVRLD V2 Phase 8 contract passed.");
