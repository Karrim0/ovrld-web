import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
}

function mask(value) {
  if (!value) return "missing";
  if (value.length <= 10) return "configured";
  return `${value.slice(0, 5)}…${value.slice(-4)}`;
}

const fileEnv = parseEnvFile(path.join(process.cwd(), ".env.local"));
const env = { ...fileEnv, ...process.env };
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const appUrl = env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
const openAiKey = env.OPENAI_API_KEY?.trim();

let parsedSupabaseUrl;
let parsedAppUrl;

try {
  parsedSupabaseUrl = new URL(supabaseUrl);
  if (parsedSupabaseUrl.protocol !== "https:") fail("NEXT_PUBLIC_SUPABASE_URL must use HTTPS.");
  if (/YOUR_PROJECT|example/iu.test(parsedSupabaseUrl.href)) fail("NEXT_PUBLIC_SUPABASE_URL still contains a placeholder.");
} catch {
  fail("NEXT_PUBLIC_SUPABASE_URL is missing or invalid.");
}

if (!anonKey || anonKey.length < 20 || /YOUR_|service[_-]?role|secret/iu.test(anonKey)) {
  fail("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing, placeholder-like, or unsafe.");
}

try {
  parsedAppUrl = new URL(appUrl);
  if (parsedAppUrl.protocol !== "https:") fail("NEXT_PUBLIC_APP_URL must use HTTPS for production.");
  if (/localhost|127\.0\.0\.1|YOUR_OVRLD_DOMAIN|example/iu.test(parsedAppUrl.href)) {
    fail("NEXT_PUBLIC_APP_URL must be the final production origin, not localhost or a placeholder.");
  }
  if (parsedAppUrl.pathname !== "/") fail("NEXT_PUBLIC_APP_URL must be an origin without a path.");
} catch {
  fail("NEXT_PUBLIC_APP_URL is missing or invalid.");
}

if (openAiKey && /NEXT_PUBLIC|YOUR_SERVER_ONLY_KEY/iu.test(openAiKey)) {
  fail("OPENAI_API_KEY contains a placeholder or appears to be exposed incorrectly.");
}

console.table({
  supabaseUrl: parsedSupabaseUrl?.origin ?? "invalid",
  anonKey: mask(anonKey),
  appUrl: parsedAppUrl?.origin ?? "invalid",
  authCallback: parsedAppUrl ? `${parsedAppUrl.origin}/auth/callback` : "invalid",
  smartPlanImport: openAiKey ? "configured" : "disabled (optional)",
});

if (process.exitCode) {
  console.error("\n[FAILED] Production environment validation failed.");
  process.exit(process.exitCode);
}

console.log("\n[OK] OVRLD Web production environment is configured.");
