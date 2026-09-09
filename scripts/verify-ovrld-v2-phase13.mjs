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
  "supabase/migrations/202609090003_gain_mode_architecture_v1.sql",
  "src/features/gain-mode/components/GainModeHubClient.tsx",
  "src/features/gain-mode/components/GainNutritionPageClient.tsx",
  "src/features/gain-mode/components/GainTrainingIntegrationClient.tsx",
  "src/features/gain-mode/components/GainHistoryClient.tsx",
  "src/features/gain-mode/components/GainAiFoodLogger.tsx",
  "src/features/gain-mode/services/history.service.ts",
  "src/features/gain-mode/services/gain-mode.service.ts",
  "src/features/body-progress/components/BodyShapeOverview.tsx",
  "src/features/body-progress/components/BodyProgressClient.tsx",
  "src/app/(dashboard)/progress/gain/nutrition/page.tsx",
  "src/app/(dashboard)/progress/gain/training/page.tsx",
  "src/app/(dashboard)/progress/gain/history/page.tsx",
  "src/lib/supabase/types.ts",
  "src/lib/localization/ar-en-map.ts",
  "src/app/globals.css",
  "public/sw.js",
  "package.json",
  ".github/workflows/ovrld-web-ci.yml",
  "VERIFY_OVRLD_WEB_FINAL.cmd",
  "README.md",
  "docs/OVRLD_V2_PHASE_13_GAIN_ARCHITECTURE.md",
];

for (const file of files) assert.ok(exists(file), `Missing Phase 13 file: ${file}`);
for (const file of files.filter((file) => /\.(ts|tsx|mts)$/.test(file))) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const migration = read("supabase/migrations/202609090003_gain_mode_architecture_v1.sql");
for (const token of ["physique_focus", "balanced", "lower_body", "glutes_legs", "check"]) assert.ok(migration.includes(token), `Migration missing ${token}`);

const hub = read("src/features/gain-mode/components/GainModeHubClient.tsx");
for (const href of ["/progress/gain/nutrition", "/progress/body", "/progress/gain/training", "/progress/gain/history"]) assert.ok(hub.includes(href), `Gain hub missing ${href}`);
assert.doesNotMatch(hub, /<GainNutritionPanel/);
assert.doesNotMatch(hub, /<GainBodyMeasurementsCard/);

const ai = read("src/features/gain-mode/components/GainAiFoodLogger.tsx");
for (const token of ["Premium", "قريبًا", "التسجيل اليدوي", "وجبات محفوظة"]) assert.ok(ai.includes(token), `Premium AI lock missing ${token}`);
assert.doesNotMatch(ai, /fetch\("\/api\/gain\/food\/estimate"/);

const body = read("src/features/body-progress/components/BodyShapeOverview.tsx");
for (const token of ["خريطة القياسات", "MeasurementTrend", "waistCm", "hipsCm", "chestCm", "thighCm"]) assert.ok(body.includes(token), `Body visual missing ${token}`);

const history = read("src/features/gain-mode/services/history.service.ts");
for (const token of ["fetchGainNutritionRange", "fetchBodyProgress", "fetchWorkoutHistory", "GainHistoryEvent"]) assert.ok(history.includes(token), `History integration missing ${token}`);

const gain = read("src/features/gain-mode/services/gain-mode.service.ts");
for (const token of ["physiqueFocus", "buildGainPlanCompatibility", "lowerBodyShare", "priorityLoads", "maintenanceLoads"]) assert.ok(gain.includes(token), `Training integration missing ${token}`);

const planAudit = read("src/features/splits/services/plan-audit.service.ts");
assert.match(planAudit, /item\.targetSets \* 0\.5/);


const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts.check, "npm run phase13:check");
assert.ok(packageJson.scripts["phase13:check"]?.includes("verify:phase13"));
assert.match(read(".github/workflows/ovrld-web-ci.yml"), /npm run phase13:check/);
assert.match(read("VERIFY_OVRLD_WEB_FINAL.cmd"), /phase13:check/);
assert.match(read("README.md"), /Phase 13: Gain Architecture Cleanup/);

const localization = read("src/lib/localization/ar-en-map.ts");
for (const token of ["Premium · قريبًا", "خريطة القياسات", "سجل الرحلة", "توافق الجدول ·", "تركيز الشكل"]) {
  assert.ok(localization.includes(token), `Phase 13 localization missing ${token}`);
}

const css = read("src/app/globals.css");
for (const className of ["gc-gain-section-grid", "gc-ai-premium-lock", "gc-gain-plan-score", "gc-history-event", "gc-shape-layout"]) assert.ok(css.includes(`.${className}`), `Missing Phase 13 CSS class ${className}`);
assert.match(read("public/sw.js"), /CACHE_VERSION = "v17"/);

console.table({
  phase: "13 — Gain Architecture Cleanup",
  gain: "overview + dedicated sections",
  ai: "honest premium lock",
  body: "shape map + trends",
  history: "nutrition + body + workouts",
  training: "physique-focus split compatibility",
  database: "1 additive migration",
});
console.log("\n[OK] OVRLD V2 Phase 13 architecture contract passed.");
