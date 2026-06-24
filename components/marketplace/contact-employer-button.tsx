"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JOB_TYPE_LABEL } from "@/components/marketplace/job-type-badge";
import type { JobType } from "@/lib/types/database";

interface ContactEmployerButtonProps {
  jobId: string;
  jobTitle: string;
  jobType: JobType;
  employerName: string;
  employerHandle: string | null; // messenger_username
  studentEmail: string;
}

/**
 * Opens the employer's Messenger in a NEW TAB with a prefilled inquiry, and
 * copies the message to the clipboard as a fallback. No contract is created
 * here — the employer sends an offer later from their dashboard.
 */
export function ContactEmployerButton({
  jobId,
  jobTitle,
  jobType,
  employerName,
  employerHandle,
  studentEmail,
}: ContactEmployerButtonProps) {
  const [copied, setCopied] = useState(false);
  const [noHandle, setNoHandle] = useState(false);

  const handleClick = async () => {
    const jobUrl = `${window.location.origin}/jobs/${jobId}`;
    const message =
      `Hi ${employerName}, I'm interested in your ${JOB_TYPE_LABEL[jobType]} posting "${jobTitle}".\n` +
      `Job link: ${jobUrl}\n` +
      `My email: ${studentEmail}`;

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      // best-effort
    }

    if (employerHandle) {
      const url = `https://m.me/${employerHandle}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setNoHandle(true);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" className="w-full" onClick={handleClick}>
        Contact employer
      </Button>
      {noHandle ? (
        <p className="text-xs text-destructive">
          This employer hasn&apos;t set a Messenger username yet. Your message was
          copied to the clipboard — reach out to them directly.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Opens Messenger in a new tab with a prefilled message
          {copied ? " (also copied to your clipboard)" : ""}. If they decide to
          hire you, they&apos;ll send a job offer to your dashboard.
        </p>
      )}
    </div>
  );
}
