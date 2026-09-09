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
  "supabase/migrations/202609090004_gain_recommended_plan_v1.sql",
  "supabase/migrations/202609090005_gain_recommended_plan_v2.sql",
  "src/features/splits/components/SplitSetupChooser.tsx",
  "src/features/splits/components/SplitManager.tsx",
  "src/features/splits/services/split.service.ts",
  "src/features/splits/types/index.ts",
  "src/features/gain-mode/components/GainTrainingIntegrationClient.tsx",
  "src/features/gain-mode/components/GainModeActivationClient.tsx",
  "src/features/gain-mode/components/GainModeHubClient.tsx",
  "src/features/gain-mode/services/gain-mode.service.ts",
  "src/features/gain-mode/types.ts",
  "src/lib/supabase/types.ts",
  "src/lib/localization/ar-en-map.ts",
  "docs/OVRLD_V2_PHASE_14_RECOMMENDED_GAIN_PLAN.md",
  "public/sw.js",
  "package.json",
];
for (const file of files) assert.ok(exists(file), `Missing Phase 14 file: ${file}`);
for (const file of files.filter((file) => /\.(ts|tsx|mts)$/.test(file))) {
  const sf = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(sf.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const migration = read("supabase/migrations/202609090004_gain_recommended_plan_v1.sql");
for (const token of ["apply_gain_glutes_plan", "Hip Thrust", "Hack Squat", "Glute-Biased Hyperextension", "support_note", "support_name", "assert_week_schedule_has_no_three_rest_days"]) {
  assert.ok(migration.includes(token), `Migration missing ${token}`);
}
const finalPlanMigration = read("supabase/migrations/202609090005_gain_recommended_plan_v2.sql");
for (const token of ["Leg Press Calf Raise", "Standing Calf Raise", "Hip Adduction Machine", "3, 8, 12", "2, 12, 20"]) {
  assert.ok(finalPlanMigration.includes(token), `Final Gain plan migration missing ${token}`);
}
const split = read("src/features/splits/components/SplitManager.tsx");
for (const token of ["بديل لنفس العضلة", "replaceSplitExercise", "راحة / إجازة"]) assert.ok(split.includes(token), `Split flexibility missing ${token}`);
const training = read("src/features/gain-mode/components/GainTrainingIntegrationClient.tsx");
for (const token of ["Recommended Gain Plan", "gain_glutes_4", "قواعد التطور", "1–2 RIR"]) assert.ok(training.includes(token), `Training integration missing ${token}`);
const hub = read("src/features/gain-mode/components/GainModeHubClient.tsx");
for (const token of ["supportNote", "رسالة خاصة", "improvingExercises"]) assert.ok(hub.includes(token), `Support/progress UI missing ${token}`);
assert.match(read("public/sw.js"), /CACHE_VERSION = "v18"/);
console.table({ phase: "14 — Recommended Gain Plan", plan: "4-day Glutes + Legs", flexibility: "week overrides + same-muscle swaps", coaching: "RIR/rest/warm-up/sleep", support: "private optional note" });
console.log("\n[OK] OVRLD V2 Phase 14 contract passed.");
