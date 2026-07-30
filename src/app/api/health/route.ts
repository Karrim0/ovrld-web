import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/config/app";

export function GET() {
  return NextResponse.json({
    status: "ok",
    product: APP_CONFIG.fullName,
    version: APP_CONFIG.version,
    releaseChannel: APP_CONFIG.releaseChannel,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
