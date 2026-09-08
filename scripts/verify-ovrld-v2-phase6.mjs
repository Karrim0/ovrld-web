import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const phaseFiles = [
  "supabase/migrations/202609080003_gain_mode_v1.sql",
  "docs/OVRLD_V2_PHASE_6_APPLY.md",
  "src/features/gain-mode/types.ts",
  "src/features/gain-mode/services/gain-mode.service.ts",
  "src/features/gain-mode/components/GainModeHomeCard.tsx",
  "src/features/gain-mode/components/GainModeProgressCard.tsx",
  "src/features/gain-mode/components/GainModeActivationClient.tsx",
  "src/features/gain-mode/components/GainModeHubClient.tsx",
  "src/features/onboarding/components/GoalSetupClient.tsx",
  "src/features/onboarding/services/onboarding.service.ts",
  "src/app/(dashboard)/progress/gain/page.tsx",
  "src/app/(dashboard)/progress/body/page.tsx",
  "src/features/body-progress/components/BodyProgressClient.tsx",
  "src/features/body-progress/services/body-progress.service.ts",
  "src/app/(dashboard)/dashboard/page.tsx",
  "src/app/(dashboard)/profile/page.tsx",
  "src/features/splits/components/SplitManager.tsx",
  "public/sw.js",
];

for (const file of phaseFiles) assert.ok(exists(file), `Missing Phase 6 file: ${file}`);

const codeFiles = phaseFiles.filter((file) => /\.(ts|tsx)$/.test(file));
for (const file of codeFiles) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const migration = read("supabase/migrations/202609080003_gain_mode_v1.sql");
assert.match(migration, /onboarding_completed_at/);
assert.match(migration, /create table if not exists public\.gain_mode_profiles/);
assert.match(migration, /enable row level security/);
assert.match(migration, /auth\.uid\(\) = user_id/);

const onboardingService = read("src/features/onboarding/services/onboarding.service.ts");
assert.match(onboardingService, /onboarding_completed_at/);
assert.match(onboardingService, /\/body-goal/);

const goalSetup = read("src/features/onboarding/components/GoalSetupClient.tsx");
assert.match(goalSetup, /OVRLD العادي/);
assert.match(goalSetup, /Gain Mode · زيادة الوزن للبنات/);
assert.match(goalSetup, /goalType: "gain_weight"/);
assert.match(goalSetup, /saveGainModeProfile/);
assert.match(goalSetup, /completeOnboarding/);
assert.match(goalSetup, /Math\.abs\(existingBody\.latest\.weightKg - currentWeight\) >= 0\.05/);
assert.doesNotMatch(goalSetup, /خسارة وزن|إعادة تشكيل الجسم|زيادة عضل/);

const gainService = read("src/features/gain-mode/services/gain-mode.service.ts");
assert.match(gainService, /Math\.round\(weightKg \* 1\.6\)/);
assert.match(gainService, /appetiteLevel === "low"/);
assert.match(gainService, /fetchProgressIntelligence/);
assert.match(gainService, /fetchAdherenceSummary/);
assert.doesNotMatch(gainService, /OpenAI|chat completion|responses\.create/i, "Gain Mode V1 review must remain deterministic.");
assert.match(gainService, /estimateRecentWeeklyWeightChange/);
assert.match(gainService, /recent\.length < 3/);
assert.match(gainService, /spanDays < 14/);
assert.match(gainService, /21 \* 86_400_000/);
assert.ok(
  gainService.indexOf("fetchGainModeProfile(userId)") < gainService.indexOf("fetchBodyProgress(userId)"),
  "Generic users should not pay the heavier Gain Mode snapshot queries before activation.",
);

const bodyService = read("src/features/body-progress/services/body-progress.service.ts");
assert.match(bodyService, /startData/);
assert.match(bodyService, /ascending: true/);
assert.match(bodyService, /true first measurement/);

const dashboard = read("src/app/(dashboard)/dashboard/page.tsx");
assert.match(dashboard, /GainModeHomeCard/);
assert.ok(dashboard.indexOf("<TodaysWorkoutClient") < dashboard.indexOf("<GainModeHomeCard"), "Today's workout must remain the first Home action.");
assert.ok(dashboard.indexOf("<GainModeHomeCard") < dashboard.indexOf("<PersonalSplitOverviewClient"), "Process action must appear before the compact weekly plan.");

const body = read("src/features/body-progress/components/BodyProgressClient.tsx");
assert.doesNotMatch(body, /lose_weight|recomposition|muscle_gain|maintain_weight/);
assert.match(body, /هدف زيادة الوزن الوحيد المتاح حاليًا موجود في Gain Mode/);
assert.match(body, /saveTrackingCadence/);

const split = read("src/features/splits/components/SplitManager.tsx");
assert.match(split, /خيارات متقدمة/);
assert.match(split, /تحليل الخطة/);

const profilePage = read("src/app/(dashboard)/profile/page.tsx");
assert.match(profilePage, /LanguageSwitcher variant="panel"/);
assert.match(profilePage, /ThemeSwitcher variant="panel"/);

const sw = read("public/sw.js");
assert.match(sw, /CACHE_VERSION = "v10"/);
assert.match(sw, /ovrld-static-/);
assert.match(sw, /ovrld-pages-/);
assert.match(sw, /\/progress\/gain/);

const localizationMap = read("src/lib/localization/ar-en-map.ts");
for (const phrase of [
  "Gain Mode · زيادة الوزن للبنات",
  "رحلتك في مكان واحد",
  "محتاجين 3 قراءات على الأقل عبر حوالي أسبوعين قبل أي تعديل. كمّلي القياسات والتمرين.",
]) {
  assert.ok(localizationMap.includes(phrase), `Missing English localization bridge for: ${phrase}`);
}

const workflow = read(".github/workflows/ovrld-web-ci.yml");
assert.match(workflow, /npm run phase6:check/);

const packageJson = JSON.parse(read("package.json"));
assert.ok(packageJson.scripts?.["verify:phase6"], "Missing verify:phase6 script.");
assert.ok(packageJson.scripts?.["phase6:check"], "Missing phase6:check script.");
assert.equal(packageJson.scripts?.check, "npm run phase6:check", "Default check must point to Phase 6.");

console.table({
  phase: "6 — optional Gain Mode foundation",
  product: "general gym tracker + one deep Goal Mode",
  onboarding: "explicit completion gate; Gain Mode can no longer be skipped by workspace creation",
  gainMode: "weight trend + appetite strategy + training/adherence context",
  progress: "training/body split + no zero-wall empty state",
  plan: "advanced cosmetics collapsed",
  database: "1 new migration: gain profile + onboarding completion",
});
console.log("\n[OK] OVRLD V2 Phase 6 contract passed.");
