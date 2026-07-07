import Link from "next/link";
import { Linkedin, Twitter, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t bg-muted">
      <div className="mx-auto w-full max-w-[1400px] grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-10 px-6 lg:px-8 py-12">
        {/* Brand */}
        <div className="max-w-sm">
          <Link href="/" className="text-3xl font-bold tracking-tight">
            Hustl<span className="text-green-500">.</span>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            The marketplace for student talent. Connecting ambitious students
            with real-world opportunities.
          </p>
          {/* ponytail: cosmetic-only social icons, wire hrefs when accounts exist */}
          <div className="mt-6 flex items-center gap-3">
            {[Linkedin, Twitter, Instagram].map((Icon, i) => (
              <span
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded bg-foreground/10 text-muted-foreground"
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>

        {/* Platform links */}
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">
            PLATFORM
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link href="/jobs" className="text-foreground/80 hover:text-foreground">
                Browse Jobs
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="text-foreground/80 hover:text-foreground">
                Freelancer Dashboard
              </Link>
            </li>
            <li>
              <Link href="/jobs/new" className="text-foreground/80 hover:text-foreground">
                Post a Job
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
