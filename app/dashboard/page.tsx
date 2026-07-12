import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { ContractStatusBadge } from "@/components/marketplace/contract-status-badge";
import { ReviewForm } from "@/components/marketplace/review-form";
import {
  offerContract,
  acceptOffer,
  declineOffer,
  completeContract,
  resignContract,
} from "@/app/contracts/actions";
import type { ContractStatus } from "@/lib/types/database";

export const metadata = { title: "Dashboard — Hustl" };

type SearchParams = Promise<{ contractOk?: string; contractError?: string }>;

type Named = { id: string; full_name: string | null } | null;
type JobRef = { id: string; title: string } | null;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { contractOk, contractError } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role === "admin") redirect("/admin/overview");
  const isEmployer = me?.role === "employer";

  // Employers hire; students get hired. Fetch only what this role's view uses.
  const { data: myJobs } = isEmployer
    ? await supabase
        .from("jobs")
        .select("id, title, job_type")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false })
    : { data: null };

  // Contracts I sent as an employer.
  const { data: sentContracts } = isEmployer
    ? await supabase
        .from("contracts")
        .select(
          "id, status, created_at, job:jobs ( id, title ), student:profiles!contracts_student_id_fkey ( id, full_name )",
        )
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false })
    : { data: null };

  // Contracts where I'm the student (incoming offers + my work).
  const { data: myContracts } = isEmployer
    ? { data: null }
    : await supabase
        .from("contracts")
        .select(
          "id, status, created_at, job:jobs ( id, title ), employer:profiles!contracts_employer_id_fkey ( id, full_name )",
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

  // My existing reviews (to prefill the review form on completed contracts).
  const { data: myReviews } = isEmployer
    ? { data: null }
    : await supabase
        .from("reviews")
        .select("contract_id, rating, comment")
        .eq("reviewer_id", user.id);
  const reviewByContract = new Map(
    (myReviews ?? []).map((r) => [
      r.contract_id,
      { rating: r.rating, comment: r.comment },
    ]),
  );

  return (
    <div className="py-8 space-y-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          {isEmployer && (
            <Button asChild size="sm">
              <Link href="/jobs/new">Post a job</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/profile/edit">Edit profile</Link>
          </Button>
        </div>
      </div>

      {contractOk && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm border border-success/40 text-success bg-success/10 rounded-md p-3"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {contractOk}
        </p>
      )}
      {contractError && (
        <p
          role="alert"
          className="text-sm border border-destructive/40 text-destructive rounded-md p-3"
        >
          {contractError}
        </p>
      )}

      {/* ===================== AS A STUDENT ===================== */}
      {!isEmployer && (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">My offers & work</h2>
        {!myContracts || myContracts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No offers yet.{" "}
            <Link href="/jobs" className="underline">
              Browse jobs
            </Link>{" "}
            and contact employers to get hired.
          </p>
        ) : (
          <ul className="divide-y border rounded-lg">
            {myContracts.map((c) => {
              const job = c.job as unknown as JobRef;
              const employer = c.employer as unknown as Named;
              const status = c.status as ContractStatus;
              return (
                <li key={c.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      {job ? (
                        <Link
                          href={`/jobs/${job.id}`}
                          className="font-medium hover:underline"
                        >
                          {job.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-muted-foreground">
                          Removed job
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        from{" "}
                        {employer ? (
                          <Link
                            href={`/profile/${employer.id}`}
                            className="underline"
                          >
                            {employer.full_name ?? "an employer"}
                          </Link>
                        ) : (
                          "an employer"
                        )}
                      </p>
                    </div>
                    <ContractStatusBadge status={status} />
                  </div>

                  {status === "Offered" && (
                    <div className="flex gap-2">
                      <form action={acceptOffer.bind(null, c.id)}>
                        <SubmitButton size="sm">Accept</SubmitButton>
                      </form>
                      <ConfirmSubmit
                        action={declineOffer.bind(null, c.id)}
                        label="Decline"
                        variant="outline"
                        size="sm"
                        confirmTitle="Decline this offer?"
                        confirmBody={`This permanently declines the offer for "${job?.title ?? "this job"}". The employer will need to send a new one.`}
                        confirmLabel="Decline offer"
                      />
                    </div>
                  )}

                  {status === "Accepted" && (
                    <ConfirmSubmit
                      action={resignContract.bind(null, c.id)}
                      label="End contract"
                      size="sm"
                      confirmTitle="End this contract?"
                      confirmBody={`This ends your contract for "${job?.title ?? "this job"}" and can't be undone.`}
                      confirmLabel="End contract"
                    />
                  )}

                  {status === "Completed" && (
                    <ReviewForm
                      contractId={c.id}
                      existing={reviewByContract.get(c.id) ?? null}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      )}

      {/* ===================== AS AN EMPLOYER ===================== */}
      {isEmployer && (
      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Hiring</h2>

        {/* Offer a job */}
        {myJobs && myJobs.length > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium">Offer a job</h3>
            <p className="text-sm text-muted-foreground">
              Hired someone after chatting on Messenger? Send them an offer using
              the email they gave you.
            </p>
            <form
              action={offerContract}
              className="flex flex-col sm:flex-row gap-3 sm:items-end"
            >
              <div className="space-y-1.5">
                <Label htmlFor="job_id">Job</Label>
                <select
                  id="job_id"
                  name="job_id"
                  required
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {myJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="student_email">Student email</Label>
                <Input
                  id="student_email"
                  name="student_email"
                  type="email"
                  required
                  placeholder="student@example.com"
                />
              </div>
              <SubmitButton>Send offer</SubmitButton>
            </form>
          </div>
        )}

        {/* My posted jobs */}
        <div className="space-y-2">
          <h3 className="font-medium">My job posts</h3>
          {!myJobs || myJobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You haven&apos;t posted any jobs.{" "}
              <Link href="/jobs/new" className="underline">
                Post one
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y border rounded-lg">
              {myJobs.map((j) => (
                <li
                  key={j.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <Link
                    href={`/jobs/${j.id}`}
                    className="font-medium hover:underline"
                  >
                    {j.title}
                  </Link>
                  <Link
                    href={`/jobs/${j.id}/edit`}
                    className="text-sm underline text-muted-foreground"
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Offers I've sent */}
        <div className="space-y-2">
          <h3 className="font-medium">Offers I&apos;ve sent</h3>
          {!sentContracts || sentContracts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No offers sent yet.</p>
          ) : (
            <ul className="divide-y border rounded-lg">
              {sentContracts.map((c) => {
                const job = c.job as unknown as JobRef;
                const student = c.student as unknown as Named;
                const status = c.status as ContractStatus;
                return (
                  <li key={c.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        {job ? (
                          <Link
                            href={`/jobs/${job.id}`}
                            className="font-medium hover:underline"
                          >
                            {job.title}
                          </Link>
                        ) : (
                          <span className="font-medium text-muted-foreground">
                            Removed job
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          to{" "}
                          {student ? (
                            <Link
                              href={`/profile/${student.id}`}
                              className="underline"
                            >
                              {student.full_name ?? "a student"}
                            </Link>
                          ) : (
                            "a student"
                          )}
                        </p>
                      </div>
                      <ContractStatusBadge status={status} />
                    </div>

                    {status === "Accepted" && (
                      <div className="flex gap-2">
                        <form action={completeContract.bind(null, c.id)}>
                          <SubmitButton size="sm">Mark completed</SubmitButton>
                        </form>
                        <ConfirmSubmit
                          action={resignContract.bind(null, c.id)}
                          label="End contract"
                          size="sm"
                          confirmTitle="End this contract?"
                          confirmBody={`This ends the contract for "${job?.title ?? "this job"}" with ${student?.full_name ?? "this student"} and can't be undone.`}
                          confirmLabel="End contract"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      )}
    </div>
  );
}
