import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Read-only rating display.
 * - compact (default): one filled star + numeric average + (count). Used on cards.
 * - full: a row of 5 stars filled to the average. Used on the gig detail header.
 */
export function StarRating({
  average,
  count,
  compact = true,
  starsOnly = false,
  className,
}: {
  average: number;
  count: number;
  compact?: boolean;
  starsOnly?: boolean; // full mode: render the 5 stars without the numeric label
  className?: string;
}) {
  if (compact) {
    if (count === 0) {
      return (
        <span className={cn("text-xs text-muted-foreground", className)}>
          No reviews yet
        </span>
      );
    }
    return (
      <span className={cn("flex items-center gap-1 text-sm", className)}>
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        <span className="font-semibold">{average.toFixed(1)}</span>
        <span className="text-muted-foreground">({count})</span>
      </span>
    );
  }

  const rounded = Math.round(average);
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              "h-5 w-5",
              i <= rounded
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40",
            )}
          />
        ))}
      </span>
      {!starsOnly && (
        <span className="text-sm text-muted-foreground">
          {count > 0 ? `${average.toFixed(1)} (${count})` : "No reviews yet"}
        </span>
      )}
    </span>
  );
}
