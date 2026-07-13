"use client";

import { useState } from "react";
import { Star, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitReview, deleteReview } from "@/app/reviews/actions";

interface ReviewFormProps {
  contractId: string;
  existing?: { rating: number; comment: string | null } | null;
  /** Where the action redirects back to after save/delete. Defaults to /dashboard. */
  redirectTo?: string;
}

/**
 * Collapsible star-picker + comment form to create or edit a review of the
 * employer. Collapsed by default so long lists (dashboard) stay scannable;
 * the trigger doubles as a status chip (amber CTA when unwritten, calm summary
 * with the current rating once submitted).
 */
export function ReviewForm({
  contractId,
  existing,
  redirectTo = "/dashboard",
}: ReviewFormProps) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border">
      {/* Trigger — same slide/rotate pattern as FaqAccordion */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2 font-semibold">
          {existing ? (
            <>
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i <= existing.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/40",
                    )}
                    aria-hidden
                  />
                ))}
              </span>
              Edit your review
            </>
          ) : (
            <>
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden />
              Leave a review
            </>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {/* Slide: animate height via grid-template-rows 0fr→1fr, no measured height */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t p-5">
            <form
              action={submitReview.bind(null, contractId)}
              className="space-y-4"
            >
              <input type="hidden" name="rating" value={rating} />
              <input type="hidden" name="redirectTo" value={redirectTo} />

              <div className="space-y-1.5">
                <Label>Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i)}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(0)}
                      aria-label={`${i} star${i > 1 ? "s" : ""}`}
                      className="p-0.5"
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          i <= (hover || rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/40",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comment">Comment (optional)</Label>
                <Textarea
                  id="comment"
                  name="comment"
                  rows={3}
                  defaultValue={existing?.comment ?? ""}
                  placeholder="How was working with this employer?"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={rating < 1}>
                  {existing ? "Update review" : "Post review"}
                </Button>
              </div>
            </form>

            {existing && (
              <form action={deleteReview.bind(null, contractId)}>
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                >
                  Delete my review
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
