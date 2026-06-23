import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/marketplace/star-rating";
import { ReviewList, type ReviewItem } from "@/components/marketplace/review-list";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ContactSellerButton } from "@/components/marketplace/contact-seller-button";
import { deleteGig } from "../actions";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ reviewError?: string }>;

export default async function GigDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { reviewError } = await searchParams;
  const supabase = await createClient();

  const { data: gig } = await supabase
    .from("gigs")
    .select(
      "id, title, description, price, category, image_url, student_id, created_at, profiles ( id, full_name, messenger_username )",
    )
    .eq("id", id)
    .single();

  if (!gig) notFound();

  const seller = gig.profiles as unknown as {
    id: string;
    full_name: string | null;
    messenger_username: string | null;
  } | null;

  const user = await getCurrentUser();
  const isOwner = user?.id === gig.student_id;

  // Reviews + aggregate.
  const { data: reviewsRaw } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, reviewer_id, profiles ( full_name )")
    .eq("gig_id", id)
    .order("created_at", { ascending: false });

  const reviews: ReviewItem[] = (reviewsRaw ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    reviewer_name:
      (r.profiles as unknown as { full_name: string | null } | null)
        ?.full_name ?? null,
  }));
  const count = reviews.length;
  const average =
    count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  // Review eligibility: any signed-in user who isn't the gig owner.
  const canReview = !!user && !isOwner;
  const existing = user
    ? (reviewsRaw ?? []).find((r) => r.reviewer_id === user.id)
    : undefined;

  return (
    <div className="py-6 space-y-12">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-5">
          <div className="relative aspect-video w-full rounded-xl border bg-muted overflow-hidden">
            {gig.image_url ? (
              <Image
                src={gig.image_url}
                alt={gig.title}
                fill
                sizes="(max-width: 768px) 100vw, 66vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>
          {gig.category && (
            <span className="text-sm text-muted-foreground">
              {gig.category}
            </span>
          )}
          <h1 className="text-3xl font-bold">{gig.title}</h1>
          <div className="flex items-center gap-4 flex-wrap">
            {seller && (
              <Link
                href={`/profile/${seller.id}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                by {seller.full_name ?? "A Carolinian"}
              </Link>
            )}
            <StarRating average={average} count={count} />
          </div>
          <p className="whitespace-pre-wrap text-foreground/90">
            {gig.description ?? "No description provided."}
          </p>
        </div>

        {/* Sidebar: price + actions */}
        <aside className="md:col-span-1">
          <div className="rounded-xl border p-6 space-y-4 sticky top-20">
            <div>
              <span className="text-sm text-muted-foreground">Starting at</span>
              <p className="text-2xl font-bold">{peso.format(gig.price)}</p>
            </div>

            {isOwner ? (
              <div className="space-y-2">
                <Button asChild className="w-full" variant="outline">
                  <Link href={`/gigs/${gig.id}/edit`}>Edit gig</Link>
                </Button>
                <form action={deleteGig.bind(null, gig.id)}>
                  <Button type="submit" variant="destructive" className="w-full">
                    Delete gig
                  </Button>
                </form>
              </div>
            ) : user ? (
              <ContactSellerButton
                gigId={gig.id}
                gigTitle={gig.title}
                sellerName={seller?.full_name ?? "there"}
                sellerHandle={seller?.messenger_username ?? null}
                buyerEmail={user.email}
              />
            ) : (
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href={`/auth/login`}>Sign in to contact</Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Sign in so the seller gets your email to create the order.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Reviews */}
      <section className="space-y-5 max-w-3xl">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Reviews</h2>
          <StarRating average={average} count={count} />
        </div>

        {reviewError && (
          <p className="text-sm text-destructive border border-destructive/40 rounded-md p-3">
            {reviewError}
          </p>
        )}

        {canReview ? (
          <ReviewForm
            gigId={gig.id}
            existing={
              existing
                ? { rating: existing.rating, comment: existing.comment }
                : null
            }
          />
        ) : (
          !isOwner && (
            <p className="text-sm text-muted-foreground">
              {user
                ? "Order this gig to leave a review."
                : "Sign in and order this gig to leave a review."}
            </p>
          )
        )}

        <ReviewList reviews={reviews} />
      </section>
    </div>
  );
}
