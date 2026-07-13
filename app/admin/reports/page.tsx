import Link from "next/link";
import { Flag } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/components/marketplace/form-error";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { timeAgo } from "@/lib/time";
import { resolveReport, dismissReport, reopenReport } from "@/app/admin/actions";
import type {
  Report,
  ReportReason,
  ReportStatus,
} from "@/lib/types/database";

type ReportRow = Pick<
  Report,
  | "id"
  | "reporter_id"
  | "target_type"
  | "target_id"
  | "reason"
  | "details"
  | "status"
  | "created_at"
>;

type SearchParams = Promise<{ tab?: string; error?: string }>;

const REASON_LABEL: Record<ReportReason, string> = {
  spam: "Spam",
  harassment: "Harassment",
  scam: "Scam or fraud",
  inappropriate: "Inappropriate content",
  other: "Other",
};

const STATUSES: ReportStatus[] = ["open", "resolved", "dismissed"];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab = "open", error } = await searchParams;
  const status = (STATUSES.includes(tab as ReportStatus) ? tab : "open") as ReportStatus;

  // Service-role client: reports have no user-facing SELECT policy.
  const admin = createAdminClient();
  const { data } = await admin
    .from("reports")
    .select(
      "id, reporter_id, target_type, target_id, reason, details, status, created_at",
    )
    .order("created_at", { ascending: false });
  const all = (data ?? []) as ReportRow[];

  const counts = {
    open: all.filter((r) => r.status === "open").length,
    resolved: all.filter((r) => r.status === "resolved").length,
    dismissed: all.filter((r) => r.status === "dismissed").length,
  };
  const rows = all.filter((r) => r.status === status);

  // Batch-hydrate labels: reporter names + profile targets in one profiles read,
  // job targets in one jobs read.
  const profileIds = new Set<string>();
  const jobIds = new Set<string>();
  for (const r of rows) {
    profileIds.add(r.reporter_id);
    if (r.target_type === "profile") profileIds.add(r.target_id);
    else jobIds.add(r.target_id);
  }
  const [{ data: profs }, { data: jobs }] = await Promise.all([
    profileIds.size
      ? admin.from("profiles").select("id, full_name").in("id", [...profileIds])
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    jobIds.size
      ? admin.from("jobs").select("id, title").in("id", [...jobIds])
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);
  const nameById = new Map((profs ?? []).map((p) => [p.id, p.full_name ?? "Carolinian"]));
  const jobTitleById = new Map((jobs ?? []).map((j) => [j.id, j.title]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Flag className="h-6 w-6" />
          Reports
        </h1>
      </div>

      {error && <FormError>{error}</FormError>}

      <AdminTabs
        current={status}
        tabs={[
          { key: "open", label: "Open", count: counts.open },
          { key: "resolved", label: "Resolved", count: counts.resolved },
          { key: "dismissed", label: "Dismissed", count: counts.dismissed },
        ]}
      />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reports here.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((r) => {
            const targetHref =
              r.target_type === "profile"
                ? `/profile/${r.target_id}`
                : `/jobs/${r.target_id}`;
            const targetLabel =
              r.target_type === "profile"
                ? (nameById.get(r.target_id) ?? "a user")
                : (jobTitleById.get(r.target_id) ?? "a job");
            return (
              <li
                key={r.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {r.target_type}
                    </Badge>
                    <Badge variant="secondary">{REASON_LABEL[r.reason]}</Badge>
                    <Link href={targetHref} className="font-medium hover:underline">
                      {targetLabel}
                    </Link>
                  </div>
                  {r.details && (
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">
                      {r.details}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Reported by{" "}
                    <Link
                      href={`/profile/${r.reporter_id}`}
                      className="hover:underline"
                    >
                      {nameById.get(r.reporter_id) ?? "a user"}
                    </Link>{" "}
                    · {timeAgo(r.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {r.status === "open" ? (
                    <>
                      <form action={resolveReport.bind(null, r.id)}>
                        <SubmitButton variant="outline" size="sm">
                          Resolve
                        </SubmitButton>
                      </form>
                      <form action={dismissReport.bind(null, r.id)}>
                        <SubmitButton variant="outline" size="sm">
                          Dismiss
                        </SubmitButton>
                      </form>
                    </>
                  ) : (
                    <form action={reopenReport.bind(null, r.id)}>
                      <SubmitButton variant="outline" size="sm">
                        Reopen
                      </SubmitButton>
                    </form>
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
