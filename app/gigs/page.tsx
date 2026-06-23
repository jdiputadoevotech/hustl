import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { GigCard } from "@/components/marketplace/gig-card";
import { GIG_CATEGORIES } from "@/lib/categories";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Browse gigs — Hustl" };

type SearchParams = Promise<{ q?: string; category?: string }>;

export default async function GigsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, category } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("gigs_with_ratings")
    .select(
      "id, title, price, category, image_url, seller_name, rating_avg, rating_count",
    )
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("title", `%${q}%`);
  if (category) query = query.eq("category", category);

  const { data: gigs } = await query;
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Browse gigs</h1>
        {user?.isSeller && (
          <Button asChild size="sm">
            <Link href="/gigs/new">Post a gig</Link>
          </Button>
        )}
      </div>

      {/* Search + category filter (GET form -> URL searchParams) */}
      <form className="flex gap-2 flex-wrap" action="/gigs" method="get">
        <Input
          name="q"
          placeholder="Search gigs..."
          defaultValue={q ?? ""}
          className="max-w-xs"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All categories</option>
          {GIG_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>

      {!gigs || gigs.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          No gigs found. {user?.isSeller && "Be the first to post one!"}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {gigs.map((g) => (
            <GigCard
              key={g.id}
              gig={{
                id: g.id,
                title: g.title,
                price: g.price,
                category: g.category,
                image_url: g.image_url,
                seller_name: g.seller_name,
                rating_avg: g.rating_avg,
                rating_count: g.rating_count,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
