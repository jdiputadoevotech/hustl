import Link from "next/link";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { StarRating } from "@/components/marketplace/star-rating";
import {
  JobTypeBadge,
  JOB_TYPE_BANNER_STYLE,
  JOB_TYPE_LABEL,
} from "@/components/marketplace/job-type-badge";
import { formatPay } from "@/lib/pay";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types/database";

type JobCardData = Pick<
  Job,
  "id" | "title" | "category" | "job_type" | "pay_min" | "pay_max" | "pay_period"
> & {
  employer_name?: string | null;
  employer_rating_avg?: number | null;
  employer_rating_count?: number | null;
};

/** Job board card: colored type banner, employer row, title, rating, pay. */
export function JobCard({ job }: { job: JobCardData }) {
  const employer = job.employer_name ?? "An employer";
  return (
    <Link href={`/jobs/${job.id}`} className="group block">
      <div className="overflow-hidden rounded-lg border bg-card transition-shadow group-hover:shadow-md h-full flex flex-col">
        {/* Type banner (replaces a cover image) */}
        <div
          className={cn(
            "h-20 flex items-center justify-center",
            JOB_TYPE_BANNER_STYLE[job.job_type],
          )}
        >
          <span className="text-white font-semibold tracking-wide">
            {JOB_TYPE_LABEL[job.job_type]}
          </span>
        </div>

        <div className="p-3 space-y-2 flex-1 flex flex-col">
          {/* Employer row */}
          <div className="flex items-center gap-2">
            <AvatarInitials name={employer} className="h-6 w-6 text-[10px]" />
            <span className="text-sm font-medium truncate">{employer}</span>
            <JobTypeBadge type={job.job_type} className="ml-auto shrink-0" />
          </div>

          {/* Title */}
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-10 group-hover:text-foreground">
            {job.title}
          </p>

          {/* Employer rating */}
          <StarRating
            average={job.employer_rating_avg ?? 0}
            count={job.employer_rating_count ?? 0}
          />

          {/* Category + pay */}
          <div className="mt-auto pt-1 border-t flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate">
              {job.category ?? "General"}
            </span>
            <span className="text-sm font-bold shrink-0">
              {formatPay(job.pay_min, job.pay_max, job.pay_period)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
