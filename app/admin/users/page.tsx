import Link from "next/link";
import { MessageCircle, BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/marketplace/form-error";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminSearch } from "@/components/admin/admin-search";
import { RoleFilter } from "@/components/admin/role-filter";
import { VerificationFilter } from "@/components/admin/verification-filter";
import { monthYear } from "@/lib/time";
import {
  setUserRole,
  setUserArchived,
  deleteUser,
  addAdminByEmail,
} from "@/app/admin/actions";
import type { Profile, Role, VerificationStatus } from "@/lib/types/database";

type UserRow = Pick<
  Profile,
  | "id"
  | "full_name"
  | "role"
  | "archived"
  | "verification_status"
  | "messenger_username"
  | "created_at"
>;

type SearchParams = Promise<{
  tab?: string;
  q?: string;
  role?: string;
  verification?: string;
  error?: string;
}>;

const V_LABEL: Record<VerificationStatus, string> = {
  none: "—",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab = "active", q = "", role, verification, error } =
    await searchParams;
  const supabase = await createClient();

  // profiles SELECT is public, so the normal client reads every row.
  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, role, archived, verification_status, messenger_username, created_at",
    )
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data } = await query;
  const all = (data ?? []) as UserRow[];

  // Enrich with email from auth.users (not on profiles) via the admin client.
  // ponytail: single page of 1000; add pagination if the user count outgrows it.
  const admin = createAdminClient();
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(authList.users.map((u) => [u.id, u.email ?? ""]));

  const counts = {
    active: all.filter((u) => !u.archived && u.role !== "admin").length,
    archived: all.filter((u) => u.archived).length,
    admins: all.filter((u) => u.role === "admin").length,
  };
  const inTab = (u: UserRow) =>
    tab === "archived"
      ? u.archived
      : tab === "admins"
        ? u.role === "admin"
        : !u.archived && u.role !== "admin";
  // Role + verification filters apply to the Users/Archived tabs.
  const rows = all.filter(
    (u) =>
      inTab(u) &&
      (tab === "admins" || !role || u.role === role) &&
      (!verification || u.verification_status === verification),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Users</h1>
        <AdminSearch placeholder="Search by name…" />
      </div>

      {error && <FormError>{error}</FormError>}

      <AdminTabs
        current={tab}
        tabs={[
          { key: "active", label: "Users", count: counts.active },
          { key: "archived", label: "Archived", count: counts.archived },
          { key: "admins", label: "Admins", count: counts.admins },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {tab !== "admins" && <RoleFilter selected={role} />}
        <VerificationFilter selected={verification} />
      </div>

      {tab === "admins" && (
        <form
          action={addAdminByEmail}
          className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/40 p-4"
        >
          <div className="space-y-1">
            <label htmlFor="admin-email" className="text-sm font-medium">
              Add admin by email
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              required
              placeholder="user@example.com"
              className="h-9 w-64 rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <SubmitButton>Grant admin</SubmitButton>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users here.</p>
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
                    className="flex items-center gap-1.5 font-medium hover:underline"
                  >
                    {u.full_name ?? "Carolinian"}
                    {u.verification_status === "verified" && (
                      <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">
                    {email || "—"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {u.role}
                    </Badge>
                    <span>Verification: {V_LABEL[u.verification_status]}</span>
                    <span>Joined {monthYear(u.created_at)}</span>
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

                  {u.role === "admin" ? (
                    <form action={setUserRole.bind(null, u.id, "student" as Role)}>
                      <SubmitButton variant="outline" size="sm">
                        Revoke admin
                      </SubmitButton>
                    </form>
                  ) : (
                    <form action={setUserRole.bind(null, u.id, "admin" as Role)}>
                      <SubmitButton variant="outline" size="sm">
                        Make admin
                      </SubmitButton>
                    </form>
                  )}

                  {u.archived ? (
                    <form action={setUserArchived.bind(null, u.id, false)}>
                      <SubmitButton variant="outline" size="sm">
                        Restore
                      </SubmitButton>
                    </form>
                  ) : (
                    <ConfirmSubmit
                      action={setUserArchived.bind(null, u.id, true)}
                      label="Archive"
                      variant="outline"
                      size="sm"
                      confirmTitle="Archive this user?"
                      confirmBody="They will be signed out immediately and blocked from logging in until restored."
                      confirmLabel="Archive"
                    />
                  )}

                  <ConfirmSubmit
                    action={deleteUser.bind(null, u.id)}
                    label="Delete"
                    variant="destructive"
                    size="sm"
                    confirmTitle="Permanently delete this user?"
                    confirmBody="This removes their account, jobs, and contracts. Reviews they wrote are kept (shown as 'Deleted user'). This can't be undone."
                    confirmLabel="Delete permanently"
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
