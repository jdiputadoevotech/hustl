import { Skeleton } from "@/components/ui/skeleton";

/**
 * Browse page: header, the sticky filter bar, then the card grid. Mirrors
 * app/jobs/page.tsx so the layout doesn't shift when the real jobs land.
 */
export default function JobsLoading() {
  return (
    <div
      className="flex flex-col gap-6 py-2"
      role="status"
      aria-busy
      aria-label="Loading jobs"
    >
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Matches the sticky filter bar's full-bleed offsets */}
      <div className="-mx-6 flex flex-col gap-4 border-b bg-background px-6 py-4 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border">
            <Skeleton className="h-2 w-full rounded-none" />
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-28" />
              <div className="flex items-center gap-2 border-t pt-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
