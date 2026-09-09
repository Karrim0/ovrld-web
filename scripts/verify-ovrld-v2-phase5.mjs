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
  "src/features/dashboard/components/SmartProcessLoop.tsx",
  "src/features/gain-mode/components/GainModeHomeCard.tsx",
  "src/features/dashboard/services/process-loop.service.ts",
  "src/features/workouts/utils/session-time.ts",
  "src/features/workouts/components/SessionElapsedTime.tsx",
  "src/features/workouts/components/ActiveWorkoutClient.tsx",
  "src/features/workouts/services/workout-session.service.ts",
  "src/app/(dashboard)/dashboard/page.tsx",
];

for (const file of files) assert.ok(exists(file), `Missing Phase 5 file: ${file}`);
for (const file of files) {
  const parsed = ts.createSourceFile(
    file,
    read(file),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const loop = read("src/features/dashboard/services/process-loop.service.ts");
assert.match(loop, /fetchProgressIntelligence/);
assert.match(loop, /fetchAdherenceSummary/);
assert.match(loop, /bodyCheckInIsDue/);
assert.match(loop, /status === "slipping"/);
assert.match(loop, /status === "plateau"/);
assert.doesNotMatch(loop, /OpenAI|chat completion|responses\.create/i, "Phase 5 loop must remain deterministic.");

const dashboard = read("src/app/(dashboard)/dashboard/page.tsx");
assert.match(dashboard, /<TodaysWorkoutClient userId=\{user\.id\} compact \/>/, "Home must keep Train as the primary action.");
assert.match(dashboard, /<HomeLogDataAction \/>/, "Home must keep Log Data as the second primary action.");
assert.doesNotMatch(dashboard, /<PersonalSplitOverviewClient|<SmartProcessLoop|<GainModeHomeCard/, "Home should remain execution-first and must not reintroduce plan/process clutter.");

const gainHomeCard = read("src/features/gain-mode/components/GainModeHomeCard.tsx");
assert.match(gainHomeCard, /<SmartProcessLoop userId=\{userId\} \/>/, "Gain Mode wrapper must preserve the Phase 5 deterministic process-loop fallback.");

const timing = read("src/features/workouts/utils/session-time.ts");
assert.match(timing, /18 \* 60 \* 60/);
assert.match(timing, /getSafeWorkoutDurationSeconds/);

const elapsed = read("src/features/workouts/components/SessionElapsedTime.tsx");
assert.match(elapsed, /جلسة قديمة/);
assert.match(elapsed, /isStaleActiveWorkout/);

const gym = read("src/features/workouts/components/ActiveWorkoutClient.tsx");
assert.match(gym, /resumeStaleSession/);
assert.match(gym, /كمّل من دلوقتي/);
assert.match(gym, /buildProgression(?:Hint|Suggestion)/);
assert.match(gym, /progressionSuggestion/);
assert.match(gym, /استخدم/);
assert.match(gym, /getSafeWorkoutDurationSeconds/);

const service = read("src/features/workouts/services/workout-session.service.ts");
assert.match(service, /resumeStaleWorkoutSession/);
assert.match(service, /scheduledDate: getTodayISODate\(\)/);
assert.match(service, /startedAt: now/);

const packageJson = JSON.parse(read("package.json"));
assert.ok(packageJson.scripts?.["verify:phase5"], "Missing verify:phase5 script.");
assert.ok(packageJson.scripts?.["phase5:check"], "Missing phase5:check script.");
assert.match(packageJson.scripts?.check ?? "", /^npm run phase(?:[5-9]|[1-9]\d+):check$/, "Default check must point to Phase 5 or a later cumulative gate.");

console.table({
  phase: "5 — smart process loop",
  home: "single next-step signal + weekly/process context",
  gym: "micro progression hint + stale-session recovery",
  timerGuard: "18h active-session threshold",
  database: "no new migration",
});
console.log("\n[OK] OVRLD V2 Phase 5 contract passed.");
