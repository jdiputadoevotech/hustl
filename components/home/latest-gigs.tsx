import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JobCard } from "@/components/marketplace/job-card";
import type { JobWithEmployer } from "@/lib/types/database";

/** Live "Latest gigs" strip on the home page — reuses the marketplace JobCard. */
export function LatestGigs({
  jobs,
  canSave,
  savedIds,
}: {
  jobs: JobWithEmployer[];
  canSave: boolean;
  savedIds: Set<string>;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Latest gigs</h2>
          <p className="text-muted-foreground">
            Fresh openings posted by fellow students.
          </p>
        </div>
        <Link
          href="/jobs"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {jobs.map((j) => (
          <JobCard key={j.id} canSave={canSave} saved={savedIds.has(j.id)} job={j} />
        ))}
      </div>
    </section>
  );
}
