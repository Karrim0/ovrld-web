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
  "supabase/migrations/202609080005_body_measurements_v1.sql",
  "src/features/body-progress/types.ts",
  "src/features/body-progress/services/body-progress.service.ts",
  "src/features/body-progress/components/BodyMeasurementsPanel.tsx",
  "src/features/body-progress/components/BodyProgressClient.tsx",
  "src/features/gain-mode/components/GainBodyMeasurementsCard.tsx",
  "src/features/gain-mode/components/GainModeHubClient.tsx",
  "src/app/(dashboard)/progress/body/page.tsx",
  "src/lib/supabase/types.ts",
  "src/lib/localization/ar-en-map.ts",
  "src/app/globals.css",
  "public/sw.js",
];

for (const file of files) assert.ok(exists(file), `Missing Phase 9 file: ${file}`);
for (const file of files.filter((file) => /\.(ts|tsx)$/.test(file))) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const migration = read("supabase/migrations/202609080005_body_measurements_v1.sql");
for (const token of ["body_measurement_interval_days", "chest_cm", "hips_cm", "thigh_cm", "upper_arm_cm", "calf_cm", "neck_cm"]) {
  assert.ok(migration.includes(token), `Migration missing ${token}`);
}

const service = read("src/features/body-progress/services/body-progress.service.ts");
for (const token of ["latestCircumference", "previousCircumference", "nextBodyMeasurementAt", "hasCircumference", "hips_cm", "upper_arm_cm"]) {
  assert.ok(service.includes(token), `Body service missing ${token}`);
}

const panel = read("src/features/body-progress/components/BodyMeasurementsPanel.tsx");
for (const phrase of ["الوسط", "الأرداف", "الصدر", "الفخذ", "الذراع", "سجّلي قياسات جديدة", "آخر القياسات", "إزاي آخد قياس ثابت؟"]) {
  assert.ok(panel.includes(phrase), `Measurement panel missing ${phrase}`);
}

const bodyClient = read("src/features/body-progress/components/BodyProgressClient.tsx");
assert.match(bodyClient, /gc-body-view-tabs/);
assert.match(bodyClient, /BodyMeasurementsPanel/);
assert.doesNotMatch(bodyClient, /محيط الوسط سم/);

const hub = read("src/features/gain-mode/components/GainModeHubClient.tsx");
assert.match(hub, /GainBodyMeasurementsCard/);
const gainMeasurements = read("src/features/gain-mode/components/GainBodyMeasurementsCard.tsx");
assert.match(gainMeasurements, /progress\/body#measurements/);

const css = read("src/app/globals.css");
for (const className of ["gc-body-view-tabs", "gc-measurements-hero", "gc-body-metric-grid", "gc-gain-measurements-card"]) {
  assert.ok(css.includes(`.${className}`), `Missing Phase 9 CSS class ${className}`);
}

assert.match(read("public/sw.js"), /CACHE_VERSION = "v(?:1[3-9]|[2-9]\d+)"/);

console.table({
  phase: "9 — Body measurements & body progress",
  measures: "waist · hips · chest · thigh · arm · calf · neck",
  cadence: "separate 28-day default",
  bodyUX: "weight | measurements",
  gainUX: "compact measurement summary",
  database: "1 additive migration",
});
console.log("\n[OK] OVRLD V2 Phase 9 contract passed.");
