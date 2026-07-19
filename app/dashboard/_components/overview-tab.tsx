import Link from "next/link";
import { CheckCircle2, EyeOff, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ContractRow } from "./contract-row";
import { CONTRACT_SELECT, type ContractRowData } from "../_lib";

const ATTENTION_LIMIT = 5;

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * The landing tab: what needs a response right now, not another copy of the
 * lists. Everything here is actionable — offers awaiting a decision, contracts
 * awaiting completion, drafts that never went live.
 */
export async function OverviewTab({
  userId,
  isEmployer,
  returnTo,
}: {
  userId: string;
  isEmployer: boolean;
  returnTo: string;
}) {
  const supabase = await createClient();
  const ownerColumn = isEmployer ? "employer_id" : "student_id";

  // Contracts sitting in a state only this user can move on.
  const actionableStatus = isEmployer ? "Accepted" : "Offered";
  const { data: actionableRaw } = await supabase
    .from("contracts")
    .select(CONTRACT_SELECT)
    .eq(ownerColumn, userId)
    .eq("status", actionableStatus)
    .order("created_at", { ascending: false })
    .limit(ATTENTION_LIMIT);
  const actionable = (actionableRaw ?? []) as unknown as ContractRowData[];

  // Employers: posts that never went live (a job needs 2 FAQs to publish).
  // Students: completed work that still has no review.
  let hiddenJobs: { id: string; title: string }[] = [];
  let unreviewed: ContractRowData[] = [];

  if (isEmployer) {
    const { data } = await supabase
      .from("jobs")
      .select("id, title")
      .eq("employer_id", userId)
      .eq("is_disabled", true)
      .order("created_at", { ascending: false })
      .limit(ATTENTION_LIMIT);
    hiddenJobs = data ?? [];
  } else {
    const [{ data: completed }, { data: reviewed }] = await Promise.all([
      supabase
        .from("contracts")
        .select(CONTRACT_SELECT)
        .eq("student_id", userId)
        .eq("status", "Completed")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("reviews").select("contract_id").eq("reviewer_id", userId),
    ]);
    const done = new Set((reviewed ?? []).map((r) => r.contract_id));
    unreviewed = ((completed ?? []) as unknown as ContractRowData[])
      .filter((c) => !done.has(c.id))
      .slice(0, ATTENTION_LIMIT);
  }

  const nothingPending =
    actionable.length === 0 && hiddenJobs.length === 0 && unreviewed.length === 0;

  return (
    <Card>
      <CardContent className="space-y-8 pt-6">
        {nothingPending ? (
          <EmptyState
            icon={Sparkles}
            title="You're all caught up"
            body={
              isEmployer
                ? "Nothing needs your attention. New offers and hires will show up here."
                : "Nothing needs your attention. Offers you receive will show up here."
            }
            action={
              isEmployer
                ? { href: "/dashboard?tab=jobs", label: "View my job posts" }
                : { href: "/jobs", label: "Browse jobs" }
            }
          />
        ) : (
          <>
            {actionable.length > 0 && (
              <Section
                title={
                  isEmployer
                    ? "Active hires — mark them completed when the work is done"
                    : "Offers waiting on you"
                }
                hint={
                  isEmployer
                    ? "Completing a contract lets the student review you."
                    : "Accept to start the work, or decline so the employer can move on."
                }
              >
                <ul className="divide-y rounded-lg border">
                  {actionable.map((c) => (
                    <ContractRow
                      key={c.id}
                      contract={c}
                      perspective={isEmployer ? "employer" : "student"}
                      returnTo={returnTo}
                    />
                  ))}
                </ul>
              </Section>
            )}

            {unreviewed.length > 0 && (
              <Section
                title="Completed work you haven't reviewed"
                hint="Your rating is how other students judge an employer."
              >
                <ul className="divide-y rounded-lg border">
                  {unreviewed.map((c) => (
                    <ContractRow
                      key={c.id}
                      contract={c}
                      perspective="student"
                      returnTo={returnTo}
                    />
                  ))}
                </ul>
              </Section>
            )}

            {hiddenJobs.length > 0 && (
              <Section
                title="Posts that aren't live"
                hint="A job needs at least 2 FAQs before students can see it."
              >
                <ul className="divide-y rounded-lg border">
                  {hiddenJobs.map((j) => (
                    <li
                      key={j.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <EyeOff
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="truncate font-medium">{j.title}</span>
                      </span>
                      <Link
                        href={`/jobs/${j.id}/edit`}
                        className="shrink-0 text-sm font-medium underline"
                      >
                        Finish it
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}

        <p className="flex items-center gap-2 border-t pt-6 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          {isEmployer ? (
            <>
              Full history lives in{" "}
              <Link href="/dashboard?tab=offers" className="underline">
                Offers sent
              </Link>
              .
            </>
          ) : (
            <>
              Full history lives in{" "}
              <Link href="/dashboard?tab=work" className="underline">
                My work
              </Link>
              .
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
