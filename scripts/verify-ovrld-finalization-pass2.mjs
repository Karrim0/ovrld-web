import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";

const checks = [];
const add = (name, ok, detail = "") => checks.push({ name, ok, detail });
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [css, brand, gainHub, gainTraining, setupChooser, activeWorkout, progress, manifest, map, runtime, sw] = await Promise.all([
  read("src/app/globals.css"),
  read("src/components/brand/BrandMark.tsx"),
  read("src/features/gain-mode/components/GainModeHubClient.tsx"),
  read("src/features/gain-mode/components/GainTrainingIntegrationClient.tsx"),
  read("src/features/splits/components/SplitSetupChooser.tsx"),
  read("src/features/workouts/components/ActiveWorkoutClient.tsx"),
  read("src/features/progress/components/ProgressDashboardClient.tsx"),
  read("src/app/manifest.ts"),
  read("src/lib/localization/ar-en-map.ts"),
  read("src/lib/localization/runtime.ts"),
  read("public/sw.js"),
]);

add("Emerald brand tokens", css.includes("--accent: #14a874") && css.includes("--brand-accent: #6ee7b7"));
add("New progression brand mark", brand.includes("var(--brand-accent") && brand.includes("45.8 15.8"));
add("Gain Mode uses one top options control", (gainHub.match(/MoreHorizontal/g) ?? []).length === 2, "One import + one rendered icon expected");
add("Gain options sheet exists", gainHub.includes("gc-gain-options-sheet"));
add("Gain training screen is language-aware", gainTraining.includes("useLanguage") && gainTraining.includes("Use recommended plan"));
add("Gain plan is exposed in plan selection", setupChooser.includes('key: "gain_glutes_4"') && setupChooser.includes("Recommended for Gain Mode"));
add("Ready plan chooser includes all starter templates", setupChooser.includes("STARTERS.map") && !setupChooser.includes("filter((starter) => starter.key !== \"gain_glutes_4\")"));
add("Plan selection offers import + manual paths", setupChooser.includes("Import your plan") && setupChooser.includes("Build from scratch"));
add("Workout logging card has dedicated timer", activeWorkout.includes("gc-set-timer-button"));
add("Workout options no duplicate add-exercise row", !activeWorkout.includes('<strong>{ar ? "ضيف تمرين" : "Add exercise"}</strong><small>{ar ? "للجلسة دي أو للجدول الأساسي"'));
add("Old unused Save icon removed", !activeWorkout.match(/\bSave,\n/));
add("Progress page does not restore Gain promo card", !progress.includes("GainModeQuickAccess"));
add("PWA shortcuts are language-neutral", !/[\u0600-\u06ff]/u.test(manifest));
add("Localization map covers workout errors", map.includes("Unable to log this set") && map.includes("email or password is incorrect"));
add("Runtime handles dynamic cm / plan-fit strings", runtime.includes('"$1 cm"') && runtime.includes('"$1% fit"'));
add("Textarea placeholders can localize without touching user content", runtime.includes("SKIP_TEXT_SELECTOR") && runtime.includes("SKIP_ATTRIBUTE_SELECTOR"));
add("PWA cache is versioned for identity assets", /CACHE_VERSION = "v\d+"/.test(sw));

for (const icon of [
  "public/icons/icon-192x192.png",
  "public/icons/icon-512x512.png",
  "public/icons/icon-maskable-512x512.png",
  "public/icons/apple-touch-icon.png",
  "public/brand/ovrld-mark.svg",
]) {
  try { await access(new URL(`../${icon}`, import.meta.url)); add(`Asset: ${icon}`, true); }
  catch { add(`Asset: ${icon}`, false); }
}

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? "✓" : "✗"} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
if (failed.length) {
  console.error(`\n${failed.length} Pass 2 verification check(s) failed.`);
  process.exit(1);
}
console.log(`\nPass 2 verification passed (${checks.length} checks).`);
