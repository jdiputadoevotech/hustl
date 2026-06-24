"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitReview, deleteReview } from "@/app/reviews/actions";

interface ReviewFormProps {
  contractId: string;
  existing?: { rating: number; comment: string | null } | null;
}

/** Star-picker + comment form to create or edit a review of the employer. */
export function ReviewForm({ contractId, existing }: ReviewFormProps) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <h3 className="font-semibold">
        {existing ? "Edit your review" : "Write a review"}
      </h3>

      <form action={submitReview.bind(null, contractId)} className="space-y-4">
        <input type="hidden" name="rating" value={rating} />

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
          <Button type="submit" variant="ghost" size="sm" className="text-destructive">
            Delete my review
          </Button>
        </form>
      )}
    </div>
  );
}
