"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { ContractStatus } from "@/lib/types/database";

/**
 * Where to send the user back to after an action. Forms post the tab/filter
 * URL they were on so acting on a row doesn't dump them back on Overview.
 * Only same-origin /dashboard paths are honoured — the value comes from a form
 * field, so anything else would be an open redirect.
 */
function returnUrl(formData: FormData | undefined, param: string, value: string) {
  const raw = String(formData?.get("returnTo") ?? "");
  const base =
    raw.startsWith("/dashboard") && !raw.startsWith("//") ? raw : "/dashboard";
  const [path, query = ""] = base.split("?");
  const params = new URLSearchParams(query);
  params.delete("contractOk");
  params.delete("contractError");
  params.set(param, value);
  return `${path}?${params.toString()}`;
}

const dashErr = (msg: string, formData?: FormData): never =>
  redirect(returnUrl(formData, "contractError", msg));

/** Flagged users are write-locked (RLS enforces it too; this is a clear message). */
async function isFlagged(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("flagged_at")
    .eq("id", userId)
    .single();
  return Boolean(data?.flagged_at);
}

/**
 * Employer sends a job offer to a student (identified by email). The student
 * must be a registered account. Creates a contract in 'Offered'.
 */
export async function offerContract(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const jobId = String(formData.get("job_id") ?? "");
  const email = String(formData.get("student_email") ?? "").trim();
  if (!jobId || !email)
    return dashErr("Pick a job and enter a student email", formData);

  const supabase = await createClient();
  if (await isFlagged(supabase, user.id)) {
    return dashErr("Your account is restricted, so you can't send offers.", formData);
  }

  // Job must belong to the current user (also enforced by RLS).
  const { data: job } = await supabase
    .from("jobs")
    .select("id, employer_id")
    .eq("id", jobId)
    .single();
  if (!job || job.employer_id !== user.id)
    return dashErr("That job isn't yours", formData);

  const { data: studentId, error: lookupError } = await supabase.rpc(
    "lookup_user_by_email",
    { p_email: email },
  );
  if (lookupError) return dashErr(lookupError.message, formData);
  if (!studentId)
    return dashErr("No Hustl account is registered with that email", formData);
  if (studentId === user.id)
    return dashErr("You can't offer a job to yourself", formData);

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
      formData,
    );
  }

  revalidatePath("/dashboard");
  redirect(returnUrl(formData, "contractOk", "Offer sent"));
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
  formData?: FormData,
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  if (await isFlagged(supabase, user.id)) {
    return dashErr(
      "Your account is restricted, so you can't change contracts.",
      formData,
    );
  }

  const { data: c } = await supabase
    .from("contracts")
    .select("id, employer_id, student_id, status")
    .eq("id", contractId)
    .single();
  if (!c) return dashErr("Contract not found", formData);

  const isEmployer = c.employer_id === user.id;
  const isStudent = c.student_id === user.id;
  const allowed =
    opts.by === "either"
      ? isEmployer || isStudent
      : opts.by === "employer"
        ? isEmployer
        : isStudent;
  if (!allowed) return dashErr("You can't perform that action", formData);
  if (!opts.from.includes(c.status as ContractStatus)) {
    return dashErr(`Can't do that from '${c.status}'`, formData);
  }

  await supabase
    .from("contracts")
    .update({ status: opts.to, updated_at: new Date().toISOString() })
    .eq("id", contractId);

  revalidatePath("/dashboard");
  redirect(returnUrl(formData, "contractOk", opts.ok));
}

export async function acceptOffer(id: string, formData?: FormData) {
  return transition(
    id,
    { from: ["Offered"], to: "Accepted", by: "student", ok: "Offer accepted" },
    formData,
  );
}

export async function declineOffer(id: string, formData?: FormData) {
  return transition(
    id,
    { from: ["Offered"], to: "Declined", by: "student", ok: "Offer declined" },
    formData,
  );
}

export async function completeContract(id: string, formData?: FormData) {
  return transition(
    id,
    { from: ["Accepted"], to: "Completed", by: "employer", ok: "Marked completed" },
    formData,
  );
}

export async function resignContract(id: string, formData?: FormData) {
  return transition(
    id,
    { from: ["Accepted"], to: "Resigned", by: "either", ok: "Contract ended" },
    formData,
  );
}
