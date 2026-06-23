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
