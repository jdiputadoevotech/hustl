import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/marketplace/form-error";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { AdminSearch } from "@/components/admin/admin-search";
import { monthYear } from "@/lib/time";
import { setVerification } from "@/app/admin/actions";
import type { Profile } from "@/lib/types/database";

type ReqRow = Pick<
  Profile,
  "id" | "full_name" | "role" | "messenger_username" | "updated_at"
>;

type SearchParams = Promise<{ q?: string; error?: string }>;

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", error } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, role, messenger_username, updated_at")
    .eq("verification_status", "pending")
    .order("updated_at", { ascending: true }); // oldest request first
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as ReqRow[];

  const admin = createAdminClient();
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(authList.users.map((u) => [u.id, u.email ?? ""]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Verification requests</h1>
        <AdminSearch placeholder="Search by name…" />
      </div>

      {error && <FormError>{error}</FormError>}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pending verification requests.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((u) => {
            const email = emailById.get(u.id) ?? "";
            return (
              <li
                key={u.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/profile/${u.id}`}
                    className="font-medium hover:underline"
                  >
                    {u.full_name ?? "Carolinian"}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">
                    {email || "—"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {u.role}
                    </Badge>
                    <span>Requested {monthYear(u.updated_at)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {u.messenger_username && (
                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                      <a
                        href={`https://m.me/${u.messenger_username}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Contact
                      </a>
                    </Button>
                  )}
                  <form action={setVerification.bind(null, u.id, "verified")}>
                    <SubmitButton size="sm">Approve</SubmitButton>
                  </form>
                  <ConfirmSubmit
                    action={setVerification.bind(null, u.id, "rejected")}
                    label="Reject"
                    variant="outline"
                    size="sm"
                    confirmTitle="Reject this request?"
                    confirmBody="The user will see their request was declined and can request again."
                    confirmLabel="Reject"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
