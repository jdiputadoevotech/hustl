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
import { formatPay, payPeriodLabel } from "@/lib/pay";
import { timeAgo } from "@/lib/time";
import { deleteJob } from "../actions";
import type { JobType, PayPeriod } from "@/lib/types/database";

type Params = Promise<{ id: string }>;

export default async function JobDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, title, description, job_type, category, pay_min, pay_max, pay_period, skills, location, work_mode, term, company, is_urgent, created_at, employer_id, profiles ( id, full_name, messenger_username )",
    )
    .eq("id", id)
    .single();

  if (!job) notFound();

  const employer = job.profiles as unknown as {
    id: string;
    full_name: string | null;
    messenger_username: string | null;
  } | null;

  // Employer's aggregate rating (reviews are about employers).
  const { data: empReviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("employer_id", job.employer_id);
  const rCount = empReviews?.length ?? 0;
  const rAvg =
    rCount > 0
      ? empReviews!.reduce((s, r) => s + r.rating, 0) / rCount
      : 0;

  const user = await getCurrentUser();
  const isOwner = user?.id === job.employer_id;
  const jobType = job.job_type as JobType;

  return (
    <div className="grid md:grid-cols-3 gap-8 py-6">
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
              {formatPay(job.pay_min, job.pay_max, job.pay_period as PayPeriod)}
            </p>
          </div>

          {isOwner ? (
            <div className="space-y-2">
              <Button asChild className="w-full" variant="outline">
                <Link href={`/jobs/${job.id}/edit`}>Edit job</Link>
              </Button>
              <form action={deleteJob.bind(null, job.id)}>
                <Button type="submit" variant="destructive" className="w-full">
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
  );
}
