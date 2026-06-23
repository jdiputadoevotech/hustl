"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { OrderStatus } from "@/lib/types/database";

/**
 * Advance an order's status. RLS restricts this to the seller who owns the
 * gig, so an unauthorized attempt simply affects zero rows.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  revalidatePath("/dashboard");
}

/**
 * Seller creates an order for one of their gigs, identifying the buyer by the
 * email they sent over Messenger. RLS restricts insert to the gig's owner.
 */
export async function createSellerOrder(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const gigId = String(formData.get("gig_id") ?? "");
  const clientEmail = String(formData.get("client_email") ?? "").trim();

  if (!gigId || !clientEmail) {
    redirect("/dashboard?orderError=Pick%20a%20gig%20and%20enter%20a%20buyer%20email");
  }

  const supabase = await createClient();

  // The buyer must be a registered Hustl account. Resolve their email to a
  // user id (null if no such account).
  const { data: clientId, error: lookupError } = await supabase.rpc(
    "lookup_user_by_email",
    { p_email: clientEmail },
  );
  if (lookupError) {
    redirect(`/dashboard?orderError=${encodeURIComponent(lookupError.message)}`);
  }
  if (!clientId) {
    redirect(
      "/dashboard?orderError=No%20Hustl%20account%20is%20registered%20with%20that%20email",
    );
  }
  if (clientId === user.id) {
    redirect("/dashboard?orderError=You%20can%27t%20create%20an%20order%20for%20yourself");
  }

  const { error } = await supabase.from("orders").insert({
    gig_id: gigId,
    client_id: clientId,
    client_email: clientEmail,
    status: "Pending",
  });

  if (error) {
    redirect(`/dashboard?orderError=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?orderCreated=1");
}
