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
  type ReviewItem,
} from "@/components/marketplace/review-list";
import { ReviewsSection } from "@/components/marketplace/reviews-section";
import { FormError } from "@/components/marketplace/form-error";
import { monthYear } from "@/lib/time";
import type {
  ContractStatus,
  Role,
  Socials,
  VerificationStatus,
} from "@/lib/types/database";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

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
  const { error } = await searchParams;
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
  const socials = (profile.socials ?? {}) as Socials;
  const vStatus = (profile.verification_status ?? "none") as VerificationStatus;
  const isVerified = vStatus === "verified";

  // Employer: posted jobs + reviews received. Student: contracts + reviews made.
  type ProfileJobCard = Parameters<typeof JobCard>[0]["job"];
  let jobs: ProfileJobCard[] = [];
  let receivedReviews: ReviewItem[] = [];
  let madeReviews: ReviewItem[] = [];
  let contracts: ContractRow[] = [];

  if (isEmployer) {
    const { data } = await supabase
      .from("jobs_with_employer")
      .select(
        "id, title, category, job_type, pay_min, pay_max, pay_period, skills, location, work_mode, term, is_urgent, created_at, employer_name, employer_establishment_name, employer_verification_status, employer_rating_avg, employer_rating_count",
      )
      .eq("employer_id", id)
      .eq("is_disabled", false) // public profile shows only listed jobs
      .order("created_at", { ascending: false });
    jobs = (data ?? []) as unknown as ProfileJobCard[];

    const { data: reviewsRaw } = await supabase
      .from("reviews")
      .select(
        "id, rating, comment, created_at, reviewer_id, profiles:reviewer_id ( full_name )",
      )
      .eq("employer_id", id)
      .order("created_at", { ascending: false });
    receivedReviews = (reviewsRaw ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      // reviewer_id is null once the reviewing student deletes their account.
      reviewer_name: r.reviewer_id
        ? ((r.profiles as unknown as { full_name: string | null } | null)
            ?.full_name ?? null)
        : "Deleted user",
    }));
  } else {
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

    const { data: madeRaw } = await supabase
      .from("reviews")
      .select(
        "id, rating, comment, created_at, profiles:employer_id ( full_name, establishment_name )",
      )
      .eq("reviewer_id", id)
      .order("created_at", { ascending: false });
    madeReviews = (madeRaw ?? []).map((r) => {
      const emp = r.profiles as unknown as {
        full_name: string | null;
        establishment_name: string | null;
      } | null;
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        // For reviews the student *made*, show the employer they reviewed.
        reviewer_name: emp?.establishment_name || emp?.full_name || null,
      };
    });
  }

  const rCount = receivedReviews.length;
  const rAvg =
    rCount > 0
      ? receivedReviews.reduce((s, r) => s + r.rating, 0) / rCount
      : 0;

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

      {/* Header (full width, above the two-column split) */}
      <header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4 sm:gap-5 min-w-0">
          <AvatarInitials
            name={estName || profile.full_name}
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
          ) : profile.messenger_username ? (
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
          ) : null}
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* Main column: role-specific sections */}
        <div className="md:col-span-2 space-y-10">
          {isEmployer ? (
            <>
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">Posted jobs</h2>
                {jobs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No jobs posted yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {jobs.map((j) => (
                      <JobCard key={j.id} job={j} />
                    ))}
                  </div>
                )}
              </section>

              <div className="max-w-3xl">
                <ReviewsSection
                  reviews={receivedReviews}
                  avg={rAvg}
                  count={rCount}
                />
              </div>
            </>
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
                  {madeReviews.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {madeReviews.length}
                    </span>
                  )}
                </h2>
                <ReviewList reviews={madeReviews} />
              </section>
            </>
          )}
        </div>

        {/* Sidebar: establishment + stats, then owner-only verification. */}
        <aside className="md:col-span-1 md:self-stretch">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-xl border bg-background p-6 space-y-4">
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

            {isOwner && (
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
          </div>
        </aside>
      </div>
    </div>
  );
}
