import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading screen for the job create/edit forms. They sit under `app/jobs/`, so
 * without this they'd inherit the browse-grid skeleton and flash the wrong
 * shape before the form appears.
 */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div
      className="mx-auto max-w-3xl space-y-8 py-6"
      role="status"
      aria-busy
      aria-label="Loading form"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="space-y-6 rounded-xl border p-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}
