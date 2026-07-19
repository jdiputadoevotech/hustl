import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { JobCard } from "@/components/marketplace/job-card";
import { CategoryFilter } from "@/components/marketplace/category-filter";
import { JobTypeFilter } from "@/components/marketplace/job-type-filter";
import { BudgetFilter } from "@/components/marketplace/budget-filter";
import {
  SortDropdown,
  type SortValue,
} from "@/components/marketplace/sort-dropdown";
import { GIG_CATEGORIES } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { JOB_CARD_SELECT } from "@/lib/jobs";
import { GRID_PAGE_SIZE, pageRange } from "@/lib/paging";

export const metadata = { title: "Browse jobs — Hustl" };

type SearchParams = Promise<{
  q?: string;
  category?: string;
  type?: string;
  sort?: string;
  max?: string;
  page?: string;
}>;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, category, type, sort, max, page: pageParam } = await searchParams;
  const { page, from, to, size } = pageRange(pageParam, GRID_PAGE_SIZE);
  const activeSort: SortValue = sort === "pay" ? "pay" : "newest";
  const selectedCategory = category
    ? GIG_CATEGORIES.find((c) => c.name === category)
    : null;
  const supabase = await createClient();

  let query = supabase
    .from("jobs_with_employer")
    .select(JOB_CARD_SELECT, { count: "exact" })
    .range(from, to);

  query = query.eq("is_disabled", false); // hide drafts / incomplete jobs

  if (q) query = query.ilike("title", `%${q}%`);
  if (category) query = query.eq("category", category);
  if (type) query = query.eq("job_type", type);
  if (max && Number(max) > 0) query = query.lte("pay_min", Number(max));

  // Sort: Highest pay by pay_max, otherwise Newest by created_at.
  query =
    activeSort === "pay"
      ? query.order("pay_max", { ascending: false, nullsFirst: false })
      : query.order("created_at", { ascending: false });
  // Stable tiebreak: neither pay_max nor created_at is unique, and without a
  // total order LIMIT/OFFSET can repeat a row on one page and skip another.
  query = query.order("id", { ascending: false });

  const { data: jobs, count: total } = await query;
  const rows = jobs ?? [];
  const user = await getCurrentUser();
  let isEmployer = false;
  let isStudent = false;
  let isAdmin = false;
  const savedIds = new Set<string>();
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isEmployer = me?.role === "employer";
    isStudent = me?.role === "student";
    isAdmin = me?.role === "admin";
    // Only the jobs on this page need a heart state, so scope the lookup to them.
    if (isStudent && rows.length) {
      const { data: saved } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("student_id", user.id)
        .in(
          "job_id",
          rows.map((j) => j.id),
        );
      saved?.forEach((s) => savedIds.add(s.job_id));
    }
  }
  const count = total ?? 0;

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">
          {selectedCategory ? selectedCategory.name : "Find a job"}
        </h1>
        <p className="text-muted-foreground">
          {selectedCategory
            ? selectedCategory.description
            : "Browse gigs and part- or full-time roles posted by fellow students."}
        </p>
      </div>

      {/* Filters — sticky under the navbar (h-20 = top-20). Admins also get the
          AdminNav (h-11) stacked below the navbar, so offset by 20+11 = 7.75rem
          for them. Full-bleed bg covers cards scrolling underneath; z-10. */}
      <div
        className={`sticky ${isAdmin ? "top-[7.75rem]" : "top-20"} z-10 -mx-6 lg:-mx-8 flex flex-col gap-4 border-b bg-background px-6 lg:px-8 py-4`}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <CategoryFilter selected={category} />
            <JobTypeFilter selected={type} />
            <BudgetFilter max={max} />
          </div>
          {isEmployer && (
            <Button asChild size="sm">
              <Link href="/jobs/new">Post a job</Link>
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {count.toLocaleString()} {count === 1 ? "job" : "jobs"}
            {selectedCategory && (
              <>
                {" in "}
                <span className="font-medium text-foreground">
                  {selectedCategory.name}
                </span>
              </>
            )}
          </p>
          <SortDropdown selected={activeSort} />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          {/* Keyed off `page`, not `count`: when ?page= is entirely past the
              end, PostgREST returns no usable total and count collapses to 0. */}
          {page > 1 ? (
            <>
              That page is empty.{" "}
              <Link href="/jobs" className="underline">
                Back to the first page
              </Link>
              .
            </>
          ) : (
            <>No jobs found. {isEmployer && "Be the first to post one!"}</>
          )}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {rows.map((j) => (
            <JobCard
              key={j.id}
              canSave={isStudent}
              saved={savedIds.has(j.id)}
              job={{
                id: j.id,
                title: j.title,
                category: j.category,
                job_type: j.job_type,
                pay_min: j.pay_min,
                pay_max: j.pay_max,
                pay_period: j.pay_period,
                skills: j.skills,
                location: j.location,
                work_mode: j.work_mode,
                term: j.term,
                is_urgent: j.is_urgent,
                created_at: j.created_at,
                employer_name: j.employer_name,
                employer_establishment_name: j.employer_establishment_name,
                employer_verification_status: j.employer_verification_status,
                employer_rating_avg: j.employer_rating_avg,
                employer_rating_count: j.employer_rating_count,
              }}
            />
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={size} total={count} />
    </div>
  );
}
