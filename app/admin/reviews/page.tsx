import Link from "next/link";
import { Star } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/components/marketplace/form-error";
import { StarRating } from "@/components/marketplace/star-rating";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { TabsNav } from "@/components/shared/tabs-nav";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { PAGE_SIZE, pageRange } from "@/lib/paging";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { setReviewArchived, deleteReviewAdmin } from "@/app/admin/actions";
import { reviewJob } from "@/components/marketplace/review-list";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  archived: boolean;
  employer_id: string;
  reviewer_id: string | null;
  contract_id: string | null;
  created_at: string;
  contracts: unknown; // nested jobs embed, normalized via reviewJob
};

const REVIEW_ADMIN_SELECT =
  "id, rating, comment, archived, employer_id, reviewer_id, contract_id, created_at, contracts:contract_id ( jobs ( id, title ) )";

type SearchParams = Promise<{
  tab?: string;
  q?: string;
  focus?: string;
  error?: string;
  page?: string;
}>;

const TABS = ["visible", "archived", "reported"] as const;
type Tab = (typeof TABS)[number];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab, q, focus, error, page: pageParam } = await searchParams;
  const { page, from, to, size } = pageRange(pageParam, PAGE_SIZE);

  // Service-role read: bypass RLS so archived reviews are visible to admins.
  const admin = createAdminClient();

  // Open reports per review → report counts + the "Reported" bucket.
  const { data: openReports } = await admin
    .from("reports")
    .select("target_id")
    .eq("target_type", "review")
    .eq("status", "open");
  const reportCount = new Map<string, number>();
  for (const r of openReports ?? [])
    reportCount.set(r.target_id, (reportCount.get(r.target_id) ?? 0) + 1);
  const reportedIds = [...reportCount.keys()];

  // A report link (?focus=) may point at an archived review — land on its tab.
  // One row lookup rather than scanning the whole table, so it still works when
  // the focused review isn't on the current page.
  const { data: focused } = focus
    ? await admin.from("reviews").select("archived").eq("id", focus).maybeSingle()
    : { data: null };
  const current: Tab = focused
    ? focused.archived
      ? "archived"
      : "visible"
    : TABS.includes(tab as Tab)
      ? (tab as Tab)
      : "visible";

  // Tab predicates now run in SQL instead of filtering a full table read in JS.
  // `.in()` rejects an empty list, so an empty Reported bucket matches the nil
  // UUID — i.e. nothing — rather than erroring.
  const NO_MATCH = "00000000-0000-0000-0000-000000000000";

  // `q` is deliberately excluded from the counts, so the tab strip shows bucket
  // totals rather than search hits — matching the other admin pages.
  const countFor = (forTab: Tab) => {
    const base = admin.from("reviews").select("*", { count: "exact", head: true });
    if (forTab === "visible") return base.eq("archived", false);
    if (forTab === "archived") return base.eq("archived", true);
    return reportedIds.length ? base.in("id", reportedIds) : base.eq("id", NO_MATCH);
  };

  const listBase = admin
    .from("reviews")
    .select(REVIEW_ADMIN_SELECT, { count: "exact" });
  let listQuery = (
    current === "visible"
      ? listBase.eq("archived", false)
      : current === "archived"
        ? listBase.eq("archived", true)
        : reportedIds.length
          ? listBase.in("id", reportedIds)
          : listBase.eq("id", NO_MATCH)
  )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false }); // stable tiebreak for paging
  if (q) listQuery = listQuery.ilike("comment", `%${q}%`);

  const [
    { count: visibleCount },
    { count: archivedCount },
    { count: reportedTotal },
    { data, count: total },
  ] = await Promise.all([
    countFor("visible"),
    countFor("archived"),
    countFor("reported"),
    listQuery.range(from, to),
  ]);

  const counts = {
    visible: visibleCount ?? 0,
    archived: archivedCount ?? 0,
    reported: reportedTotal ?? 0,
  };
  const rows = (data ?? []) as ReviewRow[];

  // Batch-hydrate reviewer + employer names in one profiles read.
  const profileIds = new Set<string>();
  for (const r of rows) {
    profileIds.add(r.employer_id);
    if (r.reviewer_id) profileIds.add(r.reviewer_id);
  }
  const { data: profs } = profileIds.size
    ? await admin
        .from("profiles")
        .select("id, full_name, establishment_name")
        .in("id", [...profileIds])
    : { data: [] as { id: string; full_name: string | null; establishment_name: string | null }[] };
  const nameById = new Map(
    (profs ?? []).map((p) => [p.id, p.establishment_name || p.full_name || "Carolinian"]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Star className="h-6 w-6" />
          Reviews
        </h1>
        <SearchInput placeholder="Search review text…" />
      </div>

      {error && <FormError>{error}</FormError>}

      <TabsNav
        current={current}
        tabs={[
          { key: "visible", label: "Visible", count: counts.visible },
          { key: "archived", label: "Archived", count: counts.archived },
          { key: "reported", label: "Reported", count: counts.reported },
        ]}
      />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews here.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((r) => {
            const job = reviewJob(r.contracts);
            const reviewer = r.reviewer_id
              ? (nameById.get(r.reviewer_id) ?? "Carolinian")
              : "Deleted user";
            const employer = nameById.get(r.employer_id) ?? "an employer";
            const reports = reportCount.get(r.id) ?? 0;
            return (
              <li
                key={r.id}
                className={cn(
                  "flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between",
                  r.id === focus && "bg-amber-50 dark:bg-amber-950/20",
                )}
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRating
                      average={r.rating}
                      count={1}
                      compact={false}
                      starsOnly
                      className="gap-0"
                    />
                    <span className="text-sm font-semibold tabular-nums">
                      {r.rating}
                    </span>
                    {r.archived && <Badge variant="secondary">Archived</Badge>}
                    {reports > 0 && (
                      <Link href="/admin/reports">
                        <Badge variant="destructive">
                          {reports} {reports === 1 ? "report" : "reports"}
                        </Badge>
                      </Link>
                    )}
                  </div>
                  {r.comment && (
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">
                      {r.comment}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    by{" "}
                    {r.reviewer_id ? (
                      <Link
                        href={`/profile/${r.reviewer_id}`}
                        className="hover:underline"
                      >
                        {reviewer}
                      </Link>
                    ) : (
                      reviewer
                    )}{" "}
                    →{" "}
                    <Link
                      href={`/profile/${r.employer_id}`}
                      className="hover:underline"
                    >
                      {employer}
                    </Link>
                    {job.title && (
                      <>
                        {" · "}
                        {job.id ? (
                          <Link
                            href={`/jobs/${job.id}`}
                            className="hover:underline"
                          >
                            {job.title}
                          </Link>
                        ) : (
                          job.title
                        )}
                      </>
                    )}{" "}
                    · {timeAgo(r.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {r.archived ? (
                    <form action={setReviewArchived.bind(null, r.id, false)}>
                      <SubmitButton variant="outline" size="sm">
                        Restore
                      </SubmitButton>
                    </form>
                  ) : (
                    <ConfirmSubmit
                      action={setReviewArchived.bind(null, r.id, true)}
                      label="Archive"
                      variant="outline"
                      size="sm"
                      confirmTitle="Archive this review?"
                      confirmBody="It will be hidden everywhere public and dropped from the employer's rating. You can restore it later. Any open reports on it are resolved."
                      confirmLabel="Archive review"
                    />
                  )}
                  <ConfirmSubmit
                    action={deleteReviewAdmin.bind(null, r.id)}
                    label="Delete"
                    size="sm"
                    confirmTitle="Permanently delete this review?"
                    confirmBody="This removes the review for good and can't be undone. Prefer Archive unless the content must be erased."
                    confirmLabel="Delete forever"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={page} pageSize={size} total={total ?? 0} />
    </div>
  );
}
