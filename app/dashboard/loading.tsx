import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Tab switches are navigations, so without this the whole dashboard blanks
 * while the active tab's query runs. Mirrors the real layout: hero + 4 tiles,
 * tab strip, then a list.
 */
export default function DashboardLoading() {
  return (
    <div
      className="space-y-6 py-8"
      role="status"
      aria-busy
      aria-label="Loading dashboard"
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="col-span-2 flex flex-col justify-between gap-6 p-6 md:row-span-2">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </Card>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex flex-col justify-between gap-3 p-4">
            <Skeleton className="h-5 w-5" />
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-3 w-20" />
            </div>
          </Card>
        ))}
      </div>

      <Skeleton className="h-10 w-full max-w-md" />

      <Card className="space-y-4 p-6">
        <Skeleton className="h-9 w-64" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </Card>
    </div>
  );
}
