"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps page content in the standard navbar + footer + centered container.
 * Onboarding renders bare (no chrome) — those pages are a focused first-run
 * step where the nav links go nowhere useful yet.
 *
 * navbar/footer are passed in as already-rendered server elements so this
 * client component never imports the server-only Supabase client Navbar uses.
 */
export function SiteShell({
  navbar,
  adminNav,
  footer,
  children,
}: {
  navbar: React.ReactNode;
  adminNav: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const bare = usePathname()?.startsWith("/onboarding");

  if (bare) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <>
      {navbar}
      {adminNav}
      <main className="min-h-screen w-full">
        <div className="mx-auto w-full max-w-[1400px] px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
      {footer}
    </>
  );
}
