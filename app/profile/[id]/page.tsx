import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MessageCircle,
  LayoutDashboard,
  Pencil,
  Globe,
  Facebook,
  Instagram,
  Linkedin,
  BadgeCheck,
  ShieldCheck,
  Users,
  Briefcase,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canBecomeEmployer } from "@/lib/auth";
import { requestVerification } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { JobCard } from "@/components/marketplace/job-card";
import { StarRating } from "@/components/marketplace/star-rating";
import {
  ReviewList,
  reviewJob,
  type ReviewItem,
} from "@/components/marketplace/review-list";
import { ReviewsSection } from "@/components/marketplace/reviews-section";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import { FormError } from "@/components/marketplace/form-error";
import { Pagination } from "@/components/shared/pagination";
import { monthYear } from "@/lib/time";
import { JOB_CARD_SELECT } from "@/lib/jobs";
import { GRID_PAGE_SIZE, PAGE_SIZE, pageRange } from "@/lib/paging";
import {
  REVIEW_SELECT,
  applyReviewSort,
  asReviewSort,
  fetchReviewStats,
  toReceivedReviewItems,
  EMPTY_REVIEW_STATS,
  type ReviewStats,
} from "@/lib/reviews";
import type {
  ContractStatus,
  Role,
  Socials,
  VerificationStatus,
} from "@/lib/types/database";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{
  error?: string;
  reportOk?: string;
  reportError?: string;
  // Two independent lists share this URL, so each pager gets its own param.
  jobsPage?: string;
  reviewsPage?: string;
  rsort?: string;
}>;

/** Which socials render, in order, with their icon. */
const SOCIAL_LINKS = [
  { key: "facebook", Icon: Facebook, label: "Facebook" },
  { key: "instagram", Icon: Instagram, label: "Instagram" },
  { key: "linkedin", Icon: Linkedin, label: "LinkedIn" },
] as const;

