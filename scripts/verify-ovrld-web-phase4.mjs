import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const sourceFiles = [
  "src/features/progress/services/progress-intelligence.service.ts",
  "src/features/progress/components/ProgressIntelligencePanel.tsx",
  "src/features/splits/services/plan-audit.service.ts",
  "src/features/splits/components/PlanAuditPanel.tsx",
  "src/features/progress/components/ProgressDashboardClient.tsx",
  "src/features/splits/components/SplitManager.tsx",
];
for (const file of sourceFiles) assert.ok(exists(file), `Missing Phase 4 file: ${file}`);

for (const file of sourceFiles) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, kind);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const intelligence = read("src/features/progress/services/progress-intelligence.service.ts");
assert.match(intelligence, /ExerciseMomentumStatus/);
assert.match(intelligence, /strengthDeltaPercent/);
assert.match(intelligence, /plateau/);
assert.match(intelligence, /fetchBodyProgress\(userId\)\.catch/);
assert.doesNotMatch(intelligence, /\b(?:AI|OpenAI)\b|chat completion/i, "Progress intelligence must be deterministic in Phase 4.");

const audit = read("src/features/splits/services/plan-audit.service.ts");
assert.match(audit, /weightedSets/);
assert.match(audit, /exposureDays/);
assert.match(audit, /الجدول لوحده مش بيحكم/);
assert.match(audit, /secondarySets/);

const progressDashboard = read("src/features/progress/components/ProgressDashboardClient.tsx");
assert.match(progressDashboard, /<ProgressIntelligencePanel userId=\{userId\}/);
const splitManager = read("src/features/splits/components/SplitManager.tsx");
assert.match(splitManager, /<PlanAuditPanel userId=\{userId\}/);

const packageJson = JSON.parse(read("package.json"));
assert.ok(packageJson.scripts?.["verify:phase4"], "Missing verify:phase4 script.");
assert.ok(packageJson.scripts?.["phase4:check"], "Missing phase4:check script.");
assert.match(packageJson.scripts?.check ?? "", /^npm run (?:phase(?:[4-9]|[1-9]\d+):check|pass\d+:check)$/, "Default check must point to Phase 4 or a later cumulative/finalization gate.");

console.table({
  phase: "4 — process intelligence",
  progress: "exercise momentum + plateau/watch signals",
  planAudit: "coverage + frequency + approximate muscle load",
  bodyLoop: "optional body goal context",
  aiDependency: "none — deterministic local calculations",
});
console.log("\n[OK] OVRLD V2 Phase 4 intelligence contract passed.");
