import Link from "next/link";
import {
  Users,
  GraduationCap,
  Briefcase,
  BadgeCheck,
  Shield,
  Clock,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { monthYear } from "@/lib/time";
import { setVerification } from "@/app/admin/actions";
import type { Profile } from "@/lib/types/database";

export const metadata = { title: "Overview — Admin — Hustl" };

type ProfileRow = Pick<
  Profile,
  | "id"
  | "full_name"
  | "role"
  | "verification_status"
  | "archived"
  | "messenger_username"
  | "created_at"
>;

// How many rows the recent-signups and pending-verification widgets show.
const RECENT_LIMIT = 5;

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  // profiles SELECT is public; one read powers every user-side stat + list.
  const { data: profileData } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, verification_status, archived, messenger_username, created_at",
    )
    .order("created_at", { ascending: false });
  const profiles = (profileData ?? []) as ProfileRow[];

  // jobs/contracts counts go through the service-role client (RLS would hide
  // other users' rows from the normal client). head:true = count only, no rows.
  const [
    { count: jobsTotal },
    { count: jobsActive },
    { count: contractsTotal },
    { count: contractsCompleted },
    { count: contractsActive },
    { data: authList },
  ] = await Promise.all([
    admin.from("jobs").select("*", { count: "exact", head: true }),
    admin
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("is_disabled", false),
    admin.from("contracts").select("*", { count: "exact", head: true }),
    admin
      .from("contracts")
      .select("*", { count: "exact", head: true })
      .eq("status", "Completed"),
    admin
      .from("contracts")
      .select("*", { count: "exact", head: true })
      .in("status", ["Offered", "Accepted"]),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const emailById = new Map(
    (authList?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  const userStats = {
    total: profiles.length,
    students: profiles.filter((u) => u.role === "student").length,
    employers: profiles.filter((u) => u.role === "employer").length,
    admins: profiles.filter((u) => u.role === "admin").length,
    verified: profiles.filter((u) => u.verification_status === "verified").length,
  };

  const pending = profiles
    .filter((u) => u.verification_status === "pending")
    .sort((a, b) => a.created_at.localeCompare(b.created_at)); // oldest first
  const recent = profiles.slice(0, RECENT_LIMIT); // already newest-first

  const cards = [
    { label: "Total users", value: userStats.total, icon: Users },
    { label: "Students", value: userStats.students, icon: GraduationCap },
    { label: "Employers", value: userStats.employers, icon: Briefcase },
    { label: "Verified", value: userStats.verified, icon: BadgeCheck },
    { label: "Admins", value: userStats.admins, icon: Shield },
    { label: "Pending verification", value: pending.length, icon: Clock },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Overview</h1>

      {/* User stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border p-4">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Job & contract stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total jobs", value: jobsTotal ?? 0 },
          { label: "Active jobs", value: jobsActive ?? 0 },
          { label: "Hidden jobs", value: (jobsTotal ?? 0) - (jobsActive ?? 0) },
          { label: "Contracts", value: contractsTotal ?? 0 },
          { label: "Live contracts", value: contractsActive ?? 0 },
          { label: "Completed hires", value: contractsCompleted ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border bg-muted/30 p-4">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending verification — inline approve/reject */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pending verification</h2>
          <Link href="/admin/verification" className="text-sm underline">
            View all
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {pending.slice(0, RECENT_LIMIT).map((u) => (
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
                  <p className="truncate text-sm text-muted-foreground">
                    {emailById.get(u.id) || "—"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {u.role}
                    </Badge>
                    <span>Requested {monthYear(u.created_at)}</span>
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
            ))}
          </ul>
        )}
      </section>

      {/* Recent signups */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent signups</h2>
          <Link href="/admin/users" className="text-sm underline">
            All users
          </Link>
        </div>
        <ul className="divide-y rounded-lg border">
          {recent.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-3 p-4"
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
                <p className="truncate text-sm text-muted-foreground">
                  {emailById.get(u.id) || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                <Badge variant="outline" className="capitalize">
                  {u.role}
                </Badge>
                <span>{monthYear(u.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
