import Link from "next/link";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/marketplace/star-rating";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ReviewsSection } from "@/components/marketplace/reviews-section";
import { reviewJob, type ReviewItem } from "@/components/marketplace/review-list";
import { EmptyState } from "@/components/shared/empty-state";
import { timeAgo } from "@/lib/time";

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
}: {
  userId: string;
  isEmployer: boolean;
  returnTo: string;
}) {
  const supabase = await createClient();

  if (isEmployer) {
    const { data } = await supabase
      .from("reviews")
      .select(
        "id, rating, comment, created_at, reviewer_id, profiles:reviewer_id ( full_name ), contracts:contract_id ( jobs ( id, title ) )",
      )
      .eq("employer_id", userId)
      .eq("archived", false) // match the public rating (archived excluded)
      .order("created_at", { ascending: false });

    const reviews: ReviewItem[] = (data ?? []).map((r) => {
      const job = reviewJob(r.contracts);
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
        profile_id: r.reviewer_id,
        author_id: r.reviewer_id,
        job_id: job.id,
        job_title: job.title,
      };
    });

    const count = reviews.length;
    const avg = count
      ? reviews.reduce((s, r) => s + r.rating, 0) / count
      : 0;

    return (
      <Card>
        <CardContent className="pt-6">
          <ReviewsSection
            reviews={reviews}
            avg={avg}
            count={count}
            viewerId={userId}
            reportRedirect={returnTo}
          />
        </CardContent>
      </Card>
    );
  }

  // Student: reviews they wrote. Archived ones are included (unlike the public
  // profile) so the author learns a moderator removed theirs.
  const { data } = await supabase
    .from("reviews")
    .select(
      "id, contract_id, rating, comment, created_at, archived, employer_id, profiles:employer_id ( full_name, establishment_name ), contracts:contract_id ( jobs ( id, title ) )",
    )
    .eq("reviewer_id", userId)
    .order("created_at", { ascending: false });

  const reviews = data ?? [];

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <h2 className="text-lg font-semibold">Reviews you&apos;ve written</h2>

        {reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No reviews written yet"
            body="Once an employer marks a contract completed, you can review them from My work."
            action={{ href: "/dashboard?tab=work", label: "Go to My work" }}
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
      </CardContent>
    </Card>
  );
}
