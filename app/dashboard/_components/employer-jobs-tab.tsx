import { Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryFilter } from "@/components/marketplace/category-filter";
import { JobTypeFilter } from "@/components/marketplace/job-type-filter";
import { SortDropdown } from "@/components/marketplace/sort-dropdown";
import { SearchInput } from "@/components/shared/search-input";
import { StatusFilter } from "@/components/shared/status-filter";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { pageRange } from "@/lib/paging";
import { JobRow } from "./job-row";
import { JOB_SORTS, JOB_SELECT, type JobRowData } from "../_lib";

const VISIBILITY = [
  { value: "active", label: "Active" },
  { value: "hidden", label: "Hidden" },
];

export async function EmployerJobsTab({
  userId,
  params,
}: {
  userId: string;
  params: { q?: string; status?: string; type?: string; category?: string; sort?: string; page?: string };
}) {
  const supabase = await createClient();
  const { q, status, type, category, sort } = params;
  const { page, from, to, size } = pageRange(params.page);

  let query = supabase
    .from("jobs")
    .select(JOB_SELECT, { count: "exact" })
    .eq("employer_id", userId)
    .range(from, to);

  if (q) query = query.ilike("title", `%${q}%`);
  if (type) query = query.eq("job_type", type);
  if (category) query = query.eq("category", category);
  if (status === "active") query = query.eq("is_disabled", false);
  if (status === "hidden") query = query.eq("is_disabled", true);

  query =
    sort === "title"
      ? query.order("title", { ascending: true })
      : query.order("created_at", { ascending: sort === "oldest" });

  // Offer counts per job: one scoped read tallied in JS. PostgREST has no
  // group-by, and an employer's contract volume is small.
  const [{ data, count }, { data: contractRows }] = await Promise.all([
    query,
    supabase.from("contracts").select("job_id").eq("employer_id", userId),
  ]);

  const offersByJob = new Map<string, number>();
  for (const c of contractRows ?? [])
    offersByJob.set(c.job_id, (offersByJob.get(c.job_id) ?? 0) + 1);

  const jobs = (data ?? []) as unknown as JobRowData[];
  const total = count ?? 0;
  const filtered = Boolean(q || status || type || category);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput placeholder="Search your posts…" />
          <JobTypeFilter selected={type} />
          <CategoryFilter selected={category} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusFilter
            options={VISIBILITY}
            selected={status}
            allLabel="All posts"
          />
          <SortDropdown selected={sort ?? "newest"} options={JOB_SORTS} />
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={filtered ? "No posts match these filters" : "No job posts yet"}
            body={
              filtered
                ? "Try a different search term, or clear the filters to see everything."
                : "Post a job to start receiving messages from students on Messenger."
            }
            action={
              filtered
                ? { href: "/dashboard?tab=jobs", label: "Clear filters" }
                : { href: "/jobs/new", label: "Post a job" }
            }
          />
        ) : (
          <>
            <ul className="divide-y rounded-lg border">
              {jobs.map((j) => (
                <JobRow
                  key={j.id}
                  job={j}
                  offerCount={offersByJob.get(j.id) ?? 0}
                />
              ))}
            </ul>
            <Pagination page={page} pageSize={size} total={total} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
