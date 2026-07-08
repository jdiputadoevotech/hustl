import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** The subset of JWT claims Hustl relies on. */
export interface CurrentUser {
  id: string; // claims.sub — matches profiles.id / auth.users.id
  email: string;
}

/**
 * Returns the signed-in user's claims, or null if unauthenticated.
 * Use in server components / server actions. RLS is the real authority;
 * this is for UI gating and reads. Open access — no role/domain checks.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub as string, email: (claims.email as string) ?? "" };
}

/**
 * Students use .edu emails and can't become employers. Matches ".edu" as a
 * domain segment so "x.education.com" doesn't false-positive.
 */
export function canBecomeEmployer(email: string): boolean {
  return !/\.edu(\.|$)/i.test(email);
}

/**
 * Guard for admin-only server code (the /admin layout + every admin action).
 * Redirects non-admins to "/" so a leaked route or forged request still can't
 * act. Returns the admin's CurrentUser on success. The nav only *hides* admin
 * links — this is the real enforcement (there is no admin RLS).
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "admin") redirect("/");
  return user;
}
