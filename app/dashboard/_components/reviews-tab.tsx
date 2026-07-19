import Link from "next/link";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/marketplace/star-rating";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ReviewsSection } from "@/components/marketplace/reviews-section";
import { reviewJob } from "@/components/marketplace/review-list";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { timeAgo } from "@/lib/time";
import { PAGE_SIZE, pageRange } from "@/lib/paging";
import {
  REVIEW_SELECT,
  applyReviewSort,
  asReviewSort,
  fetchReviewStats,
  toReceivedReviewItems,
} from "@/lib/reviews";

/**
 * Employer view: the reviews they've received, via the same ReviewsSection the
 * public profile uses (summary, distribution, client-side sort, show-more).
 * Student view: the reviews they've written, each still editable — the profile
 * page only ever showed these read-only.
 */
export async function ReviewsTab({
  userId,
  isEmployer,
  returnTo,
  params,
}: {
  userId: string;
  isEmployer: boolean;
  returnTo: string;
  params: { page?: string; rsort?: string };
}) {
  const supabase = await createClient();
  const sort = asReviewSort(params.rsort);
  const { page, from, to, size } = pageRange(params.page, PAGE_SIZE);

  if (isEmployer) {
    const [{ data }, stats] = await Promise.all([
      applyReviewSort(
        supabase
          .from("reviews")
          .select(REVIEW_SELECT)
          .eq("employer_id", userId)
          .eq("archived", false), // match the public rating (archived excluded)
        sort,
      ).range(from, to),
      fetchReviewStats(supabase, userId),
    ]);

    return (
      <Card>
        <CardContent className="pt-6">
          <ReviewsSection
            reviews={toReceivedReviewItems(data)}
            stats={stats}
            page={page}
            pageSize={size}
            sort={sort}
            viewerId={userId}
            reportRedirect={returnTo}
          />
        </CardContent>
      </Card>
    );
  }

  // Student: reviews they wrote. Archived ones are included (unlike the public
  // profile) so the author learns a moderator removed theirs.
  const { data, count } = await supabase
    .from("reviews")
    .select(
      "id, contract_id, rating, comment, created_at, archived, employer_id, profiles:employer_id ( full_name, establishment_name ), contracts:contract_id ( jobs ( id, title ) )",
      { count: "exact" },
    )
    .eq("reviewer_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false }) // stable tiebreak for paging
    .range(from, to);

  const reviews = data ?? [];
  const total = count ?? 0;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <h2 className="text-lg font-semibold">
          Reviews you&apos;ve written
          {total > 0 && (
            <span className="ml-2 text-sm font-normal tabular-nums text-muted-foreground">
              {total}
            </span>
          )}
        </h2>

        {/* Empty-state copy keys off `page > 1`, not a count check: past the
            last page PostgREST returns no usable total, so count reads as 0. */}
        {reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title={page > 1 ? "That page is empty" : "No reviews written yet"}
            body={
              page > 1
                ? undefined
                : "Once an employer marks a contract completed, you can review them from My work."
            }
            action={
              page > 1
                ? { href: "/dashboard?tab=reviews", label: "Back to the first page" }
                : { href: "/dashboard?tab=work", label: "Go to My work" }
            }
          />
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => {
              const employer = r.profiles as unknown as {
                full_name: string | null;
                establishment_name: string | null;
              } | null;
              const job = reviewJob(r.contracts);
              const name =
                employer?.establishment_name ||
                employer?.full_name ||
                "an employer";

              return (
                <li key={r.id} className="space-y-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">
                        {job.id && job.title ? (
                          <Link
                            href={`/jobs/${job.id}`}
                            className="hover:underline"
                          >
                            {job.title}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            Removed job
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        for{" "}
                        {r.employer_id ? (
                          <Link
                            href={`/profile/${r.employer_id}`}
                            className="underline"
                          >
                            {name}
                          </Link>
                        ) : (
                          name
                        )}{" "}
                        · {timeAgo(r.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating
                        average={r.rating}
                        count={1}
                        compact={false}
                        starsOnly
                      />
                      {r.archived && <Badge variant="outline">Removed</Badge>}
                    </div>
                  </div>

                  {r.comment && (
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">
                      {r.comment}
                    </p>
                  )}

                  {r.archived ? (
                    <p className="text-xs text-muted-foreground">
                      A moderator removed this review, so it no longer counts
                      toward the employer&apos;s rating and can&apos;t be edited.
                    </p>
                  ) : (
                    r.contract_id && (
                      <ReviewForm
                        contractId={r.contract_id}
                        existing={{ rating: r.rating, comment: r.comment }}
                        redirectTo={returnTo}
                      />
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Pagination page={page} pageSize={size} total={total} />
      </CardContent>
    </Card>
  );
}
