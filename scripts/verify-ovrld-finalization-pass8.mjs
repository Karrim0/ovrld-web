import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadPureTsModule(file) {
  const source = read(file);
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const cjsModule = { exports: {} };
  vm.runInNewContext(compiled, { module: cjsModule, exports: cjsModule.exports, require }, { filename: file });
  return cjsModule.exports;
}

function stripImports(source) {
  return source.replace(/import[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
}

function loadWorkoutServiceHarness(initialSession) {
  const source = stripImports(read("src/features/workouts/services/workout-session.service.ts"));
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: "workout-session.service.ts",
  }).outputText;

  let localSession = structuredClone(initialSession);
  const events = [];
  const context = {
    module: { exports: {} },
    exports: null,
    console,
    Date,
    getLocalWorkoutSession: async (id) => id === localSession?.id ? structuredClone(localSession) : null,
    saveWorkoutLocally: async (session) => {
      events.push(["save", session.status]);
      localSession = structuredClone(session);
      return session;
    },
    enqueueOfflineMutation: async (mutation) => {
      events.push(["enqueue", mutation.payload.status]);
    },
    workoutSessionMutation: (operation, payload) => ({ entity: "workoutSession", operation, payload }),
    requestSync: () => { events.push(["requestSync", localSession?.status]); },
  };
  context.exports = context.module.exports;
  vm.runInNewContext(compiled, context, { filename: "src/features/workouts/services/workout-session.service.ts" });
  return {
    service: context.module.exports,
    events,
    getLocalSession: () => structuredClone(localSession),
  };
}

async function verifySyncFollowUpBehavior() {
  const source = stripImports(read("src/lib/offline/sync-manager.ts"));
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: "sync-manager.ts",
  }).outputText;

  const queue = [];
  const synced = [];
  let releaseFirst;
  let firstStarted;
  const firstStartedPromise = new Promise((resolve) => { firstStarted = resolve; });
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  let upsertCount = 0;

  const context = {
    module: { exports: {} },
    exports: null,
    window: {},
    queueMicrotask,
    setTimeout,
    clearTimeout,
    getArabicErrorMessage: (error) => error instanceof Error ? error.message : String(error),
    getCurrentNetworkStatus: () => true,
    getPendingSyncCount: async () => queue.length,
    getSyncQueueItems: async () => queue.filter((item) => item.status === "pending" || item.status === "failed").map((item) => ({ ...item })),
    markFailedItemsPending: async () => {
      for (const item of queue) if (item.status === "failed") item.status = "pending";
    },
    recoverInterruptedSyncItems: async () => 0,
    updateSyncQueueItem: async (next) => {
      const index = queue.findIndex((item) => item.id === next.id);
      if (index >= 0) queue[index] = { ...next };
    },
    removeSyncQueueItem: async (id) => {
      const index = queue.findIndex((item) => item.id === id);
      if (index >= 0) queue.splice(index, 1);
    },
    createClient: () => ({
      from: () => ({
        upsert: async (row) => {
          upsertCount += 1;
          if (upsertCount === 1) {
            firstStarted();
            await firstGate;
          }
          synced.push(row.id);
          return { error: null };
        },
        delete: () => ({ eq: async () => ({ error: null }) }),
      }),
    }),
  };
  context.exports = context.module.exports;
  vm.runInNewContext(compiled, context, { filename: "src/lib/offline/sync-manager.ts" });

  const makeItem = (id) => ({
    id: `queue-${id}`,
    idempotencyKey: id,
    mutation: {
      entity: "workoutSession",
      operation: "update",
      payload: {
        id,
        clientId: `client-${id}`,
        userId: "user-1",
        groupId: "group-1",
        splitDayId: null,
        scheduledDate: "2026-09-28",
        status: "completed",
        notes: "",
        durationSeconds: 60,
        startedAt: "2026-09-28T10:00:00.000Z",
        completedAt: "2026-09-28T11:00:00.000Z",
        updatedAt: "2026-09-28T11:00:00.000Z",
        exercises: [],
      },
    },
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempts: 0,
    lastAttemptAt: null,
    lastError: null,
  });

  queue.push(makeItem("session-a"));
  const firstRun = context.module.exports.processSyncQueue();
  await firstStartedPromise;
  queue.push(makeItem("session-b"));
  context.module.exports.requestSync();
  releaseFirst();
  await firstRun;

  const deadline = Date.now() + 1000;
  while (queue.length > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  assert.deepEqual(synced, ["session-a", "session-b"], "mutation queued during active sync must receive a follow-up pass");
  assert.equal(queue.length, 0, "follow-up pass must drain the newly queued mutation");
}

const timing = loadPureTsModule("src/features/workouts/utils/session-time.ts");
const lifecycle = loadPureTsModule("src/features/workouts/utils/session-lifecycle.ts");

