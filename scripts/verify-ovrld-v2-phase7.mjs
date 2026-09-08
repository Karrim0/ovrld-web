import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const files = [
  "src/components/brand/BrandMark.tsx",
  "public/brand/ovrld-mark.svg",
  "public/icons/icon-192x192.png",
  "public/icons/icon-512x512.png",
  "public/icons/icon-maskable-512x512.png",
  "public/icons/apple-touch-icon.png",
  "src/features/progress/components/ProgressTabs.tsx",
  "src/app/(dashboard)/dashboard/page.tsx",
  "src/app/(dashboard)/progress/page.tsx",
  "src/app/(dashboard)/progress/body/page.tsx",
  "src/app/(dashboard)/profile/page.tsx",
  "src/features/gain-mode/components/GainModeHomeCard.tsx",
  "src/features/gain-mode/components/GainModeHubClient.tsx",
  "src/features/progress/components/ProgressDashboardClient.tsx",
  "src/features/splits/components/SplitManager.tsx",
  "src/app/globals.css",
  "src/app/manifest.ts",
  "public/sw.js",
];
for (const file of files) assert.ok(exists(file), `Missing Phase 7 file: ${file}`);

for (const file of files.filter((file) => /\.(ts|tsx)$/.test(file))) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `${file} has TypeScript parse errors`);
}

const header = read("src/components/layout/DashboardHeader.tsx");
assert.match(header, /BrandMark/);
assert.match(header, /hidden lg:inline-flex/);

const auth = read("src/components/layout/AuthShell.tsx");
const sidebar = read("src/components/navigation/DesktopSidebar.tsx");
assert.match(auth, /BrandMark/);
assert.match(sidebar, /BrandMark/);
assert.doesNotMatch(auth, /<Dumbbell/);
assert.doesNotMatch(sidebar, /<Dumbbell/);

const nav = read("src/constants/navigation.ts");
assert.match(nav, /id: "profile"/);
assert.doesNotMatch(nav, /id: "group"/);

const dashboard = read("src/app/(dashboard)/dashboard/page.tsx");
assert.ok(dashboard.indexOf("<TodaysWorkoutClient") < dashboard.indexOf("<GainModeHomeCard"));
assert.ok(dashboard.indexOf("<GainModeHomeCard") < dashboard.indexOf("<PersonalSplitOverviewClient"));
assert.doesNotMatch(dashboard, /أهم خطوة في الـprocess|إيه عليك دلوقتي/);

const gainHome = read("src/features/gain-mode/components/GainModeHomeCard.tsx");
assert.match(gainHome, /gc-number-cell/);
assert.doesNotMatch(gainHome, /snapshot\.review\.detail/);

const gainHub = read("src/features/gain-mode/components/GainModeHubClient.tsx");
assert.match(gainHub, /gc-gain-summary/);
assert.match(gainHub, /gc-priority-row/);
assert.doesNotMatch(gainHub, /رحلتك في مكان واحد|Simple Mode|مش بنطارد رقم الميزان/);

const progressPage = read("src/app/(dashboard)/progress/page.tsx");
const bodyPage = read("src/app/(dashboard)/progress/body/page.tsx");
assert.match(progressPage, /ProgressTabs active="training"/);
assert.match(bodyPage, /ProgressTabs active="body"/);

const progress = read("src/features/progress/components/ProgressDashboardClient.tsx");
assert.match(progress, /gc-progress-summary/);
assert.match(progress, /gc-empty-state/);
assert.doesNotMatch(progress, /StatCard/);

const split = read("src/features/splits/components/SplitManager.tsx");
assert.match(split, /gc-plan-summary/);
assert.match(split, /إنشاء أو استيراد جدول/);
assert.match(split, /خيارات متقدمة/);
assert.doesNotMatch(split, /جدولك قدامك، والأسبوع مرن/);

const profile = read("src/app/(dashboard)/profile/page.tsx");
assert.match(profile, /gc-list-panel/);
assert.match(profile, /Crew/);
assert.match(profile, /اختياري/);
assert.doesNotMatch(profile, /بيانات تمرينك خاصة/);

const css = read("src/app/globals.css");
for (const className of ["gc-daily-panel", "gc-number-cell", "gc-segmented", "gc-list-panel", "gc-header-brand"]) {
  assert.ok(css.includes(`.${className}`), `Missing Phase 7 CSS class: ${className}`);
}

const manifest = read("src/app/manifest.ts");
assert.match(manifest, /icon-maskable-512x512\.png/);
assert.match(manifest, /purpose: "maskable"/);
const sw = read("public/sw.js");
assert.match(sw, /CACHE_VERSION = "v11"/);

const migrations = fs.readdirSync(path.join(root, "supabase/migrations")).filter((name) => /^20260908/.test(name)).sort();
assert.ok(migrations.includes("202609080003_gain_mode_v1.sql"));
assert.equal(migrations.filter((name) => name > "202609080003_gain_mode_v1.sql").length, 0, "Phase 7 must not add a database migration.");

const map = read("src/lib/localization/ar-en-map.ts");
for (const phrase of ["حسابي", "الأرقام القياسية", "القوة ماشية لفوق", "بنجمع خط الأساس"]) assert.ok(map.includes(phrase));

console.table({
  phase: "7 — product clarity & UX polish",
  brand: "vector mark + PWA icon family",
  home: "today → goal/process → week",
  progress: "training/body split with numbers first",
  plan: "core edit first; setup/audit/cosmetics secondary",
  navigation: "home · plan · gym · progress · account",
  database: "no new migration",
});
console.log("\n[OK] OVRLD V2 Phase 7 contract passed.");
