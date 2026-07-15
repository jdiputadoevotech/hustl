import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { hasEnvVars } from "@/lib/utils";

/**
 * App-wide banner shown to a flagged (soft-restricted) user. Flagged users stay
 * logged in and can browse, but are write-locked; this tells them why and links
 * to the appeal form. Renders null for everyone else, so it can be dropped into
 * the layout unconditionally.
 */
export async function FlaggedBanner() {
  if (!hasEnvVars) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("flagged_at")
    .eq("id", user.id)
    .single();
  if (!me?.flagged_at) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2.5 text-sm text-amber-900 dark:text-amber-200 lg:px-8">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Your account is restricted. You can browse, but can&apos;t post jobs,
          leave reviews, offer or accept contracts, or file reports.
        </span>
        <Link
          href="/appeal"
          className="font-medium underline underline-offset-2 hover:no-underline"
        >
          Appeal this decision
        </Link>
      </div>
    </div>
  );
}
