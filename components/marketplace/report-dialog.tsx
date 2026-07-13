"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { createReport } from "@/app/reports/actions";
import type { ReportTargetType } from "@/lib/types/database";

interface ReportDialogProps {
  targetType: ReportTargetType;
  targetId: string;
  redirectTo: string; // page to return to (e.g. /jobs/123, /profile/abc)
  label?: string; // trigger text; defaults to "Report user"/"Report job"
}

const REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "scam", label: "Scam or fraud" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

/**
 * "Report" trigger + modal form. Posts to the createReport server action, which
 * redirects back to `redirectTo` with ?reportOk / ?reportError. Admins are
 * notified; the reported user is not.
 */
export function ReportDialog({
  targetType,
  targetId,
  redirectTo,
  label,
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const triggerLabel =
    label ?? (targetType === "profile" ? "Report user" : "Report job");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <Flag className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
          <DialogDescription>
            Reports go to the Hustl admins. The person or job you report is not
            notified.
          </DialogDescription>
        </DialogHeader>

        <form action={createReport} className="space-y-4">
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="space-y-1.5">
            <Label htmlFor="report-reason">Reason</Label>
            <select
              id="report-reason"
              name="reason"
              required
              defaultValue=""
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="" disabled>
                Select a reason…
              </option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea
              id="report-details"
              name="details"
              rows={4}
              maxLength={1000}
              placeholder="Add anything that helps us understand the problem."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton>Submit report</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
