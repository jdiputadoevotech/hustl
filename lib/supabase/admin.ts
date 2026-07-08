import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS entirely. SERVER-ONLY: never
 * import this into a client component, and keep SUPABASE_SERVICE_ROLE_KEY out of
 * any NEXT_PUBLIC_ var. Use only for privileged admin ops the anon key can't do,
 * e.g. deleting an auth.users record.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
