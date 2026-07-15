import Link from "next/link";
import { Briefcase } from "lucide-react";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { StarRating } from "@/components/marketplace/star-rating";
import { ReportDialog } from "@/components/marketplace/report-dialog";

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
  // Profile the displayed name links to: the reviewing student (reviews an
  // employer received) or the reviewed employer (reviews a student made).
  // Null when that account was deleted → name renders unlinked.
  profile_id: string | null;
  // The reviewing student (review author). Independent of profile_id, which
  // flips to the employer on "reviews made" surfaces. Used to gate the Report
  // button (an author can't report their own review). Null once the student
  // deletes their account.
  author_id: string | null;
  // The job the review came from (via contract). Null once the contract is
  // deleted (contract_id → set null), so the job is no longer derivable.
  job_id: string | null;
  job_title: string | null;
}

/** Whether the viewer may report this review: signed in, not the author. */
function canReport(viewerId: string | null | undefined, r: ReviewItem) {
  return !!viewerId && !!r.author_id && viewerId !== r.author_id;
}

/** Pull the job (id, title) out of a review's nested contract embed.
 * Supabase may hand back the to-one relations as an object or a 1-element
 * array; normalize both, and return nulls when the contract was deleted. */
export function reviewJob(contracts: unknown): {
  id: string | null;
  title: string | null;
} {
  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  const contract = one(contracts as { jobs: unknown } | { jobs: unknown }[]);
  const job = one(
    contract?.jobs as
      | { id: string; title: string | null }
      | { id: string; title: string | null }[],
  );
  return { id: job?.id ?? null, title: job?.title ?? null };
}

/** Reviewer/reviewee name, linked to their profile when it still exists. */
export function ReviewerName({
  name,
  profileId,
  className,
}: {
  name: string | null;
  profileId: string | null;
  className?: string;
}) {
  const label = name ?? "Carolinian";
  return profileId ? (
    <Link href={`/profile/${profileId}`} className={`${className} hover:underline`}>
      {label}
    </Link>
  ) : (
    <span className={className}>{label}</span>
  );
}

export function ReviewList({
  reviews,
  viewerId,
  reportRedirect,
}: {
  reviews: ReviewItem[];
  viewerId?: string | null;
  reportRedirect?: string;
}) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reviews yet. Reviews appear here after a completed contract.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {reviews.map((r) => (
        <li key={r.id} className="py-4 space-y-2">
          <div className="flex items-center gap-2">
            <AvatarInitials name={r.reviewer_name} className="h-7 w-7 text-xs" />
            <ReviewerName
              name={r.reviewer_name}
              profileId={r.profile_id}
              className="font-medium text-sm"
            />
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(r.created_at).toLocaleDateString()}
            </span>
            {reportRedirect && canReport(viewerId, r) && (
              <ReportDialog
                targetType="review"
                targetId={r.id}
                redirectTo={reportRedirect}
              />
            )}
          </div>
          {r.job_title && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />
              for{" "}
              {r.job_id ? (
                <Link
                  href={`/jobs/${r.job_id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {r.job_title}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {r.job_title}
                </span>
              )}
            </p>
          )}
          <StarRating average={r.rating} count={1} compact={false} starsOnly />
          {r.comment && (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
              {r.comment}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
