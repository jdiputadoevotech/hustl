import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/marketplace/order-status-badge";
import { updateOrderStatus } from "./actions";
import type { OrderStatus } from "@/lib/types/database";

export const metadata = { title: "Dashboard — Hustl" };

type SearchParams = Promise<{ inquiry?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { inquiry } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  // Orders I placed as a client.
  const { data: myOrders } = await supabase
    .from("orders")
    .select("id, status, created_at, gigs ( id, title )")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  // Orders placed on my gigs (seller view).
  const { data: salesOrders } = user.isSeller
    ? await supabase
        .from("orders")
        .select(
          "id, status, created_at, gigs!inner ( id, title, student_id ), profiles ( full_name, messenger_username )",
        )
        .eq("gigs.student_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="py-8 space-y-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/profile/edit">Edit profile</Link>
        </Button>
      </div>

      {inquiry === "created" && (
        <p className="text-sm border rounded-md p-3 bg-accent">
          Your inquiry was recorded. The seller has no Messenger handle on file
          yet — check back here for status updates.
        </p>
      )}

      {/* ---- Orders I placed ---- */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">My orders</h2>
        {!myOrders || myOrders.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You haven&apos;t placed any orders.{" "}
            <Link href="/gigs" className="underline">
              Browse gigs
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y border rounded-lg">
            {myOrders.map((o) => {
              const gig = o.gigs as unknown as {
                id: string;
                title: string;
              } | null;
              return (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <Link
                    href={gig ? `/gigs/${gig.id}` : "#"}
                    className="font-medium hover:underline"
                  >
                    {gig?.title ?? "Removed gig"}
                  </Link>
                  <OrderStatusBadge status={o.status as OrderStatus} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---- Sales (seller) ---- */}
      {user.isSeller && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Orders on my gigs</h2>
          {!salesOrders || salesOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No orders yet.</p>
          ) : (
            <ul className="divide-y border rounded-lg">
              {salesOrders.map((o) => {
                const gig = o.gigs as unknown as {
                  id: string;
                  title: string;
                } | null;
                const buyer = o.profiles as unknown as {
                  full_name: string | null;
                  messenger_username: string | null;
                } | null;
                const status = o.status as OrderStatus;
                return (
                  <li key={o.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Link
                          href={gig ? `/gigs/${gig.id}` : "#"}
                          className="font-medium hover:underline"
                        >
                          {gig?.title ?? "Removed gig"}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          from {buyer?.full_name ?? "a client"}
                          {buyer?.messenger_username && (
                            <>
                              {" · "}
                              <a
                                className="underline"
                                href={`https://m.me/${buyer.messenger_username}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Messenger
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                      <OrderStatusBadge status={status} />
                    </div>
                    <StatusControls orderId={o.id} status={status} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** Seller-only buttons to advance an order through its lifecycle. */
function StatusControls({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const next: { label: string; to: OrderStatus; variant?: "destructive" }[] = [];
  if (status === "Pending") {
    next.push({ label: "Mark in progress", to: "In Progress" });
    next.push({ label: "Cancel", to: "Cancelled", variant: "destructive" });
  } else if (status === "In Progress") {
    next.push({ label: "Mark completed", to: "Completed" });
    next.push({ label: "Cancel", to: "Cancelled", variant: "destructive" });
  }
  if (next.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {next.map((n) => (
        <form key={n.to} action={updateOrderStatus.bind(null, orderId, n.to)}>
          <Button type="submit" size="sm" variant={n.variant ?? "outline"}>
            {n.label}
          </Button>
        </form>
      ))}
    </div>
  );
}
