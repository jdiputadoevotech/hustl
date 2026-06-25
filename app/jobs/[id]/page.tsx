import Link from "next/link";
import { notFound } from "next/navigation";
import { Flame, MapPin, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/marketplace/star-rating";
import { JobTypeBadge } from "@/components/marketplace/job-type-badge";
import { ContactEmployerButton } from "@/components/marketplace/contact-employer-button";
import { ReviewsSection } from "@/components/marketplace/reviews-section";
import { FaqAccordion } from "@/components/marketplace/faq-accordion";
import type { ReviewItem } from "@/components/marketplace/review-list";
import { formatPay, payPeriodLabel } from "@/lib/pay";
import { timeAgo } from "@/lib/time";
import { deleteJob, toggleJobVisibility } from "../actions";
import type { Faq, JobType, PayPeriod } from "@/lib/types/database";

type Params = Promise<{ id: string }>;

export default async function JobDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(
      "id, title, description, job_type, category, pay_min, pay_max, pay_period, skills, location, work_mode, term, company, is_urgent, faqs, is_disabled, created_at, employer_id, profiles ( id, full_name, messenger_username )",
    )
    .eq("id", id)
    .maybeSingle();

  if (jobError) throw jobError; // real failure → error boundary, not a fake 404
  if (!job) notFound(); // genuinely missing → 404

  const employer = job.profiles as unknown as {
    id: string;
    full_name: string | null;
    messenger_username: string | null;
  } | null;

  // Reviews are about employers. Fetch the full list (with each reviewer's
  // name) so we can show individual reviews, then derive the aggregate from it.
  const { data: reviewsRaw } = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, created_at, profiles:reviewer_id ( full_name )",
    )
    .eq("employer_id", job.employer_id)
    .order("created_at", { ascending: false });
  const reviews: ReviewItem[] = (reviewsRaw ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    reviewer_name:
      (r.profiles as unknown as { full_name: string | null } | null)
        ?.full_name ?? null,
  }));
  const rCount = reviews.length;
  const rAvg =
    rCount > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / rCount : 0;

  const user = await getCurrentUser();
  const isOwner = user?.id === job.employer_id;

  // Hidden jobs (draft or <2 FAQs) are owner-only; the public gets a 404.
  if (job.is_disabled && !isOwner) notFound();

  const jobType = job.job_type as JobType;
  const faqs = (job.faqs as Faq[] | null) ?? [];

  return (
    // ponytail: page-local width override — narrower than the global 1400px container in app/layout.tsx. Bump max-w-6xl to widen/narrow.
    <div className="mx-auto max-w-6xl py-6 space-y-12">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-5">
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
          {(job.work_mode || job.location || job.term) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {(job.work_mode || job.location) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {[job.work_mode, job.location].filter(Boolean).join(" · ")}
                </span>
              )}
              {job.term && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {job.term}
                </span>
              )}
            </div>
          )}
          {employer && (
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                href={`/profile/${employer.id}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                posted by {job.company || employer.full_name || "an employer"}
                {job.company && employer.full_name
                  ? ` (${employer.full_name})`
                  : ""}
              </Link>
              <span className="text-sm text-muted-foreground">
                {timeAgo(job.created_at)}
              </span>
              <StarRating average={rAvg} count={rCount} />
            </div>
          )}
          {job.skills && job.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {job.skills.map((s: string) => (
                <Badge key={s} variant="outline" className="font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap text-foreground/90">
            {job.description ?? "No description provided."}
          </p>
        </div>

        {/* Sidebar: pay + actions */}
        <aside className="md:col-span-1">
          <div className="rounded-xl border p-6 space-y-4 sticky top-24">
            <div>
              <span className="text-sm text-muted-foreground">
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

            {isOwner ? (
              <div className="space-y-2">
                {job.is_disabled && (
                  <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {faqs.length < 2
                      ? "Hidden — add at least 2 FAQs to publish this job."
                      : "Hidden — not shown in public listings."}
                  </p>
                )}
                <Button asChild className="w-full" variant="outline">
                  <Link href={`/jobs/${job.id}/edit`}>Edit job</Link>
                </Button>
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
                <form action={deleteJob.bind(null, job.id)}>
                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full"
                  >
                    Delete job
                  </Button>
                </form>
              </div>
            ) : user ? (
              <ContactEmployerButton
                jobId={job.id}
                jobTitle={job.title}
                jobType={jobType}
                employerName={employer?.full_name ?? "there"}
                employerHandle={employer?.messenger_username ?? null}
                studentEmail={user.email}
              />
            ) : (
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/auth/login">Sign in to contact</Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Sign in so the employer gets your email to send an offer.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <FaqAccordion faqs={faqs} />

      <ReviewsSection reviews={reviews} avg={rAvg} count={rCount} />
    </div>
  );
}
