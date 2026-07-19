import Link from "next/link";
import { EyeOff, Send, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JobTypeBadge } from "@/components/marketplace/job-type-badge";
import { formatPay } from "@/lib/pay";
import { timeAgo } from "@/lib/time";
import type { JobRowData } from "../_lib";

/**
 * One of the employer's own posts. Unlike the public JobCard this is a dense
 * management row: it surfaces the hidden state and how many offers the post has
 * produced, then routes straight to the actions an owner needs.
 */
export function JobRow({
  job,
  offerCount,
}: {
  job: JobRowData;
  offerCount: number;
}) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/jobs/${job.id}`}
            className="truncate font-medium hover:underline"
          >
            {job.title}
          </Link>
          <JobTypeBadge type={job.job_type} />
          {job.is_disabled && (
            <Badge variant="outline" className="gap-1">
              <EyeOff className="h-3 w-3" aria-hidden />
              Hidden
            </Badge>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{job.category}</span>
          <span aria-hidden>·</span>
          <span>{formatPay(job.pay_min, job.pay_max, job.pay_period)}</span>
          <span aria-hidden>·</span>
          <span>Posted {timeAgo(job.created_at)}</span>
          <span aria-hidden>·</span>
          <Link
            href={`/dashboard?tab=offers&q=${encodeURIComponent(job.title)}`}
            className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
          >
            <Users className="h-3.5 w-3.5" aria-hidden />
            {offerCount} {offerCount === 1 ? "offer" : "offers"}
          </Link>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 text-sm">
        <Link
          href={`/dashboard?tab=offers&job=${job.id}`}
          className="inline-flex items-center gap-1 font-medium hover:underline"
        >
          <Send className="h-3.5 w-3.5" aria-hidden />
          Send offer
        </Link>
        <Link
          href={`/jobs/${job.id}/edit`}
          className="text-muted-foreground underline hover:text-foreground"
        >
          Edit
        </Link>
      </div>
    </li>
  );
}
