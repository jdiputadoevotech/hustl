import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { TabsNav, type TabItem } from "@/components/shared/tabs-nav";
import { DashboardHero } from "./_components/dashboard-hero";
import { OverviewTab } from "./_components/overview-tab";
import { ContractsTab } from "./_components/contracts-tab";
import { EmployerJobsTab } from "./_components/employer-jobs-tab";
import { ReviewsTab } from "./_components/reviews-tab";
import { resolveTab } from "./_lib";

export const metadata = { title: "Dashboard — Hustl" };

type SearchParams = Promise<{
  tab?: string;
  q?: string;
  status?: string;
  type?: string;
  category?: string;
  sort?: string;
  page?: string;
  job?: string;
  rsort?: string;
  contractOk?: string;
  contractError?: string;
}>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { contractOk, contractError } = params;

  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("role, full_name, verification_status")
    .eq("id", user.id)
    .single();
  if (me?.role === "admin") redirect("/admin/overview");

  const isEmployer = me?.role === "employer";
  const tab = resolveTab(params.tab, isEmployer);

  // Tab badges. Head-only counts under normal RLS — the same cheap pattern the
  // hero tiles use, so the strip can show volume without loading any rows.
  const countMine = (table: "jobs" | "contracts" | "reviews", col: string) =>
    supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(col, user.id);

  const [{ count: primaryCount }, { count: reviewCount }] = await Promise.all([
    isEmployer
      ? countMine("jobs", "employer_id")
      : countMine("contracts", "student_id"),
    isEmployer
      ? countMine("reviews", "employer_id")
      : countMine("reviews", "reviewer_id"),
  ]);

  const { count: offersCount } = isEmployer
    ? await countMine("contracts", "employer_id")
    : { count: null };

  const tabs: TabItem[] = isEmployer
    ? [
        { key: "overview", label: "Overview" },
        { key: "jobs", label: "My jobs", count: primaryCount ?? 0 },
        { key: "offers", label: "Offers sent", count: offersCount ?? 0 },
        { key: "reviews", label: "Reviews", count: reviewCount ?? 0 },
      ]
    : [
        { key: "overview", label: "Overview" },
        { key: "work", label: "My work", count: primaryCount ?? 0 },
        { key: "reviews", label: "Reviews written", count: reviewCount ?? 0 },
      ];

  // The URL the tab is currently on, so server actions can redirect back to it
  // instead of dropping the user on Overview.
  const returnParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "contractOk" && key !== "contractError")
      returnParams.set(key, value);
  }
  returnParams.set("tab", tab);
  const returnTo = `/dashboard?${returnParams.toString()}`;

  const fullName = me?.full_name?.trim() || "Carolinian";
  const verified = me?.verification_status === "verified";

  return (
    <div className="space-y-6 py-8">
      <DashboardHero
        userId={user.id}
        isEmployer={isEmployer}
        fullName={fullName}
        verified={verified}
      />

      {contractOk && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {contractOk}
        </p>
      )}
      {contractError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
        >
          {contractError}
        </p>
      )}

      <TabsNav tabs={tabs} current={tab} />

      {tab === "overview" && (
        <OverviewTab
          userId={user.id}
          isEmployer={isEmployer}
          returnTo={returnTo}
        />
      )}

      {tab === "jobs" && (
        <EmployerJobsTab userId={user.id} params={params} />
      )}

      {(tab === "offers" || tab === "work") && (
        <ContractsTab
          userId={user.id}
          perspective={isEmployer ? "employer" : "student"}
          params={params}
          returnTo={returnTo}
        />
      )}

      {tab === "reviews" && (
        <ReviewsTab
          userId={user.id}
          isEmployer={isEmployer}
          returnTo={returnTo}
          params={params}
        />
      )}
    </div>
  );
}
