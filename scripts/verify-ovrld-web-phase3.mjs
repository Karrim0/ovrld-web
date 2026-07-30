import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  ".gitattributes",
  ".github/workflows/ovrld-web-ci.yml",
  "README.md",
  "VERIFY_OVRLD_WEB_FINAL.cmd",
  "docs/OVRLD_WEB_FINAL_RELEASE.md",
  "docs/PRODUCTION_DEPLOYMENT.md",
  "docs/SECURITY_AUDIT.md",
  "docs/archive/README.md",
  "scripts/verify-production-env.mjs",
];

for (const file of requiredFiles) {
  assert.ok(exists(file), `Missing final release file: ${file}`);
}

const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
assert.equal(packageJson.name, "ovrld-web", "Package name must be ovrld-web.");
assert.equal(packageJson.version, "1.8.0", "Package version must be 1.8.0.");
assert.equal(packageLock.version, packageJson.version, "package-lock version must match package.json.");
assert.equal(packageLock.packages[""].version, packageJson.version, "Lockfile root package version must match.");
assert.equal(packageJson.engines?.node, ">=22 <23", "Node.js 22 must be the release runtime.");
for (const script of [
  "verify:phase1",
  "verify:phase2",
  "verify:phase3",
  "phase3:check",
  "verify:production-env",
  "security:audit:production",
]) {
  assert.ok(packageJson.scripts?.[script], `Missing npm script: ${script}`);
}

const appConfig = read("src/config/app.ts");
assert.match(appConfig, /name:\s*"OVRLD"/);
assert.match(appConfig, /fullName:\s*"OVRLD Web"/);
assert.match(appConfig, /version:\s*"1\.8\.0"/);
assert.match(appConfig, /releaseChannel:\s*"stable"/);

const manifest = read("src/app/manifest.ts");
assert.match(manifest, /short_name:\s*APP_CONFIG\.name/);

const serviceWorker = read("public/sw.js");
assert.match(serviceWorker, /CACHE_VERSION = "v7"/);
assert.match(serviceWorker, /"gym-crew-"/);

const health = read("src/app/api/health/route.ts");
for (const marker of ["APP_CONFIG.fullName", "APP_CONFIG.version", "VERCEL_GIT_COMMIT_SHA"]) {
  assert.ok(health.includes(marker), `Health endpoint is missing ${marker}.`);
}

const readme = read("README.md");
assert.match(readme, /OVRLD Web v1\.8\.0/);
assert.match(readme, /docs\/PRODUCTION_DEPLOYMENT\.md/);
assert.doesNotMatch(readme, /Current alignment phase/);

const workflow = read(".github/workflows/ovrld-web-ci.yml");
assert.match(workflow, /npm run phase3:check/);
assert.match(workflow, /node-version:\s*22/);
assert.doesNotMatch(workflow, /npm audit fix --force/);

const forbiddenRootFiles = [
  "AUTH_PRODUCTION_CHECKLIST.md",
  "FILES_INCLUDED.txt",
  "FILES_INCLUDED_PHASE_6.txt",
  "FILES_INCLUDED_PHASE_7.txt",
  "FILES_INCLUDED_PHASE_8.txt",
  "FILES_INCLUDED_V1_1.txt",
  "GYM_CREW_V1_1_PATCH_NOTES.md",
  "GYM_CREW_V1_2_UX_PATCH_NOTES.md",
  "GYM_CREW_V1_3_1_UI_HOTFIX_NOTES.md",
  "GYM_CREW_V1_3_2_WORKOUT_MOBILE_HOTFIX_NOTES.md",
  "GYM_CREW_V1_3_WEIGHT_FIRST_PATCH_NOTES.md",
  "GYM_CREW_V1_6_1_BILINGUAL_NOTES.md",
  "GYM_CREW_V1_7_THEME_UI_POLISH_NOTES.md",
  "HOME_PLAN_HOTFIX_README.md",
  "HOTFIX_README.txt",
  "PATCH_NOTES.md",
  "PHASE_6_PATCH_NOTES.md",
  "PHASE_7_PATCH_NOTES.md",
  "PHASE_8_FINAL_RELEASE.md",
  "e stability#Uf022",
];
for (const file of forbiddenRootFiles) {
  assert.ok(!exists(file), `Historical file must not remain in the repository root: ${file}`);
}

for (const file of ["public/file.svg", "public/globe.svg", "public/next.svg", "public/vercel.svg", "public/window.svg"]) {
  assert.ok(!exists(file), `Unused starter asset must be removed: ${file}`);
}

const envExample = read(".env.example");
assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL=/);
assert.match(envExample, /NEXT_PUBLIC_SUPABASE_ANON_KEY=/);
assert.match(envExample, /NEXT_PUBLIC_APP_URL=/);
assert.doesNotMatch(envExample, /service_role/iu);
assert.doesNotMatch(envExample, /https:\/\/gym-crew-(?:one|two)\.vercel\.app/iu);

const activeFilesToScan = [
  "README.md",
  "src/config/app.ts",
  "src/app/layout.tsx",
  "src/app/manifest.ts",
  "src/components/pwa/PwaInstallPrompt.tsx",
  "docs/PRODUCTION_DEPLOYMENT.md",
  "docs/OVRLD_WEB_FINAL_RELEASE.md",
];
for (const file of activeFilesToScan) {
  const content = read(file);
  assert.doesNotMatch(content, /https:\/\/gym-crew-(?:one|two)\.vercel\.app/iu, `Obsolete production URL remains in ${file}.`);
}

console.table({
  product: "OVRLD Web",
  version: packageJson.version,
  release: "stable",
  repository: "final structure",
  pwa: "cache v7 + OVRLD short name",
  deployment: "environment + Vercel + Supabase checklist",
  security: "targeted audit workflow; no forced upgrades",
});

console.log("\n[OK] OVRLD Web Phase 3 final release contract passed.");
