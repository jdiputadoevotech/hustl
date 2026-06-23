import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/types/database";

const VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Pending: "secondary",
  "In Progress": "default",
  Completed: "outline",
  Cancelled: "destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANT[status]}>{status}</Badge>;
}
