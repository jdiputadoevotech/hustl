import { createClient } from "@/lib/supabase/server";

/** The subset of JWT claims Hustl relies on. */
export interface CurrentUser {
  id: string; // claims.sub — matches profiles.id / auth.users.id
  email: string;
  isSeller: boolean; // true when email is @usc.edu.ph
}

/** USC seller domain gate. Mirrors the Carolinian RLS policy in SETUP.md. */
export function isCarolinian(email: string | undefined | null): boolean {
  return !!email && email.toLowerCase().endsWith("@usc.edu.ph");
}

/**
 * Returns the signed-in user's claims, or null if unauthenticated.
 * Use in server components / server actions. RLS is the real authority;
 * this is for UI gating and reads.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  const email = (claims.email as string) ?? "";
  return { id: claims.sub as string, email, isSeller: isCarolinian(email) };
}
