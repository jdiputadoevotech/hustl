"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Sign out and hard-navigate home with the login modal queued. The hard nav is
 * deliberate: router.push + router.refresh() re-fetches the route we're leaving,
 * which the proxy bounces to /auth/login now that the cookies are gone — that
 * redirect lands before the push does.
 */
export async function logout() {
  await createClient().auth.signOut();
  window.location.href = "/?auth=login";
}
