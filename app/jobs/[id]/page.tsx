import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flame, MapPin, Clock, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/marketplace/star-rating";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { JobTypeBadge } from "@/components/marketplace/job-type-badge";
import { ContactEmployerButton } from "@/components/marketplace/contact-employer-button";
import { AuthModalButton } from "@/components/auth/auth-modal-button";
import { SaveJobButton } from "@/components/marketplace/save-job-button";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import { FormError } from "@/components/marketplace/form-error";
import { ReviewsSection } from "@/components/marketplace/reviews-section";
import { ReviewForm } from "@/components/marketplace/review-form";
import { FaqAccordion } from "@/components/marketplace/faq-accordion";
import { QuickFaq } from "@/components/marketplace/quick-faq";
import {
  reviewJob,
  type ReviewItem,
} from "@/components/marketplace/review-list";
import { formatPay, payPeriodLabel } from "@/lib/pay";
import { timeAgo } from "@/lib/time";
import { deleteJob, toggleJobVisibility } from "../actions";
import type { Faq, JobType, PayPeriod } from "@/lib/types/database";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{
  reportOk?: string;
  reportError?: string;
  contractOk?: string;
  contractError?: string;
}>;

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { reportOk, reportError, contractOk, contractError } =
    await searchParams;
  const supabase = await createClient();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(
      "id, title, description, job_type, category, pay_min, pay_max, pay_period, skills, location, work_mode, term, is_urgent, faqs, is_disabled, created_at, employer_id, profiles ( id, full_name, establishment_name, messenger_username )",
    )
    .eq("id", id)
    .maybeSingle();

  if (jobError) throw jobError; // real failure → error boundary, not a fake 404
  if (!job) notFound(); // genuinely missing → 404

  const employer = job.profiles as unknown as {
    id: string;
    full_name: string | null;
    establishment_name: string | null;
    messenger_username: string | null;
  } | null;

  // Reviews are about employers. Fetch the full list (with each reviewer's
  // name) so we can show individual reviews, then derive the aggregate from it.
  const { data: reviewsRaw } = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, created_at, reviewer_id, profiles:reviewer_id ( full_name ), contracts:contract_id ( jobs ( id, title ) )",
    )
    .eq("employer_id", job.employer_id)
    .order("created_at", { ascending: false });
  const reviews: ReviewItem[] = (reviewsRaw ?? []).map((r) => {
    const rJob = reviewJob(r.contracts);
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      // reviewer_id is null once the reviewing student deletes their account.
      reviewer_name: r.reviewer_id
        ? ((r.profiles as unknown as { full_name: string | null } | null)
            ?.full_name ?? null)
        : "Deleted user",
      profile_id: r.reviewer_id, // links to the reviewing student; null once deleted
      job_id: rJob.id,
      job_title: rJob.title,
    };
  });
  const rCount = reviews.length;
  const rAvg =
    rCount > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / rCount : 0;

  const user = await getCurrentUser();
  const isOwner = user?.id === job.employer_id;

  // Student viewers get a bookmark button; fetch role + whether this job is saved.
  // A viewer who completed a contract for this job can also review the employer.
  let isStudent = false;
  let isSaved = false;
  let reviewableContractId: string | null = null;
  let myReview: { rating: number; comment: string | null } | null = null;
  if (user && !isOwner) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isStudent = me?.role === "student";
    if (isStudent) {
      const { data: saved } = await supabase
        .from("saved_jobs")
        .select("id")
        .eq("student_id", user.id)
        .eq("job_id", job.id)
        .maybeSingle();
      isSaved = !!saved;
    }

    // Most-recent completed contract for this viewer on this job → can review.
    const { data: reviewable } = await supabase
      .from("contracts")
      .select("id")
      .eq("job_id", job.id)
      .eq("student_id", user.id)
      .eq("status", "Completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reviewable) {
      reviewableContractId = reviewable.id;
      const { data: existing } = await supabase
        .from("reviews")
        .select("rating, comment")
        .eq("contract_id", reviewable.id)
        .eq("reviewer_id", user.id)
        .maybeSingle();
      myReview = existing ?? null;
    }
  }

  // Hidden jobs (draft or <2 FAQs) are owner-only; the public gets a 404.
  if (job.is_disabled && !isOwner) notFound();

  const jobType = job.job_type as JobType;
  const faqs = (job.faqs as Faq[] | null) ?? [];

  const employerName = employer
    ? employer.establishment_name && employer.full_name
      ? `${employer.establishment_name} (${employer.full_name})`
      : employer.establishment_name || employer.full_name || "an employer"
    : null;

  // Meta groups for the single divider-separated facts row. Only present groups
  // are pushed, so the interleaved dividers never bracket an empty group.
  const modeLocation = [job.work_mode, job.location].filter(Boolean).join(" · ");
  const metaGroups: ReactNode[] = [];
  if (modeLocation) {
    metaGroups.push(
      <span className="inline-flex items-center gap-1.5">
        <MapPin className="h-4 w-4" />
        {modeLocation}
      </span>,
    );
  }
  if (job.term) {
    metaGroups.push(
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-4 w-4" />
        {job.term}
      </span>,
    );
  }
  if (job.skills && job.skills.length > 0) {
    metaGroups.push(
      <span className="inline-flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide">
          Skills required:
        </span>
        {job.skills.map((s: string) => (
          <Badge key={s} variant="outline" className="font-normal">
            {s}
          </Badge>
        ))}
      </span>,
    );
  }

  return (
    // ponytail: page-local width override — narrower than the global 1400px container in app/layout.tsx. Bump max-w-6xl to widen/narrow.
    <div className="mx-auto max-w-6xl py-6 space-y-4">
      {reportError && <FormError>{reportError}</FormError>}
      {reportOk && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
          Thanks — your report was sent to the admins.
        </p>
      )}
      {contractError && <FormError>{contractError}</FormError>}
      {contractOk && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
          {contractOk}
        </p>
      )}
      <div className="grid md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-12">
        <div className="space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <JobTypeBadge type={jobType} />
            {job.category && (
              <span className="text-sm text-muted-foreground">
                {job.category}
              </span>
            )}
            {job.is_urgent && (
              <Badge variant="destructive" className="gap-1">
                <Flame className="h-3 w-3" />
                Urgent
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold">{job.title}</h1>
          {employer && (
            <div className="flex items-center gap-3">
              <AvatarInitials
                name={employer.establishment_name || employer.full_name}
                className="h-11 w-11 text-sm"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/profile/${employer.id}`}
                    className="font-semibold hover:underline"
                  >
                    {employerName}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {timeAgo(job.created_at)}
                  </span>
                </div>
                <StarRating average={rAvg} count={rCount} compact={false} />
              </div>
            </div>
          )}
          {metaGroups.length > 0 && (
            <>
              <div className="border-t" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {metaGroups.map((group, i) => (
                  <div key={i} className="flex items-center gap-x-4">
                    {i > 0 && <span className="h-4 w-px bg-border" />}
                    {group}
                  </div>
                ))}
              </div>
            </>
          )}
          <p className="whitespace-pre-wrap text-foreground/90">
            {job.description ?? "No description provided."}
          </p>
          </div>

          <FaqAccordion faqs={faqs} />

          <ReviewsSection reviews={reviews} avg={rAvg} count={rCount} />

          {reviewableContractId && (
            <ReviewForm
              contractId={reviewableContractId}
              existing={myReview}
              redirectTo={`/jobs/${job.id}`}
            />
          )}
        </div>

        {/* Sidebar: pay + actions — pins under the navbar (h-20) on scroll.
            self-stretch makes the aside as tall as the left column so the
            sticky card has room to travel; grid items-start alone would shrink
            it to the card and kill the stick. */}
        <aside className="md:col-span-1 md:self-stretch">
          <div className="sticky top-24 overflow-hidden rounded-xl border bg-background p-6 space-y-5">
            <div className="-mx-6 -mt-6 space-y-1 border-b bg-muted/50 px-6 py-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {payPeriodLabel(job.pay_period as PayPeriod)}
              </span>
              <p className="text-2xl font-bold">
                {formatPay(
                  job.pay_min,
                  job.pay_max,
                  job.pay_period as PayPeriod,
                )}
              </p>
            </div>

            {faqs.length > 0 && <QuickFaq faqs={faqs} />}

            <div className="border-t" />

            {isOwner ? (
              <div className="space-y-3">
                {job.is_disabled ? (
                  <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {faqs.length < 2
                      ? "Hidden — add at least 2 FAQs to publish this job."
                      : "Hidden — not shown in public listings."}
                  </p>
                ) : (
                  <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Zap className="h-4 w-4" />
                    This is your posting
                  </p>
                )}
                {faqs.length >= 2 && (
                  <form
                    action={toggleJobVisibility.bind(
                      null,
                      job.id,
                      !job.is_disabled,
                    )}
                  >
                    <Button type="submit" variant="outline" className="w-full">
                      {job.is_disabled ? "Unhide job" : "Hide job"}
                    </Button>
                  </form>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild variant="outline">
                    <Link href={`/jobs/${job.id}/edit`}>Edit job</Link>
                  </Button>
                  <form action={deleteJob.bind(null, job.id)}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Delete job
                    </Button>
                  </form>
                </div>
              </div>
            ) : user ? (
              <div className="space-y-3">
                <ContactEmployerButton
                  jobId={job.id}
                  jobTitle={job.title}
                  jobType={jobType}
                  employerName={employer?.full_name ?? "there"}
                  employerHandle={employer?.messenger_username ?? null}
                  studentEmail={user.email}
                />
                {isStudent && (
                  <SaveJobButton jobId={job.id} initialSaved={isSaved} />
                )}
                <div className="flex justify-center border-t pt-3">
                  <ReportDialog
                    targetType="job"
                    targetId={job.id}
                    redirectTo={`/jobs/${job.id}`}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <AuthModalButton className="w-full">
                  Sign in to contact
                </AuthModalButton>
                <p className="text-xs text-muted-foreground">
                  Sign in so the employer gets your email to send an offer.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
