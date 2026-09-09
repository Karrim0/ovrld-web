import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "./types";

let hasWarnedAboutMissingConfig = false;

export async function updateSession(request: NextRequest) {
  if (!env.supabase.isConfigured()) {
    if (process.env.NODE_ENV !== "production" && !hasWarnedAboutMissingConfig) {
      hasWarnedAboutMissingConfig = true;
      console.warn(
        "[proxy] Supabase env vars are not set — skipping session refresh and route protection. See .env.example."
      );
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.supabase.url(), env.supabase.anonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const authRoutes = ["/login", "/register", "/forgot-password"];
  const recoveryRoutes = ["/update-password"];
  const onboardingRoutes = ["/onboarding", "/body-goal", "/create-group", "/join-group"];
  const dashboardRoutes = [
    "/dashboard",
    "/workout",
    "/split",
    "/progress",
    "/group",
    "/profile",
  ];

  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));
  const requiresAuthentication = [...recoveryRoutes, ...onboardingRoutes, ...dashboardRoutes].some((route) =>
    path.startsWith(route)
  );

  if (!user && requiresAuthentication) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return response;
}
