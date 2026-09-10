import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

const migration = read("supabase/migrations/202609100002_pass7_journey_profile_sex_v1.sql");
const reset = read("supabase/manual/PASS7_RESET_EXISTING_PRODUCT_DATA.sql");
const journey = read("src/features/journey/services/journey.service.ts");
const timeline = read("src/features/journey/components/JourneyHistoryClient.tsx");
const quick = read("src/features/workouts/components/QuickWorkoutLogClient.tsx");
const today = read("src/features/workouts/components/TodaysWorkoutClient.tsx");
const body = read("src/features/body-progress/components/BodyShapeOverview.tsx");
const onboarding = read("src/features/onboarding/components/OnboardingWizard.tsx");
const profile = read("src/features/profile/services/profile.service.ts");
const workoutService = read("src/features/workouts/services/workout-session.service.ts");
const workoutHub = read("src/app/(dashboard)/workout/page.tsx");
const offlineStore = read("src/lib/offline/workout-store.ts");

add("Pass 7 adds canonical profile sex additively", migration.includes("add column if not exists sex text") && migration.includes("profiles_sex_check"));
add("Gain equation sex stays synchronized", migration.includes("sync_profile_sex_to_gain_profile") && migration.includes("sync_gain_profile_sex_to_profile"));
add("legacy reset is manual, not destructive deploy migration", exists("supabase/manual/PASS7_RESET_EXISTING_PRODUCT_DATA.sql") && reset.includes("auth.users") && reset.includes("onboarding_completed_at = null"));
add("journey history derives from canonical workout history", journey.includes('from("workout_sessions")') && journey.includes('.eq("status", "completed")'));
add("journey history derives body data from canonical body measurements", journey.includes('from("body_measurements")'));
add("history exposes original event timestamps", journey.includes("completed_at") && journey.includes("measured_at") && timeline.includes("formatWhen(selected.occurredAt"));
add("history supports detail and edit paths", timeline.includes("Details") && timeline.includes("Edit numbers") && timeline.includes("updateBodyMeasurement"));
add("history is a real progress route", exists("src/app/(dashboard)/progress/history/page.tsx"));
add("Quick Log directly prefills last numbers", quick.includes("set.weightKg ?? last?.weightKg") && quick.includes("set.reps ?? last?.reps"));
add("Quick Log saves each exercise independently", quick.includes("saveExercise(exerciseIndex)") && quick.includes("Save exercise"));
add("Quick Log communicates partial completion", quick.includes("savedCount") && quick.includes("totalExercises") && quick.includes("stay as a draft"));
add("Quick Log anomaly guard warns but does not block", quick.includes("hasSuspiciousDrop") && quick.includes("window.confirm"));
add("completed today becomes Edit instead of new Log", today.includes("completedToday") && today.includes("&edit=1") && today.includes("completedToday.id"));
add("sex is mandatory in onboarding and canonical profile update", onboarding.includes("setSex") && onboarding.includes("sex,") && profile.includes("sex: input.sex"));
add("body visualization varies by canonical sex", body.includes('sex === "male"') && body.includes("body visuals") === false);
add("server-side reset cannot leave stale completed workout cache", workoutService.includes("remoteIds") && workoutService.includes("removeLocalWorkoutSession(local.id)") && workoutService.includes("hasPendingMutationsForWorkoutSession(local.id)"));
add("re-onboarding clears stale user product cache without resetting preferences", onboarding.includes("clearLocalUserProductData(userId)") && offlineStore.includes("clearLocalUserProductData") && !offlineStore.includes("clearOvrldClientStorage();\n  const sessions"));
add("workout hub does not blindly open Gym Mode without a session", !workoutHub.includes('href="/workout/active"') && workoutHub.includes('href="/workout/today"'));

let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? "✓" : "✗"} ${label}`); if (!ok) failed += 1; }
if (failed) { console.error(`Pass 7 verification failed: ${failed}/${checks.length} checks.`); process.exit(1); }
console.log(`Pass 7 verification passed (${checks.length}/${checks.length}).`);
