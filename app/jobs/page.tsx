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

export const metadata = { title: "Browse jobs — Hustl" };

type SearchParams = Promise<{
  q?: string;
  category?: string;
  type?: string;
  sort?: string;
  max?: string;
}>;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, category, type, sort, max } = await searchParams;
  const activeSort: SortValue = sort === "pay" ? "pay" : "newest";
  const selectedCategory = category
    ? GIG_CATEGORIES.find((c) => c.name === category)
    : null;
  const supabase = await createClient();

  let query = supabase
    .from("jobs_with_employer")
    .select(
      "id, title, category, job_type, pay_min, pay_max, pay_period, skills, location, work_mode, term, company, is_urgent, created_at, employer_name, employer_rating_avg, employer_rating_count",
    );

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

  const { data: jobs } = await query;
  const user = await getCurrentUser();
  const count = jobs?.length ?? 0;

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

      {/* Filter row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <CategoryFilter selected={category} />
          <JobTypeFilter selected={type} />
          <BudgetFilter max={max} />
        </div>
        {user && (
          <Button asChild size="sm">
            <Link href="/jobs/new">Post a job</Link>
          </Button>
        )}
      </div>

      <hr className="border-border" />

      {/* Count + sort */}
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

      {count === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          No jobs found. {user && "Be the first to post one!"}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {jobs!.map((j) => (
            <JobCard
              key={j.id}
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
                company: j.company,
                is_urgent: j.is_urgent,
                created_at: j.created_at,
                employer_name: j.employer_name,
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
