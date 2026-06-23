import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { GigCard } from "@/components/marketplace/gig-card";
import { CategoryFilter } from "@/components/marketplace/category-filter";
import { BudgetFilter } from "@/components/marketplace/budget-filter";
import {
  SortDropdown,
  type SortValue,
} from "@/components/marketplace/sort-dropdown";
import { GIG_CATEGORIES } from "@/lib/categories";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Browse gigs — Hustl" };

type SearchParams = Promise<{
  q?: string;
  category?: string;
  sort?: string;
  max?: string;
}>;

export default async function GigsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, category, sort, max } = await searchParams;
  const activeSort: SortValue = sort === "reviews" ? "reviews" : "newest";
  const selectedCategory = category
    ? GIG_CATEGORIES.find((c) => c.name === category)
    : null;
  const supabase = await createClient();

  let query = supabase
    .from("gigs_with_ratings")
    .select(
      "id, title, price, category, image_url, seller_name, rating_avg, rating_count",
    );

  if (q) query = query.ilike("title", `%${q}%`);
  if (category) query = query.eq("category", category);
  if (max && Number(max) > 0) query = query.lte("price", Number(max));

  // Sort: Most Reviews by rating_count, otherwise Newest by created_at.
  query =
    activeSort === "reviews"
      ? query.order("rating_count", { ascending: false })
      : query.order("created_at", { ascending: false });

  const { data: gigs } = await query;
  const user = await getCurrentUser();
  const count = gigs?.length ?? 0;

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Category header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">
          {selectedCategory ? selectedCategory.name : "Find a gig"}
        </h1>
        <p className="text-muted-foreground">
          {selectedCategory
            ? selectedCategory.description
            : "Hire fellow USC students for the work you need."}
        </p>
      </div>

      {/* Filter row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <CategoryFilter selected={category} />
          <BudgetFilter max={max} />
        </div>
        {user?.isSeller && (
          <Button asChild size="sm">
            <Link href="/gigs/new">Post a gig</Link>
          </Button>
        )}
      </div>

      <hr className="border-border" />

      {/* Count + sort */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {count.toLocaleString()} {count === 1 ? "result" : "results"}
          {category && (
            <>
              {" in "}
              <span className="font-medium text-foreground">{category}</span>
            </>
          )}
        </p>
        <SortDropdown selected={activeSort} />
      </div>

      {count === 0 ? (
        <p className="text-muted-foreground py-10 text-center">
          No gigs found. {user?.isSeller && "Be the first to post one!"}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {gigs!.map((g) => (
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
