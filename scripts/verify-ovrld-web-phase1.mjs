import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const migrationHashes = {
  "202607140001_initial_schema.sql": "bdefc5425e4ce2e2e7384c2d0c73401e1b292ce6b5a179a504523f14bacc9012",
  "202607140002_fix_group_creation.sql": "8c7e6be9a8fa02ae43a437f483437a41cd784b48557b2cd52d6f3efab59a8772",
  "202607140003_group_split_workouts.sql": "113e345dd19e504ac4e8db0f08b929681db814e17f0193034008987174ee9813",
  "202607140004_offline_progress_solo.sql": "3cdbc1e35cf79939bea9193f26d38ac407ce6fc3cc4edad1b14c35a05aed129a",
  "202607140005_gym_mode_personal_split.sql": "e421448a9809a507d22eadc424be1a3a7963b8bf02054c937b214e36c4b57f4d",
  "202607140006_analytics_group_polish.sql": "6f74a116c17956ffeb7a6d49d620fee0dbe713df9e081a6575b14a251adc7119",
  "202607150007_auth_session_delete_product_restructure.sql": "4e3b4c530eff80f4028de6236ebd58c78469f8d29fcf23a5c50018989633c66e",
  "202607150008_flexible_schedule_and_workout_safety.sql": "0b8cc711be14a9ba5fb87ae35c48c18531d0ab5897a7056c358a5e9975a50b2b",
  "202607160009_flexible_weekly_plans_ai_import.sql": "9d443ce501be63dcc89544a852fc93abe983e1f00e7537a7f5102ca14195134c",
  "202607180001_fix_group_member_weekly_stats.sql": "c5e52e593854291f2315be14b9e0aed49703af1bb291c33330ee5b099ff66df7",
  "202607180002_profile_avatars.sql": "6e0b5651c9eac20bfce419ccdd6f1c4bb937aff4de3c053531e769481932db38",
  "202607190001_gym_mode_focus_v030.sql": "374d79bb6a394c438452cfe372e0948004e958b04f188a85dc713e9a58b18acf",
  "202607190002_offline_theme_split_fix_v040.sql": "5fc355046e9cbe920010acf19c559dba69fef0be9a349f3fa79cb379be862a47",
  "202607190003_rescue_offline_split_v050.sql": "41f429bc27012f0d5f4d3f534d6149a5108e67e63fbacd9b9be74fba0353acb3",
  "202607240001_fix_database_integrity_rpc_lint.sql": "10a171034bf15ace0bcae74f686a25f98b623a9309931744ac5a40e34be2e378",
};

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log("OVRLD Web Phase 1 verification\n");

const packageJson = JSON.parse(await read("package.json"));
assert(packageJson.name === "ovrld-web", "package.json must use the ovrld-web package name.");

const appConfig = await read("src/config/app.ts");
assert(appConfig.includes('name: "OVRLD"'), "APP_CONFIG must expose the OVRLD product name.");

const manifest = await read("src/app/manifest.ts");
assert(manifest.includes("APP_CONFIG.fullName"), "PWA manifest must use the shared OVRLD config.");

const storage = await read("src/config/storage.ts");
for (const marker of ["ovrld:", "gym-crew:", "migrateLegacyClientStorage", "readCompatibleStorage"]) {
  assert(storage.includes(marker), `Missing safe storage compatibility marker: ${marker}`);
}

const offlineConstants = await read("src/lib/constants/index.ts");
assert(
  offlineConstants.includes('OFFLINE_DATABASE_NAME = "gym-crew"'),
  "The legacy IndexedDB physical name must stay stable during Phase 1 to protect offline data.",
);

const types = await read("src/lib/supabase/types.ts");
for (const marker of [
  "target_reps_min",
  "target_reps_max",
  "get_group_member_weekly_stats",
  "apply_girls_strength_4_template_v3",
  "apply_split_template",
]) {
  assert(types.includes(marker), `Supabase types are missing backend marker: ${marker}`);
}

for (const [fileName, expectedHash] of Object.entries(migrationHashes)) {
  const filePath = path.join(root, "supabase", "migrations", fileName);
  const actualHash = sha256(await readFile(filePath));
  assert(actualHash === expectedHash, `Migration drift detected in ${fileName}.`);
}

const serviceWorker = await read("public/sw.js");
assert(serviceWorker.includes("ovrld-static-"), "Service worker must use the OVRLD cache namespace.");
assert(serviceWorker.includes('"gym-crew-"'), "Service worker must clean legacy Gym Crew caches.");

const visibleFiles = [
  "src/config/app.ts",
  "src/app/manifest.ts",
  "src/components/pwa/PwaInstallPrompt.tsx",
  "src/app/global-error.tsx",
  "src/app/(auth)/register/page.tsx",
];
for (const relativePath of visibleFiles) {
  const content = await read(relativePath);
  assert(!content.includes("Gym Crew"), `Visible legacy product name remains in ${relativePath}.`);
}

console.table({
  product: "OVRLD Web",
  package: packageJson.name,
  migrations: Object.keys(migrationHashes).length,
  backendTypes: "mobile-aligned",
  indexedDb: "legacy physical name preserved",
  clientStorage: "ovrld keys + legacy migration",
  pwaCaches: "ovrld namespace + legacy cleanup",
});

console.log("\n[OK] OVRLD Web Phase 1 backend alignment and safe rename contract passed.");
