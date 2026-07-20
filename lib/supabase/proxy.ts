import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Public routes (no auth required): landing, marketplace browse/detail,
  // public profiles, and the auth flow. Everything else requires a session.
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/suspended") ||
    pathname.startsWith("/auth");

  if (!isPublic && !user) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Archive lockout: an admin-archived user is hard-blocked. Re-checked on every
  // request so an active session dies immediately (not just at next login). One
  // extra DB read per authenticated request — acceptable for a hard security
  // lock; promote to a JWT claim if it ever shows up in latency.
  // ponytail: per-request query, upgrade path is a JWT claim.
  if (user && !pathname.startsWith("/suspended") && !pathname.startsWith("/auth")) {
    const { data: me } = await supabase
      .from("profiles")
      .select("archived, deactivated_at")
      .eq("id", user.sub as string)
      .single();
    if (me?.archived) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/suspended";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // Self-deactivated (soft delete): unlike archived, keep the session alive —
    // the user needs it to reactivate — and pen them to /reactivate. The outer
    // guard already lets /auth through, so they can still log out instead.
    if (me?.deactivated_at && !pathname.startsWith("/reactivate")) {
      const url = request.nextUrl.clone();
      url.pathname = "/reactivate";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // First-run onboarding: every user completes it once. .edu users skip the
  // role picker (they're auto-students) but still owe us a Messenger handle and
  // a school name — the onboarding page decides that from the email. The flag
  // lives in JWT user_metadata (set by completeOnboarding), so no DB query here.
  const onboarded = Boolean(
    (user?.user_metadata as Record<string, unknown> | undefined)?.onboarded,
  );
  const onboardingExempt =
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api");
  if (user && !onboarded && !onboardingExempt) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
