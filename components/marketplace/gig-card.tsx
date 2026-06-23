import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
};

/** Fiverr-style summary card used in the browse grid and profile pages. */
export function GigCard({ gig }: { gig: GigCardData }) {
  return (
    <Link href={`/gigs/${gig.id}`} className="group">
      <Card className="overflow-hidden h-full transition-shadow group-hover:shadow-md">
        <div className="relative aspect-video bg-muted">
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
        <CardContent className="p-4 space-y-1">
          {gig.category && (
            <span className="text-xs text-muted-foreground">{gig.category}</span>
          )}
          <h3 className="font-medium leading-snug line-clamp-2">{gig.title}</h3>
          {gig.seller_name && (
            <p className="text-xs text-muted-foreground">by {gig.seller_name}</p>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <span className="text-sm text-muted-foreground">
            Starting at{" "}
            <span className="font-semibold text-foreground">
              {peso.format(gig.price)}
            </span>
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
