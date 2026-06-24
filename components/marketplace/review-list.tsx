import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { StarRating } from "@/components/marketplace/star-rating";

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
}

export function ReviewList({ reviews }: { reviews: ReviewItem[] }) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reviews yet. Reviews appear here after a completed contract.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {reviews.map((r) => (
        <li key={r.id} className="py-4 space-y-2">
          <div className="flex items-center gap-2">
            <AvatarInitials name={r.reviewer_name} className="h-7 w-7 text-xs" />
            <span className="font-medium text-sm">
              {r.reviewer_name ?? "Carolinian"}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(r.created_at).toLocaleDateString()}
            </span>
          </div>
          <StarRating average={r.rating} count={1} compact={false} starsOnly />
          {r.comment && (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
              {r.comment}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
