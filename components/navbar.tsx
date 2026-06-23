import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";

/**
 * Global top nav rendered in the root layout. Links to the marketplace and the
 * signed-in user's dashboard; auth state on the right.
 */
export function Navbar() {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 sticky top-0 bg-background z-10">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-5 items-center font-semibold">
          <Link href="/" className="text-base">
            Hustl
          </Link>
          <div className="hidden sm:flex gap-4 items-center font-normal text-muted-foreground">
            <Link href="/gigs" className="hover:text-foreground">
              Browse gigs
            </Link>
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </div>
    </nav>
  );
}
