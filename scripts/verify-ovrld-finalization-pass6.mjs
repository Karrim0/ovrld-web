import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const required = [
  "supabase/migrations/202609100001_onboarding_progressive_profile_v1.sql",
  "src/features/onboarding/components/OnboardingWizard.tsx",
  "src/features/onboarding/components/GoalSetupClient.tsx",
  "src/features/onboarding/components/SoloModeButton.tsx",
  "src/features/onboarding/services/onboarding.service.ts",
  "src/features/onboarding/types.ts",
  "src/features/profile/services/profile-completeness.ts",
  "src/features/profile/services/profile-completeness.server.ts",
  "src/features/profile/components/ProfileCompletenessCard.tsx",
  "src/features/profile/components/ProfileSettingsClient.tsx",
  "src/features/splits/constants/starter-plans.ts",
  "src/app/(onboarding)/onboarding/page.tsx",
  "src/app/(onboarding)/body-goal/page.tsx",
  "src/app/(dashboard)/layout.tsx",
  "src/app/(dashboard)/profile/page.tsx",
];
for (const file of required) assert.ok(exists(file), `Missing Pass 6 file: ${file}`);

for (const file of required.filter((file) => /\.(ts|tsx)$/.test(file))) {
  const parsed = ts.createSourceFile(
    file,
    read(file),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

function evaluatePureTypeScript(file) {
  const source = read(file);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const sandbox = { exports: {}, module: { exports: {} }, console };
  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(output, sandbox, { filename: file });
  return sandbox.module.exports;
}

const migration = read("supabase/migrations/202609100001_onboarding_progressive_profile_v1.sql");
for (const column of ["age_years", "training_level", "weekly_training_days"]) {
  assert.ok(migration.includes(`add column if not exists ${column}`), `Pass 6 migration missing additive ${column}`);
}
assert.match(migration, /from public\.gain_mode_profiles/);
assert.match(migration, /profiles_sync_age_to_gain_profile/);
assert.match(migration, /gain_profile_sync_age_to_profile/);
assert.doesNotMatch(migration, /create table/i, "Pass 6 should reuse current data sources instead of adding an onboarding table.");
assert.doesNotMatch(migration, /completeness_(?:score|percent)|profile_completeness/i, "Profile completeness must be computed, not stored.");

const onboardingTypes = read("src/features/onboarding/types.ts");
for (const field of ["ageYears", "heightCm", "currentWeightKg", "goal", "trainingLevel", "weeklyTrainingDays", "trainingSetupPath", "readyPlanKey"]) {
  assert.ok(onboardingTypes.includes(field), `Onboarding input missing ${field}`);
}

const onboardingService = read("src/features/onboarding/services/onboarding.service.ts");
for (const behavior of ["updateTrainingProfileBasics", "saveBodyGoal", "addBodyMeasurement", "applySplitTemplate", "completeOnboarding"]) {
  assert.ok(onboardingService.includes(behavior), `Onboarding service must reuse ${behavior}`);
}
assert.match(onboardingService, /Math\.abs\(existingBody\.latest\.weightKg - input\.currentWeightKg\) >= 0\.05/);
assert.doesNotMatch(onboardingService, /insert\([^)]*onboarding|from\("onboarding/i, "No parallel onboarding persistence source is allowed.");

const legacyRoute = read("src/app/(onboarding)/body-goal/page.tsx");
assert.match(legacyRoute, /redirect\("\/onboarding"\)/, "Legacy /body-goal must converge on the canonical onboarding route.");
assert.doesNotMatch(legacyRoute, /GoalSetupClient|OnboardingWizard/, "Legacy route should redirect, not render a second flow.");
const legacyGoalComponent = read("src/features/onboarding/components/GoalSetupClient.tsx");
assert.ok(legacyGoalComponent.includes("OnboardingWizard"), "Legacy GoalSetupClient must be a compatibility shim over the canonical wizard.");
assert.doesNotMatch(legacyGoalComponent, /saveBodyGoal|saveGainModeProfile|completeOnboarding/, "Legacy GoalSetupClient must not own onboarding persistence.");
const legacySoloButton = read("src/features/onboarding/components/SoloModeButton.tsx");
assert.match(legacySoloButton, /router\.replace\("\/onboarding"\)/, "Legacy Solo button must return to canonical onboarding.");

const wizard = read("src/features/onboarding/components/OnboardingWizard.tsx");
assert.ok(wizard.includes("STARTER_PLANS") && wizard.includes("isGainPlanCompatibleGoal"), "Onboarding must consume the shared ready-plan registry.");
assert.ok(wizard.includes('setSetupPath("ready_plan")') && wizard.includes('setSetupPath("own_split")'), "Training setup must preserve both ready-plan and own-split paths.");
assert.ok(wizard.includes('type Step = "welcome" | "basic" | "goal" | "training" | "ready"'), "Onboarding must keep the five-step flow.");
assert.doesNotMatch(wizard, /saveGainModeProfile|equationSex|GainEquationSex/, "General onboarding must not silently activate/configure Gain Mode.");

const splitChooser = read("src/features/splits/components/SplitSetupChooser.tsx");
assert.ok(splitChooser.includes("STARTER_PLANS"), "Split setup must use the same shared ready-plan registry as onboarding.");
const plans = evaluatePureTypeScript("src/features/splits/constants/starter-plans.ts");
const gainPlan = plans.STARTER_PLANS.find((plan) => plan.key === "gain_glutes_4");
assert.ok(gainPlan, "Shared starter registry must contain gain_glutes_4.");
assert.equal(gainPlan.days, 4);
assert.equal(gainPlan.recommendedForGain, true);
assert.equal(gainPlan.womenFocused, true);
assert.equal(plans.isGainPlanCompatibleGoal("muscle_gain"), true);
assert.equal(plans.isGainPlanCompatibleGoal("lose_weight"), false);

const profileService = read("src/features/profile/services/profile.service.ts");
assert.ok(profileService.includes("updateTrainingProfileBasics"), "General fitness basics need one profile service write path.");
assert.ok(profileService.includes('from("profiles")') && profileService.includes('from("gain_mode_profiles")'), "Profile writes must validate the existing Gain compatibility constraint before updating canonical age.");
assert.doesNotMatch(profileService, /\.from\("gain_mode_profiles"\)[\s\S]{0,220}\.update\(\{ age_years:/, "Age mirroring belongs at the database boundary, not in duplicate client writes.");
const gainService = read("src/features/gain-mode/services/gain-mode.service.ts");
assert.doesNotMatch(gainService, /\.from\("profiles"\)[\s\S]{0,220}age_years/, "Gain settings should rely on the database age-sync trigger instead of a second client write.");

const completenessSource = read("src/features/profile/services/profile-completeness.server.ts");
for (const table of ["profiles", "user_body_goals", "body_measurements", "gain_mode_profiles", "split_days", "split_exercises"]) {
  assert.ok(completenessSource.includes(`.from("${table}")`), `Completeness loader must read real source ${table}`);
}

const completeness = evaluatePureTypeScript("src/features/profile/services/profile-completeness.ts");
const now = new Date("2026-09-10T00:00:00.000Z");
const completeBase = {
  ageYears: 23,
  sex: "female",
  heightCm: 165,
  goalType: "muscle_gain",
  trainingLevel: "intermediate",
  weeklyTrainingDays: 4,
  latestWeightAt: "2026-09-09T00:00:00.000Z",
  weighInIntervalDays: 7,
  hasActiveSplit: true,
  hasBodyMeasurements: true,
  gainModeActive: false,
  hasNutritionTarget: false,
};

const general = completeness.calculateProfileCompleteness(completeBase, now);
assert.equal(general.score, 100);
assert.equal(general.totalCount, 8, "Nutrition must not count outside active Gain Mode.");
assert.equal(general.items.some((item) => item.key === "nutrition_target"), false);

const gainMissingNutrition = completeness.calculateProfileCompleteness({ ...completeBase, gainModeActive: true }, now);
assert.equal(gainMissingNutrition.totalCount, 9);
assert.equal(gainMissingNutrition.items.find((item) => item.key === "nutrition_target")?.complete, false);
assert.equal(gainMissingNutrition.nextAction?.key, "nutrition_target");
assert.equal(gainMissingNutrition.nextAction?.href, "/progress/gain/nutrition#nutrition-targets");

const missingMeasurements = completeness.calculateProfileCompleteness({ ...completeBase, hasBodyMeasurements: false }, now);
assert.equal(missingMeasurements.nextAction?.key, "body_measurements");
assert.equal(missingMeasurements.nextAction?.href, "/progress/body#measurements");

const missingLevel = completeness.calculateProfileCompleteness({ ...completeBase, trainingLevel: null }, now);
assert.equal(missingLevel.nextAction?.href, "/profile/settings#profile-training-level");

const missingAvailability = completeness.calculateProfileCompleteness({ ...completeBase, weeklyTrainingDays: null }, now);
assert.equal(missingAvailability.nextAction?.href, "/profile/settings#profile-weekly-availability");

const missingSplit = completeness.calculateProfileCompleteness({ ...completeBase, hasActiveSplit: false }, now);
assert.equal(missingSplit.nextAction?.key, "active_split");
assert.equal(missingSplit.nextAction?.href, "/split/personal");

const staleWeight = completeness.calculateProfileCompleteness({ ...completeBase, latestWeightAt: "2026-08-30T00:00:00.000Z" }, now);
assert.equal(staleWeight.weightStale, true);
assert.equal(staleWeight.nextAction?.key, "current_weight");
assert.equal(staleWeight.nextAction?.href, "/progress/body#weight");

const profilePage = read("src/app/(dashboard)/profile/page.tsx");
assert.ok(profilePage.includes("getProfileCompleteness") && profilePage.includes("ProfileCompletenessCard"), "Profile must render computed completeness.");
const dashboardLayout = read("src/app/(dashboard)/layout.tsx");
assert.ok(dashboardLayout.includes("onboarding_completed_at") && dashboardLayout.includes('redirect("/onboarding")'), "All dashboard routes must respect the onboarding completion gate.");
const profileSettings = read("src/features/profile/components/ProfileSettingsClient.tsx");
for (const anchor of ["profile-age", "profile-height", "profile-goal", "profile-training-level", "profile-weekly-availability"]) {
  assert.ok(profileSettings.includes(`id="${anchor}"`), `Profile CTA needs direct anchor ${anchor}.`);
}
const nutrition = read("src/features/gain-mode/components/GainNutritionPanel.tsx");
assert.ok(nutrition.includes('id="nutrition-targets"') && nutrition.includes('window.location.hash === "#nutrition-targets"'), "Gain nutrition CTA must open the exact target section.");

const packageJson = JSON.parse(read("package.json"));
assert.ok(packageJson.scripts?.["verify:pass6"], "Missing verify:pass6 script.");
assert.ok(packageJson.scripts?.["pass6:check"], "Missing pass6:check script.");
assert.ok(packageJson.scripts?.check === "npm run pass6:check" || packageJson.scripts?.["pass7:check"]?.includes("pass6:check"), "Default/current finalization chain must include Pass 6.");

console.table({
  pass: "6 — Onboarding & Progressive Profile",
  onboarding: "one canonical five-step flow",
  persistence: "existing body/goal/split sources + 3 additive profile basics",
  completeness: "computed contextually from real data",
  profiling: "one contextual next action with direct CTA",
  gain: "ready plan recommended, never forced or silently activated",
});
console.log("\n[OK] OVRLD Finalization Pass 6 contract passed.");
