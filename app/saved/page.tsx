import Link from "next/link";
import { redirect } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { JOB_CARD_SELECT } from "@/lib/jobs";
import { GRID_PAGE_SIZE, pageRange } from "@/lib/paging";

export const metadata = { title: "Saved jobs — Hustl" };

type SearchParams = Promise<{
  category?: string;
  type?: string;
  sort?: string;
  max?: string;
  page?: string;
}>;

export default async function SavedJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { category, type, sort, max, page: pageParam } = await searchParams;
  const activeSort: SortValue = sort === "pay" ? "pay" : "newest";
  const { page, from, to, size } = pageRange(pageParam, GRID_PAGE_SIZE);

  const supabase = await createClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "student") redirect("/jobs"); // bookmarks are a student feature

  // The sort key (saved_jobs.created_at) lives on a different table than the
  // filters (jobs.*), so paging either side alone gives wrong pages. An !inner
  // join lets one query own both: filters on the embedded table narrow the
  // parent, and the count is the real total. Sorting by jobs(pay_max) orders
  // the parent — verified against PostgREST, not assumed.
  let idQuery = supabase
    .from("saved_jobs")
    .select("job_id, jobs!inner( id )", { count: "exact" })
    .eq("student_id", user.id)
    .eq("jobs.is_disabled", false) // hide jobs the owner has since hidden/drafted
    .range(from, to);

  if (category) idQuery = idQuery.eq("jobs.category", category);
  if (type) idQuery = idQuery.eq("jobs.job_type", type);
  if (max && Number(max) > 0) idQuery = idQuery.lte("jobs.pay_min", Number(max));

  idQuery =
    activeSort === "pay"
      ? idQuery.order("jobs(pay_max)", { ascending: false, nullsFirst: false })
      : idQuery.order("created_at", { ascending: false }); // newest-saved first
  // Stable tiebreak — see the note in lib/reviews.ts applyReviewSort.
  idQuery = idQuery.order("id", { ascending: false });

  const { data: savedPage, count: total } = await idQuery;
  const ids = savedPage?.map((s) => s.job_id) ?? [];

  // Hydrate just this page's ids with the full card data.
  const { data: jobs } = ids.length
    ? await supabase
        .from("jobs_with_employer")
        .select(JOB_CARD_SELECT)
        .in("id", ids)
    : { data: [] };

  // .in() doesn't preserve order — restore the order the page query established.
  const byId = new Map((jobs ?? []).map((j) => [j.id, j]));
  const rows = ids
    .map((id) => byId.get(id))
    .filter(Boolean) as NonNullable<typeof jobs>;

  const count = total ?? 0;

  // Does this student have any saves at all? Distinguishes "nothing saved" from
  // "nothing matched these filters" without loading every saved row.
  const { count: savedTotal } = await supabase
    .from("saved_jobs")
    .select("*", { count: "exact", head: true })
    .eq("student_id", user.id);

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Saved jobs</h1>
        <p className="text-muted-foreground">
          Jobs you bookmarked to revisit later.
        </p>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <CategoryFilter selected={category} />
        <JobTypeFilter selected={type} />
        <BudgetFilter max={max} />
      </div>

      <hr className="border-border" />

      {/* Count + sort */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {count.toLocaleString()} saved {count === 1 ? "job" : "jobs"}
        </p>
        <SortDropdown selected={activeSort} />
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center space-y-3">
          {/* `page > 1` first: past the last page, PostgREST returns no usable
              total, so `count` collapses to 0 and would read as "no matches". */}
          <p className="text-muted-foreground">
            {page > 1
              ? "That page is empty."
              : savedTotal === 0
                ? "No saved jobs yet."
                : "No saved jobs match these filters."}
          </p>
          <Button asChild size="sm">
            <Link href={page > 1 ? "/saved" : "/jobs"}>
              {page > 1 ? "Back to the first page" : "Browse jobs"}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {rows.map((j) => (
            <JobCard
              key={j.id}
              canSave
              saved
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
