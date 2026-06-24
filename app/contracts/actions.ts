"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { ContractStatus } from "@/lib/types/database";

const dashErr = (msg: string): never =>
  redirect(`/dashboard?contractError=${encodeURIComponent(msg)}`);

/**
 * Employer sends a job offer to a student (identified by email). The student
 * must be a registered account. Creates a contract in 'Offered'.
 */
export async function offerContract(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const jobId = String(formData.get("job_id") ?? "");
  const email = String(formData.get("student_email") ?? "").trim();
  if (!jobId || !email) return dashErr("Pick a job and enter a student email");

  const supabase = await createClient();

  // Job must belong to the current user (also enforced by RLS).
  const { data: job } = await supabase
    .from("jobs")
    .select("id, employer_id")
    .eq("id", jobId)
    .single();
  if (!job || job.employer_id !== user.id) return dashErr("That job isn't yours");

  const { data: studentId, error: lookupError } = await supabase.rpc(
    "lookup_user_by_email",
    { p_email: email },
  );
  if (lookupError) return dashErr(lookupError.message);
  if (!studentId)
    return dashErr("No Hustl account is registered with that email");
  if (studentId === user.id)
    return dashErr("You can't offer a job to yourself");

  const { error } = await supabase.from("contracts").insert({
    job_id: jobId,
    employer_id: user.id,
    student_id: studentId,
    status: "Offered",
  });
  if (error) {
    // Most likely the unique(job_id, student_id) constraint.
    return dashErr(
      error.code === "23505"
        ? "You've already offered this job to that student"
        : error.message,
    );
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?contractOk=Offer+sent");
}

/**
 * Move a contract to a new status, guarding who may make the transition and
 * what the current status must be. RLS already limits rows to the two parties.
 */
async function transition(
  contractId: string,
  opts: {
    from: ContractStatus[];
    to: ContractStatus;
    by: "employer" | "student" | "either";
    ok: string;
  },
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data: c } = await supabase
    .from("contracts")
    .select("id, employer_id, student_id, status")
    .eq("id", contractId)
    .single();
  if (!c) return dashErr("Contract not found");

  const isEmployer = c.employer_id === user.id;
  const isStudent = c.student_id === user.id;
  const allowed =
    opts.by === "either"
      ? isEmployer || isStudent
      : opts.by === "employer"
        ? isEmployer
        : isStudent;
  if (!allowed) return dashErr("You can't perform that action");
  if (!opts.from.includes(c.status as ContractStatus)) {
    return dashErr(`Can't do that from '${c.status}'`);
  }

  await supabase
    .from("contracts")
    .update({ status: opts.to, updated_at: new Date().toISOString() })
    .eq("id", contractId);

  revalidatePath("/dashboard");
  redirect(`/dashboard?contractOk=${encodeURIComponent(opts.ok)}`);
}

export async function acceptOffer(id: string) {
  return transition(id, {
    from: ["Offered"],
    to: "Accepted",
    by: "student",
    ok: "Offer accepted",
  });
}

export async function declineOffer(id: string) {
  return transition(id, {
    from: ["Offered"],
    to: "Declined",
    by: "student",
    ok: "Offer declined",
  });
}

export async function completeContract(id: string) {
  return transition(id, {
    from: ["Accepted"],
    to: "Completed",
    by: "employer",
    ok: "Marked completed",
  });
}

export async function resignContract(id: string) {
  return transition(id, {
    from: ["Accepted"],
    to: "Resigned",
    by: "either",
    ok: "Contract ended",
  });
}
