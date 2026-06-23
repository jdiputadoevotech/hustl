"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/** Upload an optional image to the gig-images bucket; return its public URL. */
async function uploadGigImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File | null,
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("gig-images")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) return null;
  return supabase.storage.from("gig-images").getPublicUrl(path).data.publicUrl;
}

export async function createGig(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (!user.isSeller) {
    redirect("/gigs/new?error=Only%20%40usc.edu.ph%20accounts%20can%20post%20gigs");
  }

  const supabase = await createClient();
  const image_url = await uploadGigImage(
    supabase,
    user.id,
    formData.get("image") as File | null,
  );

  const { data, error } = await supabase
    .from("gigs")
    .insert({
      student_id: user.id,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      price: Number(formData.get("price") ?? 0),
      category: String(formData.get("category") ?? "").trim() || null,
      image_url,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/gigs/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/gigs");
  redirect(`/gigs/${data.id}`);
}

export async function updateGig(gigId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const newImage = await uploadGigImage(
    supabase,
    user.id,
    formData.get("image") as File | null,
  );

  const patch: Record<string, unknown> = {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    price: Number(formData.get("price") ?? 0),
    category: String(formData.get("category") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (newImage) patch.image_url = newImage;

  const { error } = await supabase.from("gigs").update(patch).eq("id", gigId);
  if (error) {
    redirect(`/gigs/${gigId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/gigs/${gigId}`);
  revalidatePath("/gigs");
  redirect(`/gigs/${gigId}`);
}

export async function deleteGig(gigId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  await supabase.from("gigs").delete().eq("id", gigId);

  revalidatePath("/gigs");
  redirect("/dashboard");
}

/**
 * Inquire = create a Pending order, then hand off to the seller's Messenger.
 * Funds are settled P2P off-platform; only the order status lives in Hustl.
 */
export async function createInquiry(gigId: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/login`);

  const supabase = await createClient();

  // Fetch gig + seller's messenger handle.
  const { data: gig } = await supabase
    .from("gigs")
    .select("id, student_id, profiles ( messenger_username )")
    .eq("id", gigId)
    .single();

  await supabase
    .from("orders")
    .insert({ gig_id: gigId, client_id: user.id, status: "Pending" });

  revalidatePath("/dashboard");

  const seller = gig?.profiles as { messenger_username?: string | null } | null;
  const handle = seller?.messenger_username?.trim();
  if (handle) {
    redirect(`https://m.me/${handle}`);
  }
  // No Messenger handle on file — send the buyer to their dashboard.
  redirect("/dashboard?inquiry=created");
}
