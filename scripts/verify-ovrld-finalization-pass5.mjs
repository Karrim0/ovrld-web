import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const add = (label, ok) => checks.push([label, ok]);

const dashboard = read("src/app/(dashboard)/dashboard/page.tsx");
const today = read("src/features/workouts/components/TodaysWorkoutClient.tsx");
const quick = read("src/features/workouts/components/QuickWorkoutLogClient.tsx");
const quickPage = read("src/app/(dashboard)/workout/quick/page.tsx");
const active = read("src/features/workouts/components/ActiveWorkoutClient.tsx");
const css = read("src/app/globals.css");
const shell = read("src/components/layout/AppShell.tsx");
const bottom = read("src/components/navigation/BottomNavigation.tsx");
const desktop = read("src/components/navigation/DesktopSidebar.tsx");
const sw = read("public/sw.js");
const warmer = read("src/components/providers/OfflineCacheWarmer.tsx");
const authShell = read("src/components/layout/AuthShell.tsx");
const runtimeI18n = read("src/lib/localization/runtime.ts");

add("home restores Today workout first", /<TodaysWorkoutClient userId=\{user\.id\} compact \/>/.test(dashboard));
add("home keeps quick data entry", /<HomeLogDataAction compact \/>/.test(dashboard));
add("home restores Gain context", /<GainModeHomeCard userId=\{user\.id\} \/>/.test(dashboard));
add("home restores compact week", /<PersonalSplitOverviewClient userId=\{user\.id\} compact \/>/.test(dashboard));

add("Today card offers Quick log", today.includes("Quick log") && today.includes("/workout/quick?session="));
add("Quick log route exists", exists("src/app/(dashboard)/workout/quick/page.tsx") && quickPage.includes("QuickWorkoutLogClient"));
add("Quick log has direct weight input", quick.includes('name={`weight:${set.id}`}'));
add("Quick log has direct reps input", quick.includes('name={`reps:${set.id}`}'));
add("Quick log can save and exit", quick.includes("Save & exit") && quick.includes('value="exit"'));
add("Quick log can finish workout", quick.includes('value="finish"') && quick.includes("finishWorkoutSession"));
add("Quick log uses previous numbers as reference", quick.includes("usePreviousPerformances") && quick.includes("placeholder={last?.weightKg"));

add("Game Mode is set-first", active.includes("gc-gym-set-tabs") && active.includes("gc-gym-set-panel"));
add("Game Mode keeps concise last/target context", active.includes("gc-gym-context-line") && active.includes("progressionSuggestion.label"));
add("Game Mode removed dedicated set timer clutter", !active.includes("gc-set-timer-button") && !active.includes("SetElapsedClock"));
add("Game Mode removed inline queue clutter", !active.includes("gc-gym-collapsed-queue") && !active.includes("gc-gym-next-card"));
add("Game Mode still keeps queue management secondary", active.includes("Workout Queue") && active.includes("showWorkoutOptions"));
add("Game Mode keeps advanced set options secondary", active.includes("Set options") && active.includes("RIR / Failure") && active.includes("isWarmup"));
add("Game Mode auto-returns to next set", active.includes("hasAnotherSetInExercise") && active.includes('setPhase(hasAnotherSetInExercise ? "ready" : "post")'));
add("Game Mode keeps undo without a full post screen every set", active.includes("gc-gym-saved-strip") && active.includes("undoLastSet"));

add("Dark theme is neutral charcoal", css.includes("--background: #0d0f12") && css.includes("linear-gradient(180deg, #0f1115 0%, #0b0d10 100%)"));
add("Brand accent is muted", css.includes("--accent: #76a98f") && css.includes("--accent-strong: #5f9178"));
add("Home cards use tokenized accent", css.includes(".gc-home-train-icon { background: var(--accent)"));
add("Focused Game Mode uses tokenized accent", css.includes(".gc-gym-log-button") && css.includes("background: var(--accent)"));

add("Quick log hides app navigation", shell.includes("quickLogMode") && bottom.includes("/workout/quick") && desktop.includes("/workout/quick"));
add("Quick log hides rest timer launcher", shell.includes("quickLogMode ? null : <RestTimerLauncher />"));
add("PWA cache bumped for Pass 5", sw.includes('CACHE_VERSION = "v22"'));
add("Quick log is available offline", sw.includes('"/workout/quick"'));
add("Quick log is warmed for offline reopening", warmer.includes('"/workout/quick"'));

add("Brand slogan is protected from runtime localization", authShell.match(/data-no-localize[^>]*>TRAIN · LOG · PROGRESS/g)?.length === 2 && desktop.includes('data-no-localize className="gc-muted min-w-0 truncate text-[11px] font-black tracking-[0.14em]">TRAIN · LOG · PROGRESS'));
add("Runtime phrase replacement respects word boundaries", runtimeI18n.includes("replaceKnownPhraseSafely") && runtimeI18n.includes("rightBoundary") && runtimeI18n.includes("\\p{L}"));

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`Pass 5 verification failed: ${failed}/${checks.length} checks.`);
  process.exit(1);
}
console.log(`Pass 5 verification passed (${checks.length}/${checks.length}).`);
