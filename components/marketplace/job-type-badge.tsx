import { cn } from "@/lib/utils";
import type { JobType } from "@/lib/types/database";

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  gig: "Gig",
  "part-time": "Part-time",
  "full-time": "Full-time",
};

/** Tailwind classes per job type, shared by the badge + card banner. */
export const JOB_TYPE_BADGE_STYLE: Record<JobType, string> = {
  gig: "bg-indigo-100 text-indigo-700",
  "part-time": "bg-amber-100 text-amber-700",
  "full-time": "bg-emerald-100 text-emerald-700",
};

export const JOB_TYPE_BANNER_STYLE: Record<JobType, string> = {
  gig: "bg-indigo-500",
  "part-time": "bg-amber-500",
  "full-time": "bg-emerald-500",
};

export function JobTypeBadge({
  type,
  className,
}: {
  type: JobType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        JOB_TYPE_BADGE_STYLE[type],
        className,
      )}
    >
      {JOB_TYPE_LABEL[type]}
    </span>
  );
}
