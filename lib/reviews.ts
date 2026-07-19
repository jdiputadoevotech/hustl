import type { SupabaseClient } from "@supabase/supabase-js";
import type { SortOption } from "@/components/marketplace/sort-dropdown";
import {
  reviewJob,
  type ReviewItem,
} from "@/components/marketplace/review-list";

/**
 * Every review list reads the same shape: the review, the reviewer's name, and
 * the job it came from (via the contract). Was identical in three files.
 */
export const REVIEW_SELECT =
  "id, rating, comment, created_at, reviewer_id, profiles:reviewer_id ( full_name ), contracts:contract_id ( jobs ( id, title ) )";

export const REVIEW_SORTS: SortOption[] = [
  { value: "recent", label: "Most recent" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

export type ReviewSort = "recent" | "highest" | "lowest";

export const asReviewSort = (v: string | undefined): ReviewSort =>
  v === "highest" || v === "lowest" ? v : "recent";

/**
 * Ordering lives in SQL rather than in the component so "Highest rated" means
 * highest overall, not highest on the page you happen to be looking at.
 * `created_at desc` is the tiebreak in every branch, matching what the old
 * client-side sort did.
 *
 * `id` is the final tiebreak and is NOT optional: `created_at` is not unique
 * (rows written in the same transaction share a timestamp), and without a
 * total order Postgres may return a different arrangement per LIMIT/OFFSET —
 * so a row can appear on two pages while another never appears at all.
 */
export function applyReviewSort<
  T extends { order(col: string, opts?: { ascending?: boolean }): T },
>(query: T, sort: ReviewSort): T {
  const base =
    sort === "recent"
      ? query.order("created_at", { ascending: false })
      : query
          .order("rating", { ascending: sort === "lowest" })
          .order("created_at", { ascending: false });
  return base.order("id", { ascending: false });
}

/**
 * Map rows from a REVIEW_SELECT query into ReviewItem — the shape used for
 * reviews an employer *received*. `profile_id` and `author_id` both point at
 * the reviewing student here (they diverge on the "reviews made" surface,
 * where profile_id becomes the reviewed employer).
 */
export function toReceivedReviewItems(
  rows:
    | {
        id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        reviewer_id: string | null;
        profiles: unknown;
        contracts: unknown;
      }[]
    | null,
): ReviewItem[] {
  return (rows ?? []).map((r) => {
    const job = reviewJob(r.contracts);
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      // reviewer_id is null once the reviewing student deletes their account.
      reviewer_name: r.reviewer_id
        ? ((r.profiles as { full_name: string | null } | null)?.full_name ?? null)
        : "Deleted user",
      profile_id: r.reviewer_id,
      author_id: r.reviewer_id,
      job_id: job.id,
      job_title: job.title,
    };
  });
}

export interface ReviewStats {
  avg: number;
  count: number;
  /** 5 → 1, for the distribution bars. */
  buckets: { stars: number; n: number }[];
}

export const EMPTY_REVIEW_STATS: ReviewStats = {
  avg: 0,
  count: 0,
  buckets: [5, 4, 3, 2, 1].map((stars) => ({ stars, n: 0 })),
};

/**
 * Average, total, and the per-star distribution for an employer.
 *
 * Deliberately unbounded, but it selects ONLY `rating` — one int per review.
 * The cost of a review fetch was always the embeds and comment text, not the
 * row count, so this stays cheap while letting the displayed list be paged and
 * the summary stay globally correct. Excludes archived reviews to match the
 * public rating (`jobs_with_employer`, SETUP.md).
 */
export async function fetchReviewStats(
  supabase: SupabaseClient,
  employerId: string,
): Promise<ReviewStats> {
  const { data } = await supabase
    .from("reviews")
    .select("rating")
    .eq("employer_id", employerId)
    .eq("archived", false);

  const ratings = (data ?? []).map((r) => r.rating as number);
  if (ratings.length === 0) return EMPTY_REVIEW_STATS;

  return {
    count: ratings.length,
    avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    buckets: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      n: ratings.filter((r) => r === stars).length,
    })),
  };
}
