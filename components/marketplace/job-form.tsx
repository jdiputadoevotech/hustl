"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { FormError } from "@/components/marketplace/form-error";
import { GIG_CATEGORIES } from "@/lib/categories";
import { JOB_TYPE_LABEL } from "@/components/marketplace/job-type-badge";
import type { Job, JobType, PayPeriod, WorkMode } from "@/lib/types/database";

interface JobFormProps {
  action: (formData: FormData) => void | Promise<void>;
  job?: Pick<
    Job,
    | "title"
    | "description"
    | "job_type"
    | "category"
    | "pay_min"
    | "pay_max"
    | "pay_period"
    | "skills"
    | "location"
    | "work_mode"
    | "term"
    | "company"
    | "is_urgent"
  >;
  submitLabel: string;
  error?: string;
  /** When set, renders a Cancel link back to this href beside the submit. */
  cancelHref?: string;
}

const TYPES: JobType[] = ["gig", "part-time", "full-time"];
const SALARY_PERIODS: PayPeriod[] = ["hourly", "weekly", "monthly"];
const WORK_MODES: WorkMode[] = ["on-site", "remote", "hybrid"];

/** Create/edit a job. Pay fields adapt to the selected job type. */
export function JobForm({
  action,
  job,
  submitLabel,
  error,
  cancelHref,
}: JobFormProps) {
  const [type, setType] = useState<JobType>(job?.job_type ?? "gig");
  const isGig = type === "gig";

  // Default salary period for part/full-time (ignore a stored 'project').
  const initialPeriod =
    job?.pay_period && job.pay_period !== "project" ? job.pay_period : "hourly";

  return (
    <form action={action} className="space-y-5 max-w-xl">
      {error && <FormError>{error}</FormError>}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          defaultValue={job?.title}
          placeholder="Need a tutor for Calculus 2"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          name="company"
          maxLength={120}
          defaultValue={job?.company ?? ""}
          placeholder="BrightLeaf Studio"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to post as an individual.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="job_type">Job type</Label>
          <Select
            id="job_type"
            name="job_type"
            value={type}
            onChange={(e) => setType(e.target.value as JobType)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {JOB_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" defaultValue={job?.category ?? ""}>
            <option value="">Select a category</option>
            {GIG_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="work_mode">Work mode</Label>
          <Select
            id="work_mode"
            name="work_mode"
            defaultValue={job?.work_mode ?? ""}
          >
            <option value="">Not specified</option>
            {WORK_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            maxLength={120}
            defaultValue={job?.location ?? ""}
            placeholder="Remote, Manila, Campus…"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="term">Term</Label>
        <Input
          id="term"
          name="term"
          maxLength={60}
          defaultValue={job?.term ?? ""}
          placeholder="e.g. 3-4 days, 2 weeks, Ongoing"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="skills">Skills needed (comma-separated)</Label>
        <Input
          id="skills"
          name="skills"
          defaultValue={(job?.skills ?? []).join(", ")}
          placeholder="Figma, Canva, Branding"
        />
      </div>

      {/* Pay fields adapt to job type */}
      <fieldset className="space-y-2">
        <Label>{isGig ? "Project budget (₱)" : "Salary rate (₱)"}</Label>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <span className="text-xs text-muted-foreground">Min</span>
            <Input
              name="pay_min"
              type="number"
              min={0}
              step="1"
              defaultValue={job?.pay_min ?? ""}
              placeholder="0"
            />
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-xs text-muted-foreground">Max</span>
            <Input
              name="pay_max"
              type="number"
              min={0}
              step="1"
              defaultValue={job?.pay_max ?? ""}
              placeholder="0"
            />
          </div>
          {isGig ? (
            <>
              <input type="hidden" name="pay_period" value="project" />
              <span className="pb-2 text-sm text-muted-foreground">
                per project
              </span>
            </>
          ) : (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Per</span>
              <Select
                name="pay_period"
                defaultValue={initialPeriod}
                containerClassName="w-fit"
              >
                {SALARY_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={job?.description ?? ""}
          placeholder="Describe the work, schedule, and what you're looking for."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_urgent"
          name="is_urgent"
          type="checkbox"
          defaultChecked={job?.is_urgent ?? false}
          className="h-4 w-4 cursor-pointer rounded border-input accent-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Label htmlFor="is_urgent" className="font-normal">
          Mark this job as urgent
        </Label>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton>{submitLabel}</SubmitButton>
        {cancelHref && (
          <Button asChild variant="ghost">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
