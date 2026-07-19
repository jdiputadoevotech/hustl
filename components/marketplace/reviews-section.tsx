import Link from "next/link";
import { Briefcase, Star } from "lucide-react";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { StarRating } from "@/components/marketplace/star-rating";
import { ReportDialog } from "@/components/marketplace/report-dialog";
import { SortDropdown } from "@/components/marketplace/sort-dropdown";
import {
  ReviewerName,
  type ReviewItem,
} from "@/components/marketplace/review-list";
import { Pagination } from "@/components/shared/pagination";
import { REVIEW_SORTS, type ReviewSort, type ReviewStats } from "@/lib/reviews";
import { timeAgo } from "@/lib/time";

/**
 * Employer reviews: aggregate summary + one page of reviews.
 *
 * `reviews` is a single page; `stats` covers the whole set. Keeping them
 * separate is what lets the average and the distribution stay globally correct
 * while the list is paged — `stats` comes from `fetchReviewStats`, which reads
 * only the `rating` column. Nothing here derives a total from `reviews.length`.
 *
 * Sorting is a URL param handled by the server query, not local state, so
 * "Highest rated" means highest overall rather than highest on this page.
 */
export function ReviewsSection({
  reviews,
  stats,
  page,
  pageSize,
  sort,
  viewerId,
  reportRedirect,
  pageParam = "page",
  sortParam = "rsort",
}: {
  reviews: ReviewItem[];
  stats: ReviewStats;
  page: number;
  pageSize: number;
  sort: ReviewSort;
  viewerId?: string | null;
  reportRedirect?: string;
  pageParam?: string;
  sortParam?: string;
}) {
  const { avg, count, buckets } = stats;

  if (count === 0) {
    return (
      <section aria-labelledby="reviews-heading" className="space-y-4">
        <h2 id="reviews-heading" className="text-2xl font-bold">
          Reviews
        </h2>
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Star className="mx-auto h-6 w-6 text-muted-foreground/50" />
          <p className="mt-3 font-medium">No reviews yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Reviews appear after a student completes a contract with this
            employer.
          </p>
        </div>
      </section>
    );
  }

  // Bars fill relative to the largest bucket so a dominant rating reads as full
  // while smaller buckets stay legible. Sourced from stats, not the page.
  const maxN = Math.max(...buckets.map((b) => b.n), 1);

  return (
    <section aria-labelledby="reviews-heading" className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 id="reviews-heading" className="text-2xl font-bold">
          Reviews
        </h2>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>

      {/* Summary: aggregate score + distribution */}
      <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-1">
          <span className="text-5xl font-bold tabular-nums leading-none">
            {avg.toFixed(1)}
          </span>
          <div className="space-y-1">
            <StarRating average={avg} count={count} compact={false} starsOnly />
            <span className="block text-sm text-muted-foreground">
              {count} {count === 1 ? "rating" : "ratings"}
            </span>
          </div>
        </div>

        <ul className="space-y-1.5">
          {buckets.map(({ stars, n }) => (
            <li key={stars} className="flex items-center gap-3 text-sm">
              <span className="flex w-12 shrink-0 items-center gap-1 text-muted-foreground">
                <span className="w-2 text-right tabular-nums">{stars}</span>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              </span>
              <span
                className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${stars} ${stars === 1 ? "star" : "stars"}: ${n} ${n === 1 ? "review" : "reviews"}`}
              >
                <span
                  className="block h-full rounded-full bg-amber-400 motion-safe:animate-[grow_0.5s_cubic-bezier(0.22,1,0.36,1)] motion-safe:[transform-origin:left]"
                  style={{ width: `${(n / maxN) * 100}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                {n}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 border-b pb-3">
        <span className="text-sm font-medium">
          {count} {count === 1 ? "review" : "reviews"}
        </span>
        <SortDropdown
          selected={sort}
          options={REVIEW_SORTS}
          param={sortParam}
          resetParam={pageParam}
        />
      </div>

      {/* List */}
      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-xl border bg-card p-5">
            {/* Profile + job */}
            <div className="flex items-center gap-3">
              <AvatarInitials
                name={r.reviewer_name}
                className="h-10 w-10 text-sm"
              />
              <div className="min-w-0">
                <ReviewerName
                  name={r.reviewer_name}
                  profileId={r.profile_id}
                  className="block truncate font-semibold leading-tight"
                />
                {r.job_title && (
                  <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Briefcase className="h-3 w-3 shrink-0" aria-hidden />
                    for{" "}
                    {r.job_id ? (
                      <Link
                        href={`/jobs/${r.job_id}`}
                        className="truncate font-medium text-foreground hover:underline"
                      >
                        {r.job_title}
                      </Link>
                    ) : (
                      <span className="truncate font-medium text-foreground">
                        {r.job_title}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <hr className="my-4 border-border" />

            {/* Rating + time */}
            <div className="flex items-center gap-2 text-sm">
              <StarRating
                average={r.rating}
                count={1}
                compact={false}
                starsOnly
                className="gap-0"
              />
              <span className="font-semibold tabular-nums">{r.rating}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {timeAgo(r.created_at)}
              </span>
              {reportRedirect &&
                viewerId &&
                r.author_id &&
                viewerId !== r.author_id && (
                  <span className="ml-auto">
                    <ReportDialog
                      targetType="review"
                      targetId={r.id}
                      redirectTo={reportRedirect}
                    />
                  </span>
                )}
            </div>

            {r.comment && (
              <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-foreground/90">
                {r.comment}
              </p>
            )}
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={count}
        param={pageParam}
      />
    </section>
  );
}
