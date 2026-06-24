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
