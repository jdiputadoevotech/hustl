import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/components/marketplace/form-error";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { TabsNav } from "@/components/shared/tabs-nav";
import { timeAgo } from "@/lib/time";
import { resolveAppeal } from "@/app/admin/actions";
import type { FlagAppeal, AppealStatus } from "@/lib/types/database";

type AppealRow = Pick<
  FlagAppeal,
  "id" | "user_id" | "message" | "status" | "created_at"
>;

type SearchParams = Promise<{ tab?: string; error?: string }>;

// Tab keys map to appeal statuses; "open" is the review queue.
const STATUSES: AppealStatus[] = ["open", "approved", "denied"];

export default async function AdminAppealsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab = "open", error } = await searchParams;
  const status = (STATUSES.includes(tab as AppealStatus) ? tab : "open") as AppealStatus;

  // Service-role client: flag_appeals has no admin-facing SELECT policy.
  const admin = createAdminClient();
  const { data } = await admin
    .from("flag_appeals")
    .select("id, user_id, message, status, created_at")
    .order("created_at", { ascending: false });
  const all = (data ?? []) as AppealRow[];

  const counts = {
    open: all.filter((a) => a.status === "open").length,
    approved: all.filter((a) => a.status === "approved").length,
    denied: all.filter((a) => a.status === "denied").length,
  };
  const rows = all.filter((a) => a.status === status);

  // Batch-hydrate appellant names + their current flag reason in one read.
  const userIds = [...new Set(rows.map((a) => a.user_id))];
  const { data: profs } = userIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, flag_reason, flagged_at")
        .in("id", userIds)
    : { data: [] as { id: string; full_name: string | null; flag_reason: string | null; flagged_at: string | null }[] };
  const profById = new Map((profs ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldAlert className="h-6 w-6" />
          Appeals
        </h1>
      </div>

      {error && <FormError>{error}</FormError>}

      <TabsNav
        current={status}
        tabs={[
          { key: "open", label: "Open", count: counts.open },
          { key: "approved", label: "Approved", count: counts.approved },
          { key: "denied", label: "Denied", count: counts.denied },
        ]}
      />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No appeals here.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((a) => {
            const prof = profById.get(a.user_id);
            const stillFlagged = Boolean(prof?.flagged_at);
            return (
              <li
                key={a.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/profile/${a.user_id}`}
                      className="font-medium hover:underline"
                    >
                      {prof?.full_name ?? "Carolinian"}
                    </Link>
                    {stillFlagged && (
                      <Badge className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Flagged
                      </Badge>
                    )}
                  </div>
                  {prof?.flag_reason && (
                    <p className="text-xs text-muted-foreground">
                      Flag reason: {prof.flag_reason}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">
                    {a.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {timeAgo(a.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {a.status === "open" ? (
                    <>
                      <ConfirmSubmit
                        action={resolveAppeal.bind(null, a.id, "approved")}
                        label="Approve"
                        variant="outline"
                        size="sm"
                        confirmTitle="Approve this appeal?"
                        confirmBody="This lifts the user's restriction — they'll be able to post, review, and contract again."
                        confirmLabel="Approve & unflag"
                      />
                      <ConfirmSubmit
                        action={resolveAppeal.bind(null, a.id, "denied")}
                        label="Deny"
                        variant="outline"
                        size="sm"
                        confirmTitle="Deny this appeal?"
                        confirmBody="The restriction stays in place. The user can't file another appeal while this one is closed unless they're re-flagged."
                        confirmLabel="Deny appeal"
                      />
                    </>
                  ) : (
                    <Badge variant="secondary" className="capitalize">
                      {a.status}
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
