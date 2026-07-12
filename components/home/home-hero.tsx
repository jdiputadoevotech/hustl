import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModalButton } from "@/components/auth/auth-modal-button";

type Variant = "guest" | "student" | "employer" | "admin";

/**
 * Role-aware landing hero. Full-bleed band (breaks out of the site-shell
 * max-w container) with a low-opacity background image at /hero-bg.jpg, a
 * search form, and CTAs swapped per user type. Server component — the only
 * client bit is AuthModalButton (guest CTA), which drops in fine.
 */
export function HomeHero({
  variant,
  name,
  employerEligible = false,
  verificationStatus,
  profileHref,
}: {
  variant: Variant;
  name?: string;
  employerEligible?: boolean;
  verificationStatus?: string | null;
  profileHref?: string;
}) {
  const firstName = (name || "").split(" ")[0];

  const copy: Record<Variant, { title: React.ReactNode; sub: string }> = {
    guest: {
      title: (
        <>
          The campus job board for Carolinians
          <span className="text-green-500">.</span>
        </>
      ),
      sub: "Hustl connects USC students with gigs and part- or full-time work. Browse openings, message employers on Messenger, and get hired — tracked here.",
    },
    student: {
      title: (
        <>
          Welcome back, {firstName}
          <span className="text-green-500">.</span>
        </>
      ),
      sub: "Here's what's fresh on the board. Find a gig, save the good ones, and reach out.",
    },
    employer: {
      title: (
        <>
          Welcome back, {firstName}
          <span className="text-green-500">.</span>
        </>
      ),
      sub: "Ready to find your next hire? Post a role or manage your listings.",
    },
    admin: {
      title: (
        <>
          Admin<span className="text-green-500">.</span>
        </>
      ),
      sub: "Jump back into moderation and verifications.",
    },
  };

  const { title, sub } = copy[variant];

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] -mt-8 w-screen overflow-hidden border-b-2 border-green-500/50">
      {/* Low-opacity background image (user drops /hero-bg.jpg). */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center opacity-[0.2]"
      />
      {/* Subtle brand tint so the band still reads when no image is present. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-green-500/20 via-green-500/[0.06] to-transparent"
      />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col items-center gap-6 px-6 py-20 text-center md:py-28 lg:px-8">
        {variant === "guest" && (
          <span className="rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            For University of San Carlos students
          </span>
        )}

        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">{sub}</p>

        {/* Search — primary action for everyone except admin. */}
        {variant !== "admin" && (
          <form
            action="/jobs"
            method="get"
            className="flex w-full max-w-xl items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                placeholder="Search gigs, roles, skills…"
                aria-label="Search jobs"
                className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" size="lg">
              Search
            </Button>
          </form>
        )}

        {/* Role-swapped CTAs. */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {variant === "guest" && (
            <>
              <AuthModalButton view="signup" size="lg">
                Join Hustl
              </AuthModalButton>
              <Button asChild size="lg" variant="outline">
                <Link href="/jobs">Browse jobs</Link>
              </Button>
            </>
          )}
          {variant === "student" && (
            <>
              <Button asChild size="lg">
                <Link href="/jobs">Browse jobs</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/saved">Saved jobs</Link>
              </Button>
            </>
          )}
          {variant === "employer" && (
            <>
              <Button asChild size="lg">
                <Link href="/jobs/new">Post a job</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </>
          )}
          {variant === "admin" && (
            <>
              <Button asChild size="lg">
                <Link href="/admin/overview">Overview</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/admin/jobs">Manage jobs</Link>
              </Button>
            </>
          )}
        </div>

        {/* Employer-eligibility hint for non-.edu students. */}
        {variant === "student" && employerEligible && profileHref && (
          <Link
            href={profileHref}
            className="text-sm font-medium text-green-600 hover:text-green-700"
          >
            Want to hire students? Become an employer →
          </Link>
        )}

        {/* Verification nudge for unverified students. */}
        {variant === "student" &&
          verificationStatus !== "verified" &&
          profileHref && (
            <p className="text-sm text-muted-foreground">
              {verificationStatus === "pending" ? (
                "Your verification is pending review."
              ) : (
                <Link href={profileHref} className="hover:text-foreground">
                  Get verified to stand out →
                </Link>
              )}
            </p>
          )}
      </div>
    </section>
  );
}
