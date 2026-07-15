import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  BadgeCheck,
  Briefcase,
  Send,
  Clock,
  Inbox,
  Star,
  PencilLine,
  Plus,
  Search,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { StarRating } from "@/components/marketplace/star-rating";
import { JobTypeBadge } from "@/components/marketplace/job-type-badge";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { ContractStatusBadge } from "@/components/marketplace/contract-status-badge";
import { ReviewForm } from "@/components/marketplace/review-form";
import { timeAgo } from "@/lib/time";
import {
  offerContract,
  acceptOffer,
  declineOffer,
  completeContract,
  resignContract,
} from "@/app/contracts/actions";
import type { ContractStatus, JobType } from "@/lib/types/database";

export const metadata = { title: "Dashboard — Hustl" };

type SearchParams = Promise<{ contractOk?: string; contractError?: string }>;

type Named = { id: string; full_name: string | null } | null;
type JobRef = { id: string; title: string } | null;
type Stat = { label: string; value: number; icon: LucideIcon };
type JobRow = {
  id: string;
  title: string;
  job_type: JobType;
  is_disabled: boolean;
};
type SentRow = {
  id: string;
  status: ContractStatus;
  created_at: string;
  job: unknown;
  student: unknown;
};
type MyContractRow = {
  id: string;
  status: ContractStatus;
  created_at: string;
  job: unknown;
  employer: unknown;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { contractOk, contractError } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: me } = await supabase
    .from("profiles")
    .select("role, full_name, verification_status")
    .eq("id", user.id)
    .single();
  if (me?.role === "admin") redirect("/admin/overview");
  const isEmployer = me?.role === "employer";

  // Count-only queries (head:true) read a user's own rows under normal RLS —
  // same pattern as the admin overview, no service client needed.
  const countMine = (
    table: "jobs" | "contracts",
    col: "employer_id" | "student_id",
    match: Record<string, unknown>,
  ) =>
    supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(col, user.id)
      .match(match);

  // Fetch only what this role's view uses; batch counts + lists in one round.
  let stats: Stat[] = [];
  let employerRating = { average: 0, count: 0 };
  let myJobs: JobRow[] | null = null;
  let sentContracts: SentRow[] | null = null;
  let myContracts: MyContractRow[] | null = null;
  const reviewByContract = new Map<
    string,
    { rating: number; comment: string; archived: boolean }
  >();

  if (isEmployer) {
    const [
      { count: activeJobs },
      { count: pendingOffers },
      { count: activeHires },
      { count: completedHires },
      { data: reviewRows },
      { data: jobsData },
      { data: sentData },
    ] = await Promise.all([
      countMine("jobs", "employer_id", { is_disabled: false }),
      countMine("contracts", "employer_id", { status: "Offered" }),
      countMine("contracts", "employer_id", { status: "Accepted" }),
      countMine("contracts", "employer_id", { status: "Completed" }),
      supabase
        .from("reviews")
        .select("rating")
        .eq("employer_id", user.id)
        .eq("archived", false), // match the public rating (archived excluded)
      supabase
        .from("jobs")
        .select("id, title, job_type, is_disabled")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contracts")
        .select(
          "id, status, created_at, job:jobs ( id, title ), student:profiles!contracts_student_id_fkey ( id, full_name )",
        )
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const ratings = (reviewRows ?? []).map((r) => r.rating);
    employerRating = {
      count: ratings.length,
      average: ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0,
    };
    stats = [
      { label: "Active jobs", value: activeJobs ?? 0, icon: Briefcase },
      { label: "Pending offers", value: pendingOffers ?? 0, icon: Send },
      { label: "Active hires", value: activeHires ?? 0, icon: Handshake },
      { label: "Completed hires", value: completedHires ?? 0, icon: CheckCircle2 },
    ];
    myJobs = jobsData as JobRow[] | null;
    sentContracts = sentData as SentRow[] | null;
  } else {
    const [
      { count: pendingOffers },
      { count: inProgress },
      { count: completedJobs },
      { count: reviewsWritten },
      { data: contractData },
      { data: reviewData },
    ] = await Promise.all([
      countMine("contracts", "student_id", { status: "Offered" }),
      countMine("contracts", "student_id", { status: "Accepted" }),
      countMine("contracts", "student_id", { status: "Completed" }),
      supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("reviewer_id", user.id),
      supabase
        .from("contracts")
        .select(
          "id, status, created_at, job:jobs ( id, title ), employer:profiles!contracts_employer_id_fkey ( id, full_name )",
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("reviews")
        .select("contract_id, rating, comment, archived")
        .eq("reviewer_id", user.id),
    ]);

    stats = [
      { label: "Pending offers", value: pendingOffers ?? 0, icon: Inbox },
      { label: "In progress", value: inProgress ?? 0, icon: Clock },
      { label: "Completed jobs", value: completedJobs ?? 0, icon: CheckCircle2 },
      { label: "Reviews written", value: reviewsWritten ?? 0, icon: Star },
    ];
    myContracts = contractData as MyContractRow[] | null;
    for (const r of reviewData ?? [])
      reviewByContract.set(r.contract_id, {
        rating: r.rating,
        comment: r.comment,
        archived: r.archived,
      });
  }

  const fullName = me?.full_name?.trim() || "Carolinian";
  const firstName = fullName.split(/\s+/)[0];
  const verified = me?.verification_status === "verified";

  return (
    <div className="py-8 space-y-6">
      {/* ===================== BENTO: HERO + STATS ===================== */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Hero greeting */}
        <Card className="col-span-2 flex flex-col justify-between gap-6 p-6 md:row-span-2">
          <div className="flex items-start gap-4">
            <AvatarInitials
              name={fullName}
              className="h-14 w-14 text-lg"
            />
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
                  <StarRating
                    average={employerRating.average}
                    count={employerRating.count}
                  />
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

        {/* Stat tiles */}
        {stats.map(({ label, value, icon: Icon }) => (
          <Card
            key={label}
            className="flex flex-col justify-between gap-3 p-4"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Flash messages */}
      {contractOk && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm border border-success/40 text-success bg-success/10 rounded-md p-3"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {contractOk}
        </p>
      )}
      {contractError && (
        <p
          role="alert"
          className="text-sm border border-destructive/40 text-destructive rounded-md p-3"
        >
          {contractError}
        </p>
      )}

      {/* ===================== AS A STUDENT ===================== */}
      {!isEmployer && (
        <Card>
          <CardHeader>
            <CardTitle>My offers &amp; work</CardTitle>
          </CardHeader>
          <CardContent>
            {!myContracts || myContracts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No offers yet. Browse jobs and contact employers to get hired.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/jobs">Browse jobs</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y rounded-lg border">
                {myContracts.map((c) => {
                  const job = c.job as unknown as JobRef;
                  const employer = c.employer as unknown as Named;
                  const status = c.status;
                  return (
                    <li key={c.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <AvatarInitials
                            name={employer?.full_name}
                            className="h-9 w-9 text-xs"
                          />
                          <div className="min-w-0">
                            {job ? (
                              <Link
                                href={`/jobs/${job.id}`}
                                className="font-medium hover:underline"
                              >
                                {job.title}
                              </Link>
                            ) : (
                              <span className="font-medium text-muted-foreground">
                                Removed job
                              </span>
                            )}
                            <p className="text-xs text-muted-foreground">
                              from{" "}
                              {employer ? (
                                <Link
                                  href={`/profile/${employer.id}`}
                                  className="underline"
                                >
                                  {employer.full_name ?? "an employer"}
                                </Link>
                              ) : (
                                "an employer"
                              )}{" "}
                              · {timeAgo(c.created_at)}
                            </p>
                          </div>
                        </div>
                        <ContractStatusBadge status={status} />
                      </div>

                      {status === "Offered" && (
                        <div className="flex gap-2">
                          <form action={acceptOffer.bind(null, c.id)}>
                            <SubmitButton size="sm">Accept</SubmitButton>
                          </form>
                          <ConfirmSubmit
                            action={declineOffer.bind(null, c.id)}
                            label="Decline"
                            variant="outline"
                            size="sm"
                            confirmTitle="Decline this offer?"
                            confirmBody={`This permanently declines the offer for "${job?.title ?? "this job"}". The employer will need to send a new one.`}
                            confirmLabel="Decline offer"
                          />
                        </div>
                      )}

                      {status === "Accepted" && (
                        <ConfirmSubmit
                          action={resignContract.bind(null, c.id)}
                          label="End contract"
                          size="sm"
                          confirmTitle="End this contract?"
                          confirmBody={`This ends your contract for "${job?.title ?? "this job"}" and can't be undone.`}
                          confirmLabel="End contract"
                        />
                      )}

                      {status === "Completed" &&
                        (reviewByContract.get(c.id)?.archived ? (
                          <p className="text-xs text-muted-foreground">
                            Your review was removed by a moderator.
                          </p>
                        ) : (
                          <ReviewForm
                            contractId={c.id}
                            existing={reviewByContract.get(c.id) ?? null}
                          />
                        ))}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===================== AS AN EMPLOYER ===================== */}
      {isEmployer && (
        <div className="space-y-6">
          {/* Offer a job */}
          {myJobs && myJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Offer a job</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Hired someone after chatting on Messenger? Send them an offer
                  using the email they gave you.
                </p>
                <form
                  action={offerContract}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="job_id">Job</Label>
                    <select
                      id="job_id"
                      name="job_id"
                      required
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      {myJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="student_email">Student email</Label>
                    <Input
                      id="student_email"
                      name="student_email"
                      type="email"
                      required
                      placeholder="student@example.com"
                    />
                  </div>
                  <SubmitButton>Send offer</SubmitButton>
                </form>
              </CardContent>
            </Card>
          )}

          {/* My job posts */}
          <Card>
            <CardHeader>
              <CardTitle>My job posts</CardTitle>
            </CardHeader>
            <CardContent>
              {!myJobs || myJobs.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    You haven&apos;t posted any jobs yet.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/jobs/new">Post a job</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {myJobs.map((j) => (
                    <li
                      key={j.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Link
                          href={`/jobs/${j.id}`}
                          className="truncate font-medium hover:underline"
                        >
                          {j.title}
                        </Link>
                        <JobTypeBadge type={j.job_type} />
                        {j.is_disabled && (
                          <Badge variant="outline">Hidden</Badge>
                        )}
                      </div>
                      <Link
                        href={`/jobs/${j.id}/edit`}
                        className="shrink-0 text-sm text-muted-foreground underline"
                      >
                        Edit
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Offers I've sent */}
          <Card>
            <CardHeader>
              <CardTitle>Offers I&apos;ve sent</CardTitle>
            </CardHeader>
            <CardContent>
              {!sentContracts || sentContracts.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Send className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No offers sent yet.
                  </p>
                </div>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {sentContracts.map((c) => {
                    const job = c.job as unknown as JobRef;
                    const student = c.student as unknown as Named;
                    const status = c.status;
                    return (
                      <li key={c.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <AvatarInitials
                              name={student?.full_name}
                              className="h-9 w-9 text-xs"
                            />
                            <div className="min-w-0">
                              {job ? (
                                <Link
                                  href={`/jobs/${job.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {job.title}
                                </Link>
                              ) : (
                                <span className="font-medium text-muted-foreground">
                                  Removed job
                                </span>
                              )}
                              <p className="text-xs text-muted-foreground">
                                to{" "}
                                {student ? (
                                  <Link
                                    href={`/profile/${student.id}`}
                                    className="underline"
                                  >
                                    {student.full_name ?? "a student"}
                                  </Link>
                                ) : (
                                  "a student"
                                )}{" "}
                                · {timeAgo(c.created_at)}
                              </p>
                            </div>
                          </div>
                          <ContractStatusBadge status={status} />
                        </div>

                        {status === "Accepted" && (
                          <div className="flex gap-2">
                            <form action={completeContract.bind(null, c.id)}>
                              <SubmitButton size="sm">
                                Mark completed
                              </SubmitButton>
                            </form>
                            <ConfirmSubmit
                              action={resignContract.bind(null, c.id)}
                              label="End contract"
                              size="sm"
                              confirmTitle="End this contract?"
                              confirmBody={`This ends the contract for "${job?.title ?? "this job"}" with ${student?.full_name ?? "this student"} and can't be undone.`}
                              confirmLabel="End contract"
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
