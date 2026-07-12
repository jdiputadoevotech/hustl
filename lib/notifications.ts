import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Notification } from "@/lib/types/database";

/**
 * Fetch the current user's latest notifications for the navbar bell. RLS scopes
 * rows to the signed-in user, so an unauthenticated call returns an empty feed.
 */
export async function getNotifications(): Promise<{
  items: Notification[];
  unreadCount: number;
}> {
  const user = await getCurrentUser();
  if (!user) return { items: [], unreadCount: 0 };

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const items = (data ?? []) as Notification[];
  return { items, unreadCount: items.filter((n) => !n.read).length };
}
