import { Skeleton } from "@/components/ui/skeleton";

/**
 * Profile: full-width header above the two-column split, matching
 * app/profile/[id]/page.tsx. The right column is the sticky establishment
 * sidebar; the left is posted jobs (employer) or contracts (student).
 */
export default function ProfileLoading() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-8 py-6"
      role="status"
      aria-busy
      aria-label="Loading profile"
    >
      <header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4 sm:gap-5">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full sm:h-20 sm:w-20" />
          <div className="min-w-0 space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-3/4 max-w-sm" />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-20 rounded-full" />
              ))}
            </div>
          </div>
        </div>
        <Skeleton className="h-9 w-28 shrink-0" />
      </header>

      <div className="grid items-start gap-8 md:grid-cols-3">
        <div className="space-y-8 md:col-span-2">
          <div className="space-y-4">
            <Skeleton className="h-8 w-40" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          </div>

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

        <aside className="md:col-span-1 space-y-4">
          <div className="space-y-4 rounded-xl border p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="space-y-2 border-t pt-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
        </aside>
      </div>
    </div>
  );
}
