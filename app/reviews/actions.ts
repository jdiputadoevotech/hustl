"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Create or update the current user's review for a gig (one per gig). RLS
 * requires the user to have an order on the gig, so an ineligible attempt
 * fails at the database. Uses upsert on the (gig_id, reviewer_id) unique key.
 */
export async function submitReview(gigId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const rating = Number(formData.get("rating") ?? 0);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect(`/gigs/${gigId}?reviewError=Pick%20a%20rating%20from%201%20to%205`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reviews").upsert(
    {
      gig_id: gigId,
      reviewer_id: user.id,
      rating,
      comment: String(formData.get("comment") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "gig_id,reviewer_id" },
  );

  if (error) {
    redirect(`/gigs/${gigId}?reviewError=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/gigs/${gigId}`);
  revalidatePath("/gigs");
  redirect(`/gigs/${gigId}`);
}

export async function deleteReview(gigId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  await supabase
    .from("reviews")
    .delete()
    .eq("gig_id", gigId)
    .eq("reviewer_id", user.id);

  revalidatePath(`/gigs/${gigId}`);
  revalidatePath("/gigs");
  redirect(`/gigs/${gigId}`);
}
