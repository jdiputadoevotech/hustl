import Link from "next/link";
import Image from "next/image";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { StarRating } from "@/components/marketplace/star-rating";
import type { Gig } from "@/lib/types/database";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

type GigCardData = Pick<
  Gig,
  "id" | "title" | "price" | "category" | "image_url"
> & {
  seller_name?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
};

/** Fiverr-style gig card: cover image, seller row, title, rating, price. */
export function GigCard({ gig }: { gig: GigCardData }) {
  const sellerName = gig.seller_name ?? "Carolinian";
  return (
    <Link href={`/gigs/${gig.id}`} className="group block">
      <div className="overflow-hidden rounded-lg border bg-card transition-shadow group-hover:shadow-md">
        <div className="relative aspect-[4/3] bg-muted">
          {gig.image_url ? (
            <Image
              src={gig.image_url}
              alt={gig.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              No image
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          {/* Seller row */}
          <div className="flex items-center gap-2">
            <AvatarInitials name={sellerName} className="h-6 w-6 text-[10px]" />
            <span className="text-sm font-medium truncate">{sellerName}</span>
          </div>

          {/* Title */}
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-10 group-hover:text-foreground">
            {gig.title}
          </p>

          {/* Rating */}
          <StarRating
            average={gig.rating_avg ?? 0}
            count={gig.rating_count ?? 0}
          />

          {/* Price */}
          <p className="pt-1 text-sm border-t">
            <span className="text-muted-foreground">From </span>
            <span className="font-bold">{peso.format(gig.price)}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
