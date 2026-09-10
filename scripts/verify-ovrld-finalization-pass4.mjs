import fs from "node:fs";

const checks = [
  ["shared planned workout metrics", "src/features/workouts/utils/workout-metrics.ts", "getPlannedWorkoutMetrics"],
  ["shared session workout metrics", "src/features/workouts/utils/workout-metrics.ts", "getSessionWorkoutMetrics"],
  ["today uses shared metrics", "src/features/workouts/components/TodaysWorkoutClient.tsx", "getPlannedWorkoutMetrics(today.exercises)"],
  ["split uses shared metrics", "src/features/splits/components/SplitManager.tsx", "getPlannedWorkoutMetrics"],
  ["game mode uses shared metrics", "src/features/workouts/components/ActiveWorkoutClient.tsx", "getSessionWorkoutMetrics"],
  ["summary uses shared metrics", "src/features/workouts/components/WorkoutDetailsClient.tsx", "getSessionWorkoutMetrics"],
  ["warmups excluded from performance comparison", "src/features/workouts/utils/performance-comparison.ts", "!set.isWarmup"],
  ["database PR logic excludes warmups", "supabase/migrations/202607140001_initial_schema.sql", "not workout_sets.is_warmup"],
  ["set haptics preference", "src/features/workouts/components/ActiveWorkoutClient.tsx", "Set haptic"],
  ["rest haptics preference", "src/features/workouts/components/ActiveWorkoutClient.tsx", "Rest-end haptic"],
  ["rest sound preference", "src/features/workouts/components/ActiveWorkoutClient.tsx", "Rest-end sound"],
  ["silent workout feedback mode", "src/features/workouts/components/ActiveWorkoutClient.tsx", "Silent"],
  ["rest panel exposes sound control", "src/features/workouts/components/RestTimerPanel.tsx", "timer.setSoundEnabled"],
  ["rest panel exposes haptic control", "src/features/workouts/components/RestTimerPanel.tsx", "timer.setHapticsEnabled"],
  ["rest timer uses an absolute end timestamp", "src/components/providers/RestTimerProvider.tsx", "endsAt"],
  ["rest duration remembered by exercise", "src/features/workouts/components/ActiveWorkoutClient.tsx", "ovrld:rest-duration:"],
  ["navigation has explicit English labels", "src/constants/navigation.ts", "labelEn"],
  ["bottom navigation renders one language explicitly", "src/components/navigation/BottomNavigation.tsx", "item.labelAr : item.labelEn"],
  ["desktop navigation renders one language explicitly", "src/components/navigation/DesktopSidebar.tsx", "item.labelAr : item.labelEn"],
  ["server header titles are localized", "src/components/layout/DashboardHeader.tsx", "LocalizedText"],
  ["runtime localizes textarea placeholders but not user text", "src/lib/localization/runtime.ts", "SKIP_ATTRIBUTE_SELECTOR"],
  ["runtime handles dynamic workout count strings", "src/lib/localization/runtime.ts", "$1 exercises · $2 sets"],
  ["summary highlights top progression", "src/features/workouts/components/WorkoutDetailsClient.tsx", "Top progress"],
  ["summary does not label every improvement as a PR", "src/features/workouts/components/WorkoutDetailsClient.tsx", "topProgressHasPr"],
  ["bottom navigation still has a single active class", "src/components/navigation/BottomNavigation.tsx", "gc-bottom-nav-active"],
  ["mobile safe area remains enabled", "src/app/globals.css", "safe-area-inset-bottom"],
];

let failed = 0;
for (const [label, file, needle] of checks) {
  const content = fs.readFileSync(file, "utf8");
  const ok = content.includes(needle);
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed += 1;
}


const sw = fs.readFileSync("public/sw.js", "utf8");
const cacheVersion = Number(sw.match(/CACHE_VERSION\s*=\s*["\']v(\d+)["\']/)?.[1] ?? 0);
const cacheVersionOk = cacheVersion >= 22;
console.log(`${cacheVersionOk ? "✓" : "✗"} service worker cache version is pass 4 or newer`);
if (!cacheVersionOk) failed += 1;

// Catch the exact class of localization regression that broke Pass 2:
// duplicate single-quoted keys in the AR_TO_EN object.
const map = fs.readFileSync("src/lib/localization/ar-en-map.ts", "utf8");
const keyMatches = [...map.matchAll(/^\s*'((?:\\.|[^'])*)'\s*:/gm)].map((match) => match[1]);
const seen = new Set();
const duplicateKeys = new Set();
for (const key of keyMatches) {
  if (seen.has(key)) duplicateKeys.add(key);
  seen.add(key);
}
const localizationOk = duplicateKeys.size === 0;
console.log(`${localizationOk ? "✓" : "✗"} localization map has no duplicate literal keys`);
if (!localizationOk) {
  console.error(`Duplicate localization keys: ${[...duplicateKeys].slice(0, 20).join(", ")}`);
  failed += 1;
}

if (failed) {
  console.error(`Pass 4 verification failed: ${failed}/${checks.length + 1} checks.`);
  process.exit(1);
}
console.log(`Pass 4 verification passed (${checks.length + 1}/${checks.length + 1}).`);