type ContractRow = {
  id: string;
  status: ContractStatus;
  jobs: { id: string; title: string | null } | null;
  profiles: {
    id: string;
    full_name: string | null;
    establishment_name: string | null;
  } | null;
};

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { error, reportOk, reportError, jobsPage, reviewsPage, rsort } =
    await searchParams;
  const reviewSort = asReviewSort(rsort);
  const jobPaging = pageRange(jobsPage, GRID_PAGE_SIZE);
  const reviewPaging = pageRange(reviewsPage, PAGE_SIZE);
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, bio, skills, messenger_username, establishment_name, establishment_description, website_url, socials, contracts_hidden, verification_status, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (profileError) throw profileError; // real failure → error boundary, not a fake 404
  if (!profile) notFound(); // genuinely missing → 404

  const user = await getCurrentUser();
  const isOwner = user?.id === profile.id;
  const role = (profile.role ?? "student") as Role;
  const isEmployer = role === "employer";
  const isAdmin = role === "admin";
  const socials = (profile.socials ?? {}) as Socials;
  const vStatus = (profile.verification_status ?? "none") as VerificationStatus;
  const isVerified = vStatus === "verified";

  // Employer: posted jobs + reviews received. Student: contracts + reviews made.
  type ProfileJobCard = Parameters<typeof JobCard>[0]["job"];
  let jobs: ProfileJobCard[] = [];
  let jobsTotal = 0;
  let receivedReviews: ReviewItem[] = [];
  let reviewStats: ReviewStats = EMPTY_REVIEW_STATS;
  let madeReviews: ReviewItem[] = [];
  let madeTotal = 0;
  let contracts: ContractRow[] = [];

  if (isEmployer) {
    const [{ data, count }, { data: reviewsRaw }, stats] = await Promise.all([
      supabase
        .from("jobs_with_employer")
        .select(JOB_CARD_SELECT, { count: "exact" })
        .eq("employer_id", id)
        .eq("is_disabled", false) // public profile shows only listed jobs
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }) // stable tiebreak for paging
        .range(jobPaging.from, jobPaging.to),
      applyReviewSort(
        supabase
          .from("reviews")
          .select(REVIEW_SELECT)
          .eq("employer_id", id)
          .eq("archived", false), // hide admin-archived reviews from the public
        reviewSort,
      ).range(reviewPaging.from, reviewPaging.to),
      // Aggregate over ALL reviews, not just this page — reads only `rating`.
      fetchReviewStats(supabase, id),
    ]);

    jobs = (data ?? []) as unknown as ProfileJobCard[];
    jobsTotal = count ?? 0;
    receivedReviews = toReceivedReviewItems(reviewsRaw);
    reviewStats = stats;
  } else if (!isAdmin) {
    // Contracts are RLS-gated: parties always see them; others only when the
    // student hasn't hidden them. When hidden, show a placeholder to visitors.
    if (isOwner || !profile.contracts_hidden) {
      const { data } = await supabase
        .from("contracts")
        .select(
          "id, status, created_at, jobs ( id, title ), profiles:employer_id ( id, full_name, establishment_name )",
        )
        .eq("student_id", id)
        .order("created_at", { ascending: false });
      contracts = (data ?? []) as unknown as ContractRow[];
    }

    const { data: madeRaw, count: madeCount } = await supabase
      .from("reviews")
      .select(
        "id, rating, comment, created_at, employer_id, profiles:employer_id ( full_name, establishment_name ), contracts:contract_id ( jobs ( id, title ) )",
        { count: "exact" },
      )
      .eq("reviewer_id", id)
      .eq("archived", false) // hide admin-archived reviews from the public
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }) // stable tiebreak for paging
      .range(reviewPaging.from, reviewPaging.to);
    madeTotal = madeCount ?? 0;
    madeReviews = (madeRaw ?? []).map((r) => {
      const emp = r.profiles as unknown as {
        full_name: string | null;
        establishment_name: string | null;
      } | null;
      const job = reviewJob(r.contracts);
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        // For reviews the student *made*, show the employer they reviewed.
        reviewer_name: emp?.establishment_name || emp?.full_name || null,
        profile_id: r.employer_id, // links to the reviewed employer
        author_id: id, // review author = this student profile, for report gating
        job_id: job.id,
        job_title: job.title,
      };
    });
  }

  // From the aggregate query, not the page — receivedReviews is one page now.
  const rCount = reviewStats.count;
  const rAvg = reviewStats.avg;

  const estLabel = isEmployer ? "Company" : "School";
  const estName =
    profile.establishment_name || (isEmployer ? "Independent employer" : null);
  const activeSocials = SOCIAL_LINKS.filter(
    (s) => socials[s.key as keyof Socials],
  );
  const showEstablishment =
    isEmployer ||
    !!profile.establishment_name ||
    !!profile.establishment_description ||
    !!profile.website_url ||
    activeSocials.length > 0;
  const canUpgrade = isOwner && user ? canBecomeEmployer(user.email) : false;

  return (
    // ponytail: mirrors app/jobs/[id] — narrow max-w-6xl + sticky sidebar.
    <div className="mx-auto max-w-6xl py-6 space-y-8">
      {error && <FormError>{error}</FormError>}
      {reportError && <FormError>{reportError}</FormError>}
      {reportOk && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
          Thanks — your report was sent to the admins.
        </p>
      )}

      {/* Header (full width, above the two-column split) */}
      <header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4 sm:gap-5 min-w-0">
          <AvatarInitials
            name={role === "student" ? profile.full_name : estName || profile.full_name}
            className="h-16 w-16 sm:h-20 sm:w-20 text-xl sm:text-2xl"
          />
          <div className="space-y-3 min-w-0">
            <div className="space-y-1.5">
              <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold tracking-tight">
                {profile.full_name ?? "Carolinian"}
                {isVerified && (
                  <BadgeCheck
                    className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-label="Verified account"
                  />
                )}
              </h1>
              {isAdmin && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Admin account
                </span>
              )}
              {isEmployer && <StarRating average={rAvg} count={rCount} />}
            </div>
            {profile.bio && (
              <p className="text-muted-foreground max-w-2xl whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}
            {profile.skills && profile.skills.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {profile.skills.map((s: string) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {isOwner ? (
            <>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                  Go to Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href="/profile/edit">
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit profile
                </Link>
              </Button>
            </>
          ) : (
            <>
              {profile.messenger_username && (
                <Button asChild className="gap-2">
                  <a
                    href={`https://m.me/${profile.messenger_username}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-5 w-5" aria-hidden />
                    Contact me
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </Button>
              )}
              {user && (
                <ReportDialog
                  targetType="profile"
                  targetId={profile.id}
                  redirectTo={`/profile/${profile.id}`}
                />
              )}
            </>
          )}
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* Main column: role-specific sections */}
        <div className="md:col-span-2 space-y-10">
          {isEmployer ? (
            <>
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold">Posted jobs</h2>
                  {jobsTotal > 0 && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium tabular-nums text-muted-foreground">
                      {jobsTotal}
                    </span>
                  )}
                </div>
                {jobs.length === 0 ? (
                  // `page > 1` rather than a count check: past the last page
                  // PostgREST returns no usable total, so count reads as 0.
                  <p className="text-muted-foreground text-sm">
                    {jobPaging.page > 1 ? (
                      <Link href={`/profile/${id}`} className="underline">
                        That page is empty — back to the first page
                      </Link>
                    ) : (
                      "No jobs posted yet."
                    )}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {jobs.map((j) => (
                      <JobCard key={j.id} job={j} />
                    ))}
                  </div>
                )}
                <Pagination
                  page={jobPaging.page}
                  pageSize={jobPaging.size}
                  total={jobsTotal}
                  param="jobsPage"
                />
              </section>

              <div className="max-w-3xl">
                <ReviewsSection
                  reviews={receivedReviews}
                  stats={reviewStats}
                  page={reviewPaging.page}
                  pageSize={reviewPaging.size}
                  sort={reviewSort}
                  pageParam="reviewsPage"
                  viewerId={user?.id}
                  reportRedirect={`/profile/${id}`}
                />
              </div>
            </>
          ) : isAdmin ? (
            <section className="max-w-3xl">
              <div className="rounded-xl border bg-gradient-to-br from-indigo-50 to-background p-8 dark:from-indigo-950/30">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-indigo-600/10 p-3 dark:bg-indigo-400/10">
                    <ShieldCheck
                      className="h-7 w-7 text-indigo-600 dark:text-indigo-400"
                      aria-hidden
                    />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold">Administrator</h2>
                    <p className="text-muted-foreground">
                      This is a Hustl platform administrator account. Admins
                      manage users, moderate job postings, and review
                      verification requests. They don&apos;t post jobs, take
                      contracts, or leave reviews.
                    </p>
                  </div>
                </div>

                {isOwner && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                      <Link href="/admin/overview">
                        <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden />
                        <span className="text-sm font-medium">Overview</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                      <Link href="/admin/users">
                        <Users className="h-5 w-5 shrink-0" aria-hidden />
                        <span className="text-sm font-medium">Users</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
                      <Link href="/admin/jobs">
                        <Briefcase className="h-5 w-5 shrink-0" aria-hidden />
                        <span className="text-sm font-medium">Jobs</span>
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <>
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">Contracts</h2>
                {!isOwner && profile.contracts_hidden ? (
                  <p className="text-muted-foreground text-sm">
                    This student has hidden their contracts.
                  </p>
                ) : contracts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No contracts yet.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {contracts.map((c) => {
                      const emp = c.profiles;
                      const empName =
                        emp?.establishment_name ||
                        emp?.full_name ||
                        "an employer";
                      return (
                        <li
                          key={c.id}
                          className="flex items-center justify-between gap-3 p-4"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/jobs/${c.jobs?.id ?? ""}`}
                              className="block truncate font-medium hover:underline"
                            >
                              {c.jobs?.title ?? "Job"}
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              with{" "}
                              {emp ? (
                                <Link
                                  href={`/profile/${emp.id}`}
                                  className="hover:underline"
                                >
                                  {empName}
                                </Link>
                              ) : (
                                empName
                              )}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {c.status}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="space-y-4 max-w-3xl">
                <h2 className="text-2xl font-bold">
                  Reviews made to employers
                  {madeTotal > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {madeTotal}
                    </span>
                  )}
                </h2>
                <ReviewList
                  reviews={madeReviews}
                  viewerId={user?.id}
                  reportRedirect={`/profile/${id}`}
                />
                <Pagination
                  page={reviewPaging.page}
                  pageSize={reviewPaging.size}
                  total={madeTotal}
                  param="reviewsPage"
                />
              </section>
            </>
          )}
        </div>

        {/* Sidebar: establishment + stats, then owner-only verification. */}
        {/* space-y-4 lives on the aside so the sticky card's containing block
            IS the stretched aside — an intermediate wrapper would collapse to
            content height and remove the room the sticky card needs to pin. */}
        <aside className="md:col-span-1 md:self-stretch space-y-4">
          <div className="sticky top-24 rounded-xl border bg-background p-6 space-y-4">
              {showEstablishment && (
                <>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {estLabel}
                    </p>
                    {estName && <p className="font-semibold">{estName}</p>}
                    {profile.establishment_description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {profile.establishment_description}
                      </p>
                    )}
                    {(profile.website_url || activeSocials.length > 0) && (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        {profile.website_url && (
                          <a
                            href={profile.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-foreground"
                          >
                            <Globe className="h-5 w-5" />
                            <span className="sr-only">Website</span>
                          </a>
                        )}
                        {activeSocials.map(({ key, Icon, label }) => (
                          <a
                            key={key}
                            href={socials[key as keyof Socials]}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-foreground"
                          >
                            <Icon className="h-5 w-5" />
                            <span className="sr-only">{label}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t" />
                </>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Profile stats
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-medium">
                    {monthYear(profile.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {isOwner && !isAdmin && (
              <>
                {vStatus !== "verified" && (
                  <div className="rounded-xl border bg-emerald-50/50 p-6 space-y-3 dark:bg-emerald-950/20">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        Verification status
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {vStatus === "pending"
                          ? "Your verification request is under review. We'll add a badge to your profile once it's approved."
                          : vStatus === "rejected"
                            ? "Your last request wasn't approved. You can request verification again."
                            : isEmployer
                              ? "Verify your account to build trust with applicants."
                              : "Verify your account to build trust with employers."}
                      </p>
                    </div>
                    {vStatus === "pending" ? (
                      <Button className="w-full" disabled>
                        Pending review
                      </Button>
                    ) : (
                      <form action={requestVerification}>
                        <Button type="submit" className="w-full">
                          {vStatus === "rejected"
                            ? "Request again"
                            : "Get Verified"}
                        </Button>
                      </form>
                    )}
                  </div>
                )}

                {!isEmployer && canUpgrade && (
                  <div className="rounded-xl border bg-background p-6 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Become an employer</p>
                      <p className="text-sm text-muted-foreground">
                        Post jobs and hire students by upgrading your account.
                      </p>
                    </div>
                    <Button asChild className="w-full">
                      <Link href="/profile/edit?upgrade=1">
                        Become an employer
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            )}
        </aside>
      </div>
    </div>
  );
}
