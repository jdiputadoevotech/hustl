"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleSaveJob } from "@/app/saved/actions";
import { cn } from "@/lib/utils";

/**
 * Student bookmark toggle. Optimistically flips saved state, then fires the
 * server action. `variant="icon"` is the round overlay on a JobCard banner
 * (must stop the card's <Link> from navigating); `variant="button"` is the
 * full-width labelled button for the job detail sidebar.
 */
export function SaveJobButton({
  jobId,
  initialSaved,
  variant = "button",
}: {
  jobId: string;
  initialSaved: boolean;
  variant?: "icon" | "button";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault(); // JobCard wraps everything in a <Link> — don't navigate
    e.stopPropagation();
    const next = !saved;
    setSaved(next); // optimistic
    startTransition(() => toggleSaveJob(jobId, saved));
  }

  const Icon = saved ? BookmarkCheck : Bookmark;

  if (variant === "icon") {
    // Flush overlay: white outline, dark translucent fill, drop-shadow backdrop;
    // fill turns Hustl-green when saved.
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={saved}
        aria-label={saved ? "Remove bookmark" : "Save job"}
        className="absolute top-2 right-2 transition hover:scale-105 disabled:opacity-60"
      >
        <Bookmark
          className={cn(
            "h-6 w-6 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]",
            saved ? "fill-green-500" : "fill-black/40",
          )}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={saved}
      className="flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent disabled:opacity-60"
    >
      <Icon className={cn("h-4 w-4", saved && "fill-current")} />
      {saved ? "Saved" : "Save job"}
    </button>
  );
}