const wednesday = new Date("2026-09-30T10:00:00");
assert.equal(
  timing.isStaleWorkoutSession("2026-09-28T20:00:00", "2026-09-28", wednesday),
  true,
  "previous-day unfinished workout must require stale-session resolution",
);
assert.equal(
  timing.isStaleWorkoutSession("2026-09-30T09:45:00", "2026-09-28", wednesday),
  false,
  "resuming today must restart the timer without changing historical workout identity",
);
assert.equal(timing.isHistoricalWorkoutDate("2026-09-28", wednesday), true);

const localCompleted = { id: "session-1", status: "completed" };
assert.equal(
  lifecycle.shouldProtectLocalTerminalWorkout(localCompleted, "session-1", true),
  true,
  "pending local completion must beat stale remote in_progress state",
);
assert.equal(
  lifecycle.shouldProtectLocalTerminalWorkout(localCompleted, "session-1", false),
  false,
  "remote refresh may proceed after terminal mutation is no longer pending",
);

const baseSession = {
  id: "session-1",
  clientId: "client-1",
  userId: "user-1",
  groupId: "group-1",
  splitDayId: null,
  scheduledDate: "2026-09-28",
  status: "in_progress",
  notes: "",
  durationSeconds: 420,
  startedAt: "2026-09-28T20:00:00.000Z",
  completedAt: null,
  updatedAt: "2026-09-28T20:00:00.000Z",
  exercises: [],
};

const resumeHarness = loadWorkoutServiceHarness(baseSession);
const resumed = await resumeHarness.service.resumeStaleWorkoutSession(baseSession.id);
assert.equal(resumed.scheduledDate, "2026-09-28", "resume must keep the historical workout date");
assert.equal(resumed.durationSeconds, 420, "resume must not silently erase already persisted duration");
assert.notEqual(resumed.startedAt, baseSession.startedAt, "resume must move only the timer anchor to now");
assert.deepEqual(resumeHarness.events.map(([event]) => event), ["save", "enqueue", "requestSync"]);

const finishHarness = loadWorkoutServiceHarness(baseSession);
const finished = await finishHarness.service.finishWorkoutSession(baseSession.id, 900, "done offline");
assert.equal(finished.status, "completed");
assert.equal(finished.scheduledDate, "2026-09-28");
assert.equal(finished.durationSeconds, 900);
assert.deepEqual(
  finishHarness.events,
  [["save", "completed"], ["enqueue", "completed"], ["requestSync", "completed"]],
  "Finish must commit terminal local state before queueing/syncing so offline navigation is safe",
);

const service = read("src/features/workouts/services/workout-session.service.ts");
const resumeBody = service.match(/export async function resumeStaleWorkoutSession[\s\S]*?\n}\n/)?.[0] ?? "";
assert.doesNotMatch(resumeBody, /scheduledDate\s*:/, "stale resume must preserve original scheduledDate");
assert.match(resumeBody, /startedAt:\s*now/, "stale resume must reset only the timer anchor");
assert.match(service, /shouldProtectLocalTerminalWorkout/, "active remote refresh must protect pending terminal local state");

const active = read("src/features/workouts/components/ActiveWorkoutClient.tsx");
assert.match(active, /isStaleWorkoutSession\(session\.startedAt, session\.scheduledDate\)/);
assert.match(active, /historicalSession \? "\/workout\/today"/, "resolving historical workout must return to the real current-day workout");
assert.match(active, /staleSession\s*\?\s*Math\.max\(0, Math\.floor\(session\.durationSeconds\)\)/, "finishing unresolved stale session must not count idle time");

const today = read("src/features/workouts/components/TodaysWorkoutClient.tsx");
assert.match(today, /Resolve old workout/);
assert.match(today, /original date will stay preserved/);

const quick = read("src/features/workouts/components/QuickWorkoutLogClient.tsx");
assert.match(quick, /isStaleWorkoutSession\(session\.startedAt, session\.scheduledDate\)/);
assert.match(quick, /historicalSession \? "\/workout\/today" : "\/dashboard"/);
assert.match(quick, /old idle time will not count as workout time/);

const syncManager = read("src/lib/offline/sync-manager.ts");
assert.match(syncManager, /syncRequestedWhileRunning/);
assert.match(syncManager, /queueMicrotask\(\(\) => void processSyncQueue\(\)\)/);
await verifySyncFollowUpBehavior();

console.table({
  pass: "8 — workout lifecycle reliability",
  historicalIdentity: "scheduledDate preserved",
  terminalConflict: "local terminal + pending mutation protected",
  syncRace: "follow-up pass behavior verified",
  migration: "none",
});
console.log("\n[OK] OVRLD Finalization Pass 8 lifecycle regression contract passed.");
