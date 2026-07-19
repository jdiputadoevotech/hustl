import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/components/marketplace/form-error";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { TabsNav } from "@/components/shared/tabs-nav";
import { SearchInput } from "@/components/shared/search-input";
import { CategoryFilter } from "@/components/marketplace/category-filter";
import { JobTypeFilter } from "@/components/marketplace/job-type-filter";
import { monthYear } from "@/lib/time";
import { setJobHidden, deleteJob } from "@/app/admin/actions";

type JobRow = {
  id: string;
  title: string;
  job_type: string;
  category: string | null;
  is_disabled: boolean;
  created_at: string;
  employer_id: string;
  employer_name: string | null;
  employer_establishment_name: string | null;
};

type SearchParams = Promise<{
  tab?: string;
  q?: string;
  type?: string;
  category?: string;
  error?: string;
}>;

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab = "active", q = "", type, category, error } = await searchParams;
  const hidden = tab === "hidden";
  const supabase = await createClient();

  // Counts (independent of the text/type/category filters) for the tab strip.
  const [{ count: activeCount }, { count: hiddenCount }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_disabled", false),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_disabled", true),
  ]);

  let query = supabase
    .from("jobs_with_employer")
    .select(
      "id, title, job_type, category, is_disabled, created_at, employer_id, employer_name, employer_establishment_name",
    )
    .eq("is_disabled", hidden)
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("title", `%${q}%`);
  if (type) query = query.eq("job_type", type);
  if (category) query = query.eq("category", category);
  const { data } = await query;
  const rows = (data ?? []) as JobRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <SearchInput placeholder="Search by title…" />
      </div>

      {error && <FormError>{error}</FormError>}

      <TabsNav
        current={tab}
        tabs={[
          { key: "active", label: "Active", count: activeCount ?? undefined },
          { key: "hidden", label: "Hidden", count: hiddenCount ?? undefined },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <JobTypeFilter selected={type} />
        <CategoryFilter selected={category} />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No jobs here.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((j) => (
            <li
              key={j.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/jobs/${j.id}`}
                  className="font-medium hover:underline"
                >
                  {j.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{j.job_type}</Badge>
                  {j.category && <span>{j.category}</span>}
                  <span>
                    by{" "}
                    {j.employer_establishment_name ||
                      j.employer_name ||
                      "An employer"}
                  </span>
                  <span>Posted {monthYear(j.created_at)}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {hidden ? (
                  <form action={setJobHidden.bind(null, j.id, false)}>
                    <SubmitButton variant="outline" size="sm">
                      Unhide
                    </SubmitButton>
                  </form>
                ) : (
                  <form action={setJobHidden.bind(null, j.id, true)}>
                    <SubmitButton variant="outline" size="sm">
                      Hide
                    </SubmitButton>
                  </form>
                )}

                <ConfirmSubmit
                  action={deleteJob.bind(null, j.id)}
                  label="Delete"
                  variant="destructive"
                  size="sm"
                  confirmTitle="Delete this job?"
                  confirmBody="This permanently removes the job and its contracts. This can't be undone."
                  confirmLabel="Delete permanently"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
