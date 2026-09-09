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
  "supabase/migrations/202609090002_gain_mode_training_integration_v1.sql",
  "src/features/gain-mode/types.ts",
  "src/features/gain-mode/services/gain-mode.service.ts",
  "src/features/gain-mode/services/review.service.ts",
  "src/features/gain-mode/components/GainTrainingCard.tsx",
  "src/features/gain-mode/components/GainModeHubClient.tsx",
  "src/features/onboarding/components/GoalSetupClient.tsx",
  "src/features/workouts/components/ActiveWorkoutClient.tsx",
  "src/features/splits/components/SplitManager.tsx",
  "src/lib/supabase/types.ts",
  "src/lib/localization/ar-en-map.ts",
  "src/lib/localization/runtime.ts",
  "src/app/globals.css",
  "public/sw.js",
  "docs/OVRLD_V2_PHASE_12_PREMIUM_INTEGRATION.md",
  "docs/OVRLD_FINAL_PRODUCT_AUDIT.md",
];

for (const file of files) assert.ok(exists(file), `Missing Phase 12 file: ${file}`);
for (const file of files.filter((file) => /\.(ts|tsx)$/.test(file))) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const migration = read("supabase/migrations/202609090002_gain_mode_training_integration_v1.sql");
for (const token of ["equation_sex", "'female'", "'male'", "set default 'female'", "set not null"]) {
  assert.ok(migration.includes(token), `Phase 12 migration missing ${token}`);
}

const gain = read("src/features/gain-mode/services/gain-mode.service.ts");
for (const token of ["equationSex", "sexConstant", "fetchPlanAudit", "buildTrainingSummary", "training:"]) {
  assert.ok(gain.includes(token), `Gain service missing ${token}`);
}
assert.match(gain, /equationSex === "male" \? 5 : -161/);

const review = read("src/features/gain-mode/services/review.service.ts");
for (const token of ["fetchTrainingWindow", "weekly_schedule_days", "workoutsScheduled", "trainingAdherence", "training_plan_missing", "training_consistency"]) {
  assert.ok(review.includes(token), `Review integration missing ${token}`);
}

const hub = read("src/features/gain-mode/components/GainModeHubClient.tsx");
const phase13Architecture = hub.includes("/progress/gain/nutrition") && hub.includes("/progress/gain/training") && hub.includes("/progress/gain/history");
if (phase13Architecture) {
  assert.doesNotMatch(hub, /<GainNutritionPanel/);
  assert.ok(hub.includes("/progress/body"), "Phase 13 Gain hub must link to the dedicated body experience.");
} else {
  assert.match(hub, /GainTrainingCard/);
  assert.ok(hub.indexOf("<GainNutritionPanel") < hub.indexOf("<GainTrainingCard"), "Nutrition must appear before the integrated training section.");
  assert.ok(hub.indexOf("<GainTrainingCard") < hub.indexOf("<GainBodyMeasurementsCard"), "Training must be a first-class Gain section, not a footer link.");
}
assert.doesNotMatch(hub, /تمرين النهارده<\/span>/, "Duplicate workout shortcut should not remain under the Gain sections.");

const gym = read("src/features/workouts/components/ActiveWorkoutClient.tsx");
for (const token of ["setPhase(\"ready\")", "buildProgressionSuggestion", "progressionSuggestion", "queueEditing", "showWorkoutOptions", "gc-workout-options-sheet", "gc-gym-set-panel"]) {
  assert.ok(gym.includes(token), `Premium Gym Mode missing ${token}`);
}
assert.doesNotMatch(gym, /تحب تبدأ بأنهي تمرين/);
assert.doesNotMatch(gym, /اختار أي تمرين\. اسحب ورتّب/);
assert.match(gym, /draggable=\{queueEditing && !busy\}/);
assert.match(gym, /gc-gym-context-next/);

const goal = read("src/features/onboarding/components/GoalSetupClient.tsx");
assert.match(goal, /Gain Mode · زيادة الوزن/);
assert.doesNotMatch(goal, /للبنات/);
assert.match(goal, /equationSex/);
assert.match(goal, /useState<GainEquationSex \| null>\(null\)/, "Fresh Gain onboarding must not silently assume female or male for the calorie equation.");
const activation = read("src/features/gain-mode/components/GainModeActivationClient.tsx");
assert.match(activation, /useState<GainEquationSex \| null>\(null\)/, "Fresh Gain activation must require an explicit equation-sex choice.");

const activeGainFiles = [
  "src/features/gain-mode/services/gain-mode.service.ts",
  "src/features/gain-mode/services/review.service.ts",
  "src/features/gain-mode/components/GainModeHubClient.tsx",
  "src/features/gain-mode/components/GainModeActivationClient.tsx",
  "src/features/gain-mode/components/GainModeHomeCard.tsx",
  "src/features/gain-mode/components/GainAiFoodLogger.tsx",
  "src/features/onboarding/components/GoalSetupClient.tsx",
  "src/features/body-progress/components/BodyMeasurementsPanel.tsx",
  "src/app/api/gain/food/estimate/route.ts",
].map(read).join("\n");
assert.doesNotMatch(activeGainFiles, /للبنات|سجّلي|راجعي|كمّلي|اختاري|اكتبي|زوّدي|ليكي|عليكي|إنتِ|حدّثي|وصلتي|اعملي|أكلتي/);

for (const legacy of [
  "src/features/workouts/components/WorkoutExerciseCard.tsx",
  "src/features/workouts/components/WorkoutSessionHeader.tsx",
  "src/features/workouts/components/WorkoutSetRow.tsx",
  "src/features/splits/components/EditSplitDayDialog.tsx",
  "tsconfig.tsbuildinfo",
]) {
  assert.equal(exists(legacy), false, `Legacy/dead artifact still exists: ${legacy}`);
}
assert.equal(fs.readdirSync(root).some((name) => /^gym-crew-v1\..*\.patch$/u.test(name)), false, "Legacy root patch files must be removed.");

const css = read("src/app/globals.css");
for (const className of ["gc-gym-queue-row", "gc-gym-set-panel", "gc-gym-suggestion", "gc-workout-options-sheet", "gc-gain-training", "gc-gain-training-grid"]) {
  assert.ok(css.includes(`.${className}`), `Missing premium CSS class ${className}`);
}
assert.match(read("public/sw.js"), /CACHE_VERSION = "v(?:1[6-9]|[2-9]\d+)"/);

console.table({
  phase: "12 — Premium Product Integration",
  gym: "set-first + hidden edit controls",
  gain: "universal + training-aware",
  decisions: "nutrition + weight + plan + strength",
  cleanup: "dead components + legacy patches removed",
  database: "1 additive migration",
});
console.log("\n[OK] OVRLD V2 Phase 12 premium integration contract passed.");
