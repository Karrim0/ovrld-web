import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["src/app/(onboarding)/body-goal/page.tsx", "redirect(\"/onboarding\")"],
  ["src/features/onboarding/components/OnboardingWizard.tsx", "saveOnboardingSetup"],
  ["src/features/splits/components/SplitManager.tsx", "swapSelectedWeekDay"],
  ["src/features/splits/services/split.service.ts", "swap_week_schedule_days"],
  ["src/features/workouts/components/ActiveWorkoutClient.tsx", "isFinalPlannedSet"],
  ["src/features/body-progress/components/BodyProgressPreview.tsx", "weighInDue"],
  ["supabase/migrations/202609080002_week_schedule_swap_v2.sql", "swap_week_schedule_days"],
  ["docs/OVRLD_V2_PHASE_3_EXPERIENCE.md", "Mobile Experience"],
];

let failed = false;
for (const [relative, needle] of checks) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    console.error(`MISSING ${relative}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    console.error(`CHECK FAILED ${relative}: ${needle}`);
    failed = true;
    continue;
  }
  console.log(`OK ${relative}`);
}

if (fs.existsSync(path.join(root, "node_modules"))) {
  console.warn("WARN node_modules exists; exclude it from share archives.");
}

if (failed) process.exit(1);
console.log("OVRLD v2 Phase 3 structure checks passed.");
