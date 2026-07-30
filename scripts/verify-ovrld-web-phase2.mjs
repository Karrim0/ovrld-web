import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const required = [
  "src/lib/offline/sync-policy.ts",
  "src/lib/offline/sync-queue.ts",
  "src/lib/offline/sync-manager.ts",
  "src/features/workouts/services/workout-session.service.ts",
  "src/features/auth/components/LoginForm.tsx",
  "docs/OVRLD_WEB_PHASE_2.md",
];
for (const file of required) assert.ok(fs.existsSync(path.join(root, file)), `Missing ${file}`);

const sourceFiles = [
  ...required.filter((file) => file.endsWith(".ts") || file.endsWith(".tsx")),
  "src/types/domain.ts",
  "src/lib/offline/workout-store.ts",
  "src/app/api/sync/route.ts",
  "src/features/workouts/hooks/use-active-workout.ts",
];
for (const file of sourceFiles) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, kind);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const domain = read("src/types/domain.ts");
assert.match(domain, /targetRepsMin: number;/);
assert.match(domain, /targetRepsMax: number;/);
assert.match(domain, /isPersonalRecord: boolean;\s+notes: string;/);

const syncQueue = read("src/lib/offline/sync-queue.ts");
assert.match(syncQueue, /recoverInterruptedSyncItems/);
assert.match(syncQueue, /hasPendingMutationsForWorkoutSession/);
assert.match(syncQueue, /isSyncRetryDue/);

const workout = read("src/features/workouts/services/workout-session.service.ts");
assert.match(workout, /getCurrentNetworkStatus/);
assert.match(workout, /hasPendingMutationsForWorkoutSession/);
assert.match(workout, /targetRepsMin: row\.target_reps_min/);
assert.match(workout, /notes: row\.notes/);
assert.match(workout, /fetchRemoteSessionById\(local\.id\)/);

const login = read("src/features/auth/components/LoginForm.tsx");
assert.match(login, /getSafeLoginDestination/);
assert.match(login, /searchParams\.get\("next"\)/);

const apiSync = read("src/app/api/sync/route.ts");
assert.match(apiSync, /target_reps_min: exercise\.targetRepsMin/);
assert.match(apiSync, /notes: set\.notes/);

const policyTypeScript = read("src/lib/offline/sync-policy.ts");
const policySource = ts.transpileModule(policyTypeScript, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const policyFactory = new Function("exports", `${policySource}; return exports;`);
const { getSyncRetryDelayMs, isSyncRetryDue, isInterruptedProcessingItem } = policyFactory({});
assert.equal(getSyncRetryDelayMs(1), 2000);
assert.equal(getSyncRetryDelayMs(2), 4000);
assert.equal(getSyncRetryDelayMs(20), 300000);
const now = Date.parse("2026-07-30T12:00:00.000Z");
assert.equal(isSyncRetryDue({ status: "pending", attempts: 0, lastAttemptAt: null }, now), true);
assert.equal(isSyncRetryDue({ status: "failed", attempts: 2, lastAttemptAt: "2026-07-30T11:59:59.000Z" }, now), false);
assert.equal(isSyncRetryDue({ status: "failed", attempts: 2, lastAttemptAt: "2026-07-30T11:59:55.000Z" }, now), true);
assert.equal(isInterruptedProcessingItem({ status: "processing", updatedAt: "2026-07-30T11:57:00.000Z", lastAttemptAt: null }, now), true);

console.table({
  product: "OVRLD Web",
  phase: "2 — functional repair",
  authRedirect: "safe next path",
  workoutFreshness: "remote refresh unless local mutations are pending",
  queueRecovery: "stale processing recovery + exponential backoff",
  workoutContract: "target reps + set notes preserved",
});
console.log("\n[OK] OVRLD Web Phase 2 functional repair contract passed.");
