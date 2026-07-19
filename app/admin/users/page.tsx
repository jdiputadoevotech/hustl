import Link from "next/link";
import { MessageCircle, BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/marketplace/form-error";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { TabsNav } from "@/components/shared/tabs-nav";
import { SearchInput } from "@/components/shared/search-input";
import { RoleFilter } from "@/components/admin/role-filter";
import { VerificationFilter } from "@/components/admin/verification-filter";
import { Pagination } from "@/components/shared/pagination";
import { PAGE_SIZE, pageRange } from "@/lib/paging";
import { monthYear } from "@/lib/time";
import {
  setUserRole,
  setUserArchived,
  setUserFlagged,
  setUserUnflagged,
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
  | "flagged_at"
  | "flag_reason"
  | "verification_status"
  | "messenger_username"
  | "created_at"
>;

const USER_SELECT =
  "id, full_name, role, archived, flagged_at, flag_reason, verification_status, messenger_username, created_at";

const TABS = ["active", "flagged", "archived", "admins"] as const;
type Tab = (typeof TABS)[number];

type SearchParams = Promise<{
  tab?: string;
  q?: string;
  role?: string;
  verification?: string;
  error?: string;
  page?: string;
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
  const {
    tab = "active",
    q = "",
    role,
    verification,
    error,
    page: pageParam,
  } = await searchParams;
  const current: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : "active";
  const { page, from, to, size } = pageRange(pageParam, PAGE_SIZE);
  const supabase = await createClient();

  // Tab membership in SQL rather than filtering a full-table read in JS.
  // `role` and `archived` are NOT NULL in the schema, so .neq/.eq are safe.
  // Written as inline chains rather than a generic helper — a generic over the
  // query builder makes TS give up with "type instantiation excessively deep".
  //
  // Counts stay scoped to the search (matching this page's previous behaviour)
  // but ignore the role/verification filters, which only narrow the list.
  const countFor = (forTab: Tab) => {
    const b = supabase.from("profiles").select("*", { count: "exact", head: true });
    const scoped =
      forTab === "archived"
        ? b.eq("archived", true)
        : forTab === "admins"
          ? b.eq("role", "admin")
          : forTab === "flagged"
            ? b.not("flagged_at", "is", null).neq("role", "admin")
            : b.eq("archived", false).neq("role", "admin");
    return q ? scoped.ilike("full_name", `%${q}%`) : scoped;
  };

  const listBase = supabase
    .from("profiles")
    .select(USER_SELECT, { count: "exact" });
  let listQuery = (
    current === "archived"
      ? listBase.eq("archived", true)
      : current === "admins"
        ? listBase.eq("role", "admin")
        : current === "flagged"
          ? listBase.not("flagged_at", "is", null).neq("role", "admin")
          : listBase.eq("archived", false).neq("role", "admin")
  )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false }); // stable tiebreak for paging
  if (q) listQuery = listQuery.ilike("full_name", `%${q}%`);
  // Role + verification filters apply to the Users/Archived tabs.
  if (current !== "admins" && role) listQuery = listQuery.eq("role", role);
  if (verification) listQuery = listQuery.eq("verification_status", verification);

  const [
    { count: activeCount },
    { count: flaggedCount },
    { count: archivedCount },
    { count: adminsCount },
    { data, count: total },
  ] = await Promise.all([
    countFor("active"),
    countFor("flagged"),
    countFor("archived"),
    countFor("admins"),
    listQuery.range(from, to),
  ]);

  const counts = {
    active: activeCount ?? 0,
    flagged: flaggedCount ?? 0,
    archived: archivedCount ?? 0,
    admins: adminsCount ?? 0,
  };
  const rows = (data ?? []) as UserRow[];

  // Enrich with email from auth.users (not on profiles) via the admin client.
  // ponytail: single page of 1000; the auth API can't filter by an id list, so
  // this stays a bulk read even though the list itself is now paged. Switch to
  // per-id getUserById lookups if the user count outgrows one page.
  const admin = createAdminClient();
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(authList.users.map((u) => [u.id, u.email ?? ""]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Users</h1>
        <SearchInput placeholder="Search by name…" />
      </div>

      {error && <FormError>{error}</FormError>}

      <TabsNav
        current={current}
        tabs={[
          { key: "active", label: "Users", count: counts.active },
          { key: "flagged", label: "Flagged", count: counts.flagged },
          { key: "archived", label: "Archived", count: counts.archived },
          { key: "admins", label: "Admins", count: counts.admins },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {current !== "admins" && <RoleFilter selected={role} />}
        <VerificationFilter selected={verification} />
      </div>

      {current === "admins" && (
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
        // `page > 1` rather than a count check: past the last page PostgREST
        // returns no usable total, so count reads as 0.
        <p className="text-sm text-muted-foreground">
          {page > 1 ? "That page is empty." : "No users here."}
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
                    {u.flagged_at && (
                      <Badge className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Flagged
                      </Badge>
                    )}
                    <span>Verification: {V_LABEL[u.verification_status]}</span>
                    <span>Joined {monthYear(u.created_at)}</span>
                  </div>
                  {u.flagged_at && u.flag_reason && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reason: {u.flag_reason}
                    </p>
                  )}
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

                  {u.role !== "admin" &&
                    (u.flagged_at ? (
                      <form action={setUserUnflagged.bind(null, u.id)}>
                        <SubmitButton variant="outline" size="sm">
                          Unflag
                        </SubmitButton>
                      </form>
                    ) : (
                      <ConfirmSubmit
                        action={setUserFlagged.bind(null, u.id)}
                        label="Flag"
                        variant="outline"
                        size="sm"
                        confirmTitle="Flag this user?"
                        confirmBody="They stay logged in and can browse, but can't post jobs, leave reviews, offer/accept contracts, file reports, or save jobs until unflagged. They can appeal."
                        confirmLabel="Flag user"
                      >
                        <label
                          htmlFor={`flag-reason-${u.id}`}
                          className="text-sm font-medium"
                        >
                          Reason (optional, shown to the user)
                        </label>
                        <textarea
                          id={`flag-reason-${u.id}`}
                          name="reason"
                          rows={3}
                          placeholder="e.g. Repeated inappropriate job postings."
                          className="mb-4 mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </ConfirmSubmit>
                    ))}

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

      <Pagination page={page} pageSize={size} total={total ?? 0} />
    </div>
  );
}
