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

export const metadata = { title: "Saved jobs — Hustl" };

type SearchParams = Promise<{
  category?: string;
  type?: string;
  sort?: string;
  max?: string;
}>;

export default async function SavedJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { category, type, sort, max } = await searchParams;
  const activeSort: SortValue = sort === "pay" ? "pay" : "newest";

  const supabase = await createClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "student") redirect("/jobs"); // bookmarks are a student feature

  // Newest-saved first. Fetch the ids, then the (still-visible) job rows.
  const { data: saved } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });
  const ids = saved?.map((s) => s.job_id) ?? [];

  let query = supabase
    .from("jobs_with_employer")
    .select(
      "id, title, category, job_type, pay_min, pay_max, pay_period, skills, location, work_mode, term, is_urgent, created_at, employer_name, employer_establishment_name, employer_rating_avg, employer_rating_count",
    )
    .in("id", ids)
    .eq("is_disabled", false); // hide jobs the owner has since hidden/drafted

  if (category) query = query.eq("category", category);
  if (type) query = query.eq("job_type", type);
  if (max && Number(max) > 0) query = query.lte("pay_min", Number(max));
  // Highest pay sorts by pay_max; otherwise keep saved order (applied below).
  if (activeSort === "pay") {
    query = query.order("pay_max", { ascending: false, nullsFirst: false });
  }

  const { data: jobs } = ids.length ? await query : { data: [] };

  // Default sort: restore newest-saved order (the .in() query doesn't preserve it).
  let rows = jobs ?? [];
  if (activeSort !== "pay") {
    const byId = new Map(rows.map((j) => [j.id, j]));
    rows = ids.map((id) => byId.get(id)).filter(Boolean) as typeof rows;
  }
  const count = rows.length;

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

      {count === 0 ? (
        <div className="py-10 text-center space-y-3">
          <p className="text-muted-foreground">
            {ids.length === 0
              ? "No saved jobs yet."
              : "No saved jobs match these filters."}
          </p>
          <Button asChild size="sm">
            <Link href="/jobs">Browse jobs</Link>
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
                employer_rating_avg: j.employer_rating_avg,
                employer_rating_count: j.employer_rating_count,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
