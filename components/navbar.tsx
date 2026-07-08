import Link from "next/link";
import { Search, Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { hasEnvVars } from "@/lib/utils";
import { EnvVarWarning } from "@/components/env-var-warning";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

/**
 * Fiverr-style top nav: logo, centered marketplace search, and either the
 * Orders link + avatar menu (signed in) or sign in / join (signed out).
 */
export async function Navbar() {
  const user = hasEnvVars ? await getCurrentUser() : null;

  let displayName = "";
  let isStudent = false;
  if (user) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    displayName = profile?.full_name || user.email.split("@")[0];
    isStudent = profile?.role === "student";
  }

  return (
    <nav className="w-full border-b bg-background sticky top-0 z-10">
      <div className="mx-auto w-full max-w-[1400px] flex items-center gap-6 sm:gap-8 px-6 lg:px-8 h-20">
        {/* Logo */}
        <Link href="/" className="text-4xl font-bold tracking-tight shrink-0">
          Hustl<span className="text-green-500">.</span>
        </Link>

        {/* Search */}
        <form
          action="/jobs"
          method="get"
          className="flex-1 max-w-3xl flex"
          role="search"
        >
          <input
            name="q"
            type="search"
            placeholder="Search for jobs, gigs, and roles"
            aria-label="Search jobs"
            className="h-12 w-full rounded-l-md border border-r-0 border-input bg-transparent px-5 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            aria-label="Search"
            className="h-12 px-5 rounded-r-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
          >
            <Search className="h-5 w-5" />
          </button>
        </form>

        {/* Right side */}
        <div className="flex items-center gap-5 sm:gap-6 shrink-0 ml-auto">
          <Link
            href="/jobs"
            className="hidden sm:inline text-base font-medium text-foreground/80 hover:text-foreground"
          >
            Jobs
          </Link>
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden sm:inline text-base font-medium text-foreground/80 hover:text-foreground"
              >
                Dashboard
              </Link>
              {isStudent && (
                <Link
                  href="/saved"
                  aria-label="Saved jobs"
                  title="Saved jobs"
                  className="text-foreground/80 hover:text-foreground"
                >
                  <Bookmark className="h-5 w-5" />
                </Link>
              )}
              <UserMenu userId={user.id} name={displayName} />
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-base font-medium text-foreground/80 hover:text-foreground"
              >
                Sign in
              </Link>
              <Button asChild size="lg">
                <Link href="/auth/sign-up">Join</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
