import { Skeleton } from "@/components/ui/skeleton";

/**
 * Job detail: two-column split with the sticky pay/actions card on the right,
 * matching app/jobs/[id]/page.tsx (same max-w-6xl page-local width override).
 */
export default function JobDetailLoading() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-4 py-6"
      role="status"
      aria-busy
      aria-label="Loading job"
    >
      <div className="grid items-start gap-8 md:grid-cols-3">
        <div className="space-y-12 md:col-span-2">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-9 w-3/4" />

            {/* Employer line */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>

            <div className="border-t" />
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>

            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={`h-4 ${i === 4 ? "w-2/3" : "w-full"}`}
                />
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="space-y-3">
            <Skeleton className="h-7 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>

          {/* Reviews */}
          <div className="space-y-4">
            <Skeleton className="h-8 w-28" />
            <div className="flex gap-8">
              <Skeleton className="h-16 w-20" />
              <Skeleton className="h-16 flex-1" />
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>

        <aside className="md:col-span-1">
          <div className="overflow-hidden rounded-xl border">
            <div className="space-y-2 border-b bg-muted/50 px-6 py-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-36" />
            </div>
            <div className="space-y-5 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2 border-t pt-5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
