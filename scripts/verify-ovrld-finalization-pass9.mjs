import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const savedMealsUi = read("src/features/gain-mode/components/GainAiFoodLogger.tsx");
const nutritionUi = read("src/features/gain-mode/components/GainNutritionPanel.tsx");
const nutritionService = read("src/features/gain-mode/services/nutrition.service.ts");
const bodyUi = read("src/features/body-progress/components/BodyProgressClient.tsx");
const bodyMeasurementsUi = read("src/features/body-progress/components/BodyMeasurementsPanel.tsx");
const bodyService = read("src/features/body-progress/services/body-progress.service.ts");
const splitManager = read("src/features/splits/components/SplitManager.tsx");
const splitService = read("src/features/splits/services/split.service.ts");
const gym = read("src/features/workouts/components/ActiveWorkoutClient.tsx");
const workoutService = read("src/features/workouts/services/workout-session.service.ts");
const today = read("src/features/workouts/components/TodaysWorkoutClient.tsx");
const localStore = read("src/lib/offline/workout-store.ts");
const languageProvider = read("src/contexts/language-context.tsx");

const checks = [];
function check(label, condition) {
  assert.ok(condition, label);
  checks.push(label);
  console.log(`✓ ${label}`);
}

check("Saved Meals keeps a short quick list", savedMealsUi.includes("savedMeals.slice(0, 6)"));
check("Saved Meals exposes search for larger libraries", savedMealsUi.includes("savedMealSearch") && savedMealsUi.includes("Search"));
check("Every browsed saved meal has a direct log action", savedMealsUi.includes("filteredMeals.map") && savedMealsUi.includes("void logSavedMeal(meal)"));
check("Saved meal logging respects the selected nutrition date", savedMealsUi.includes("logGainSavedMeal(meal.id, loggedOn)"));
check("Saved Meals no longer relies on a 30-row fetch cap", !nutritionService.includes(".limit(30)") && nutritionService.includes(".range(from, from + pageSize - 1)"));
check("Saved meal duplicate lookup is independent of the fetched browse page", nutritionService.includes("findSavedMealByLabel") && nutritionService.includes('.ilike("label"'));

check("Nutrition exposes a selected date with a today default", nutritionUi.includes("selectedDate") && nutritionUi.includes("getTodayISODate()"));
check("Nutrition date input rejects future dates", nutritionUi.includes("max={actualToday}") && nutritionService.includes("مينفعش تسجّل أكل في تاريخ مستقبلي"));
check("Nutrition mutations write to the selected date", nutritionUi.includes("loggedOn: selectedDate") && nutritionUi.includes("loggedOn={selectedDate}"));
check("Nutrition refreshes the selected day and its seven-day window", nutritionUi.includes("fetchGainNutritionDay(userId, selectedDate") && nutritionUi.includes("fetchGainNutritionWeek(userId") && nutritionService.includes("endDate"));

check("Weight logging exposes a backdate selector", bodyUi.includes('type="date"') && bodyUi.includes("measurementDate"));
check("Full body measurements expose a backdate selector", bodyMeasurementsUi.includes('type="date"') && bodyMeasurementsUi.includes("measurementDate"));
check("Body logging rejects future dates in the service layer", bodyService.includes("مينفعش تسجّل قياس جسم في تاريخ مستقبلي"));
check("Body logging persists the chosen measuredAt timestamp", bodyService.includes("measured_at: measuredAt") && bodyUi.includes("measuredAt:") && bodyMeasurementsUi.includes("measuredAt:"));

check("Repeating plan uses one coherent Edit Workout flow", splitManager.includes("Edit Workout") && !splitManager.includes("editingExercises"));
check("Repeating Edit Workout retains replacement and target controls", splitManager.includes("ExerciseEditor") && splitManager.includes("alternatives={library.filter"));
check("Custom exercise creation never forwards the rest workout type", splitManager.includes('defaultWorkoutType={selectedBase.workoutType === "rest" ? "custom" : selectedBase.workoutType}'));

check("Gym Mode has explicit current-only scope", gym.includes("THIS WORKOUT ONLY"));
check("Gym Mode has explicit repeating-plan scope", gym.includes("ALSO UPDATE REPEATING PLAN"));
check("Gym Mode edit draft initializes from the selected exercise in an event handler", gym.includes("if (!showCurrentExerciseEditor && currentExercise)") && !gym.includes("setEditTargetSets(currentExercise.sets.length);\n    setEditTargetRepsMin"));
check("Gym Mode can edit targets without leaving the workout", gym.includes("saveCurrentExerciseTargets") && gym.includes("updateWorkoutExercisePlan"));
check("Gym Mode can replace remaining work without deleting completed history", gym.includes("replaceCurrentExercise") && workoutService.includes("replaceWorkoutExerciseRemaining") && workoutService.includes("const completed = sets.filter"));
check("Gym Mode removal preserves completed set history", workoutService.includes("removeRemainingWorkoutExercise") && workoutService.includes("keptCompletedHistory"));
check("Permanent live edits reuse repeating-plan services", gym.includes("updateSplitExerciseTargets") && gym.includes("replaceSplitExercise") && gym.includes("removeSplitExercise"));

check("Today no longer loads full workout history", today.includes("fetchCompletedWorkoutForDate") && !today.includes("fetchWorkoutHistory"));
check("Today completion lookup is minimal remotely", workoutService.includes('select("id, scheduled_date, workout_exercises(id, workout_sets(id, is_completed))")'));
check("Today completion lookup is focused locally", localStore.includes("getLocalCompletedWorkoutForDate") && localStore.includes('.where("scheduledDate")'));
check("Compact dashboard skips the full personal split request", today.includes("compact ? Promise.resolve([] as SplitDayWithDetails[]) : fetchPersonalSplit(userId)"));
check("Today load callback tracks compact mode", today.includes("}, [compact, currentDate, userId]);"));
check("Concurrent personal split reads are deduplicated", splitService.includes("personalSplitRequests") && splitService.includes("personalSplitRequests.get(userId)"));
check("Concurrent effective-week reads are deduplicated per user/week", splitService.includes("effectiveWeekRequests") && splitService.includes("requestKey"));

check("Localization hot path is profiled before redesign", languageProvider.includes("__OVRLD_LOCALIZATION_PROFILE__") && languageProvider.includes('process.env.NODE_ENV === "development"'));

console.log(`\n[OK] OVRLD Finalization Pass 9 combined UX + performance contract passed (${checks.length}/${checks.length}).`);
