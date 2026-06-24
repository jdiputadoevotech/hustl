import { Badge } from "@/components/ui/badge";
import type { ContractStatus } from "@/lib/types/database";

const VARIANT: Record<
  ContractStatus,
  "default" | "secondary" | "destructive" | "success" | "outline"
> = {
  Offered: "secondary",
  Accepted: "default",
  Declined: "destructive",
  Completed: "success",
  Resigned: "destructive",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <Badge variant={VARIANT[status]}>{status}</Badge>;
}
