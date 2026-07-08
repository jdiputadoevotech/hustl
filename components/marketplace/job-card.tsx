import Link from "next/link";
import { Flame, MapPin, Clock, BadgeCheck } from "lucide-react";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { StarRating } from "@/components/marketplace/star-rating";
import { Badge } from "@/components/ui/badge";
import {
  JobTypeBadge,
  JOB_TYPE_BANNER_STYLE,
} from "@/components/marketplace/job-type-badge";
import { SaveJobButton } from "@/components/marketplace/save-job-button";
import { formatPay } from "@/lib/pay";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types/database";

type JobCardData = Pick<
  Job,
  | "id"
  | "title"
  | "category"
  | "job_type"
  | "pay_min"
  | "pay_max"
  | "pay_period"
  | "skills"
  | "location"
  | "work_mode"
  | "term"
  | "is_urgent"
  | "created_at"
> & {
  employer_name?: string | null;
  employer_establishment_name?: string | null;
  employer_verification_status?: string | null;
  employer_rating_avg?: number | null;
  employer_rating_count?: number | null;
};

/** Job board card: colored type banner, employer row, title, rating, pay. */
export function JobCard({
  job,
  canSave = false,
  saved = false,
}: {
  job: JobCardData;
  canSave?: boolean;
  saved?: boolean;
}) {
  const poster =
    job.employer_establishment_name || job.employer_name || "An employer";
  const skills = job.skills ?? [];
  const place = job.work_mode || job.location;
  return (
    <Link href={`/jobs/${job.id}`} className="group block">
      <div className="overflow-hidden rounded-lg border bg-card transition-shadow group-hover:shadow-md h-full flex flex-col">
        {/* Title banner (replaces a cover image) */}
        <div
          className={cn(
            "relative h-24 flex items-center justify-center p-3",
            JOB_TYPE_BANNER_STYLE[job.job_type],
          )}
        >
          <p className="text-white font-semibold text-center leading-snug line-clamp-3">
            {job.title}
          </p>
          {canSave && (
            <SaveJobButton jobId={job.id} initialSaved={saved} variant="icon" />
          )}
        </div>

        <div className="p-3 space-y-2 flex-1 flex flex-col">
          {/* Category + urgent + type */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground truncate">
              {job.category ?? "General"}
            </span>
            {job.is_urgent && (
              <Badge
                variant="destructive"
                className="gap-1 px-1.5 py-0 shrink-0"
              >
                <Flame className="h-3 w-3" />
                Urgent
              </Badge>
            )}
            <JobTypeBadge type={job.job_type} className="ml-auto shrink-0" />
          </div>

          {/* Meta: mode/location + term */}
          {(place || job.term) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {place && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {place}
                </span>
              )}
              {job.term && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {job.term}
                </span>
              )}
            </div>
          )}

          {/* Skill badges */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {skills.map((s) => (
                <Badge key={s} variant="outline" className="font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          )}

          {/* Employer rating */}
          <StarRating
            average={job.employer_rating_avg ?? 0}
            count={job.employer_rating_count ?? 0}
          />

          {/* Footer: poster + posted time, pay */}
          <div className="mt-auto pt-2 border-t flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AvatarInitials name={poster} className="h-6 w-6 text-[10px]" />
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-sm font-medium truncate">
                  <span className="truncate">{poster}</span>
                  {job.employer_verification_status === "verified" && (
                    <BadgeCheck
                      className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-label="Verified employer"
                    />
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {timeAgo(job.created_at)}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold shrink-0">
              {formatPay(job.pay_min, job.pay_max, job.pay_period)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
