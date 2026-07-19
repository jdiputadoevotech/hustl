import Link from "next/link";
import {
  BadgeCheck,
  Bookmark,
  Briefcase,
  CheckCircle2,
  Clock,
  Handshake,
  Inbox,
  PencilLine,
  Plus,
  Search,
  Send,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { StarRating } from "@/components/marketplace/star-rating";
import { fetchReviewStats } from "@/lib/reviews";

type Stat = { label: string; value: number; icon: LucideIcon; href: string };

/**
 * Bento hero + stat tiles, shown above the tab strip on every dashboard tab.
 * Each tile links into the tab + filter it summarizes, so the numbers are a
 * way in rather than decoration.
 */
export async function DashboardHero({
  userId,
  isEmployer,
  fullName,
  verified,
}: {
  userId: string;
  isEmployer: boolean;
  fullName: string;
  verified: boolean;
}) {
  const supabase = await createClient();

  // Count-only queries (head:true) read a user's own rows under normal RLS —
  // same pattern as the admin overview, no service client needed.
  const countMine = (
    table: "jobs" | "contracts" | "reviews" | "saved_jobs",
    col: string,
    match?: Record<string, unknown>,
  ) => {
    const q = supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(col, userId);
    return match ? q.match(match) : q;
  };

  let stats: Stat[] = [];
  let rating = { average: 0, count: 0 };

  if (isEmployer) {
    const [
      { count: activeJobs },
      { count: pendingOffers },
      { count: activeHires },
      { count: completedHires },
      stars,
    ] = await Promise.all([
      countMine("jobs", "employer_id", { is_disabled: false }),
      countMine("contracts", "employer_id", { status: "Offered" }),
      countMine("contracts", "employer_id", { status: "Accepted" }),
      countMine("contracts", "employer_id", { status: "Completed" }),
      fetchReviewStats(supabase, userId),
    ]);

    rating = { count: stars.count, average: stars.avg };

    stats = [
      {
        label: "Active jobs",
        value: activeJobs ?? 0,
        icon: Briefcase,
        href: "/dashboard?tab=jobs&status=active",
      },
      {
        label: "Pending offers",
        value: pendingOffers ?? 0,
        icon: Send,
        href: "/dashboard?tab=offers&status=Offered",
      },
      {
        label: "Active hires",
        value: activeHires ?? 0,
        icon: Handshake,
        href: "/dashboard?tab=offers&status=Accepted",
      },
      {
        label: "Completed hires",
        value: completedHires ?? 0,
        icon: CheckCircle2,
        href: "/dashboard?tab=offers&status=Completed",
      },
    ];
  } else {
    const [
      { count: pendingOffers },
      { count: inProgress },
      { count: completedJobs },
      { count: savedJobs },
    ] = await Promise.all([
      countMine("contracts", "student_id", { status: "Offered" }),
      countMine("contracts", "student_id", { status: "Accepted" }),
      countMine("contracts", "student_id", { status: "Completed" }),
      countMine("saved_jobs", "student_id"),
    ]);

    stats = [
      {
        label: "Pending offers",
        value: pendingOffers ?? 0,
        icon: Inbox,
        href: "/dashboard?tab=work&status=Offered",
      },
      {
        label: "In progress",
        value: inProgress ?? 0,
        icon: Clock,
        href: "/dashboard?tab=work&status=Accepted",
      },
      {
        label: "Completed jobs",
        value: completedJobs ?? 0,
        icon: CheckCircle2,
        href: "/dashboard?tab=work&status=Completed",
      },
      {
        label: "Saved jobs",
        value: savedJobs ?? 0,
        icon: Bookmark,
        href: "/saved",
      },
    ];
  }

  const firstName = fullName.split(/\s+/)[0];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {/* Hero greeting */}
      <Card className="col-span-2 flex flex-col justify-between gap-6 p-6 md:row-span-2">
        <div className="flex items-start gap-4">
          <AvatarInitials name={fullName} className="h-14 w-14 text-lg" />
          <div className="min-w-0 space-y-2">
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {firstName}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {isEmployer ? "Employer" : "Student"}
              </Badge>
              {verified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="h-4 w-4" />
                  Verified
                </span>
              )}
              {isEmployer && (
                <StarRating average={rating.average} count={rating.count} />
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEmployer ? (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/jobs/new">
                <Plus className="h-4 w-4" />
                Post a job
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/jobs">
                <Search className="h-4 w-4" />
                Browse jobs
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/profile/edit">
              <PencilLine className="h-4 w-4" />
              Edit profile
            </Link>
          </Button>
        </div>
      </Card>

      {/* Stat tiles — each one links into the view it counts */}
      {stats.map(({ label, value, icon: Icon, href }) => (
        <Card key={label} className="transition-colors hover:border-foreground/25">
          <Link
            href={href}
            className="flex h-full flex-col justify-between gap-3 rounded-lg p-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </Link>
        </Card>
      ))}
    </div>
  );
}
