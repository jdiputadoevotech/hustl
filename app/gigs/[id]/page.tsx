import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { createInquiry, deleteGig } from "../actions";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

type Params = Promise<{ id: string }>;

export default async function GigDetailPage({ params }: { params: Params }) {
  const { id } = await params;
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

  return (
    <div className="grid md:grid-cols-3 gap-8 py-6">
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
          <span className="text-sm text-muted-foreground">{gig.category}</span>
        )}
        <h1 className="text-3xl font-bold">{gig.title}</h1>
        {seller && (
          <Link
            href={`/profile/${seller.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            by {seller.full_name ?? "A Carolinian"}
          </Link>
        )}
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
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                >
                  Delete gig
                </Button>
              </form>
            </div>
          ) : (
            <form action={createInquiry.bind(null, gig.id)}>
              <Button type="submit" className="w-full">
                Contact on Messenger
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Creates an order and opens the seller&apos;s Messenger. Payment
                is settled between you and the seller.
              </p>
            </form>
          )}
        </div>
      </aside>
    </div>
  );
}
