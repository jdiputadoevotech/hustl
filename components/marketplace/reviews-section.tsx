"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Briefcase, Star } from "lucide-react";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { StarRating } from "@/components/marketplace/star-rating";
import type { ReviewItem } from "@/components/marketplace/review-list";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

type SortKey = "recent" | "highest" | "lowest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "highest", label: "Highest rated" },
  { key: "lowest", label: "Lowest rated" },
];

const INITIAL_VISIBLE = 5;

export function ReviewsSection({
  reviews,
  avg,
  count,
}: {
  reviews: ReviewItem[];
  avg: number;
  count: number;
}) {
  const [sort, setSort] = useState<SortKey>("recent");
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...reviews];
    switch (sort) {
      case "highest":
        return copy.sort(
          (a, b) =>
            b.rating - a.rating ||
            +new Date(b.created_at) - +new Date(a.created_at),
        );
      case "lowest":
        return copy.sort(
          (a, b) =>
            a.rating - b.rating ||
            +new Date(b.created_at) - +new Date(a.created_at),
        );
      default:
        return copy.sort(
          (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
        );
    }
  }, [reviews, sort]);

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

  // Distribution: 5 → 1, fill width relative to the largest bucket so a
  // dominant rating reads as full while smaller buckets stay legible.
  const buckets = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    n: reviews.filter((r) => r.rating === stars).length,
  }));
  const maxN = Math.max(...buckets.map((b) => b.n), 1);

  const visible = expanded ? sorted : sorted.slice(0, INITIAL_VISIBLE);
  const hasMore = sorted.length > INITIAL_VISIBLE;

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
      <div className="flex items-center justify-between border-b pb-3">
        <span className="text-sm font-medium">
          Showing {count} {count === 1 ? "review" : "reviews"}
        </span>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-8 rounded-md border border-input bg-background px-2 pr-7 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* List */}
      <ul className="space-y-4">
        {visible.map((r) => (
          <li key={r.id} className="rounded-xl border bg-card p-5">
            {/* Profile + location */}
            <div className="flex items-center gap-3">
              <AvatarInitials
                name={r.reviewer_name}
                className="h-10 w-10 text-sm"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold leading-tight">
                  {r.reviewer_name ?? "Carolinian"}
                </p>
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
            </div>

            {r.comment && (
              <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-foreground/90">
                {r.comment}
              </p>
            )}
          </li>
        ))}
      </ul>

      {hasMore && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium shadow-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          )}
        >
          Show all {count} reviews
        </button>
      )}
    </section>
  );
}
