"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { Role } from "@/lib/types/database";

// All admin mutations: verify caller is admin, then write through the
// service-role client (bypasses RLS + satisfies the profiles guard trigger).
// Errors surface via ?error= on the originating page, matching the app-wide
// redirect convention.

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// ---------- Users ----------

export async function setUserRole(id: string, role: Role) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail("/admin/users", error.message);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/** Promote an existing user to admin by email (Admins tab "Add admin"). */
export async function addAdminByEmail(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) fail("/admin/users?tab=admins", "Enter an email.");

  const supabase = await createClient();
  // Reuse the existing SECURITY DEFINER helper that maps email -> user id.
  const { data: id, error: lookupError } = await supabase.rpc(
    "lookup_user_by_email",
    { p_email: email },
  );
  if (lookupError) fail("/admin/users?tab=admins", lookupError.message);
  if (!id) fail("/admin/users?tab=admins", `No user found for ${email}.`);

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: "admin", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail("/admin/users?tab=admins", error.message);
  revalidatePath("/admin/users");
  redirect("/admin/users?tab=admins");
}

export async function setUserArchived(id: string, archived: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ archived, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail("/admin/users", error.message);
  revalidatePath("/admin/users");
  redirect(`/admin/users?tab=${archived ? "archived" : "active"}`);
}

/**
 * Permanently deletes a user: removes the auth.users row, which cascades to
 * their profile, jobs, contracts, and saved jobs (reviews they wrote survive
 * with reviewer_id nulled). Blocked while either party has a live contract, so
 * a counterparty never loses in-flight work — same guard as self-deletion.
 */
export async function deleteUser(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: live } = await supabase
    .from("contracts")
    .select("id")
    .in("status", ["Offered", "Accepted"])
    .or(`employer_id.eq.${id},student_id.eq.${id}`)
    .limit(1);
  if (live && live.length > 0) {
    fail(
      "/admin/users",
      "This user has active or pending contracts. Resolve them before deleting.",
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) fail("/admin/users", error.message);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

// ---------- Jobs ----------

export async function setJobHidden(id: string, hidden: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("jobs")
    .update({ is_disabled: hidden, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail("/admin/jobs", error.message);
  revalidatePath("/admin/jobs");
  redirect(`/admin/jobs?tab=${hidden ? "hidden" : "active"}`);
}

export async function deleteJob(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("jobs").delete().eq("id", id);
  if (error) fail("/admin/jobs", error.message);
  revalidatePath("/admin/jobs");
  redirect("/admin/jobs");
}

// ---------- Verification ----------

export async function setVerification(
  id: string,
  status: "verified" | "rejected",
) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ verification_status: status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail("/admin/verification", error.message);
  revalidatePath("/admin/verification");
  revalidatePath(`/profile/${id}`);
  redirect("/admin/verification");
}

// ---------- Reports ----------
// Triage only: admins mark a report resolved/dismissed (or reopen it) and act on
// the target via the existing Users/Jobs moderation. Reads/writes bypass RLS.

async function setReportStatus(
  id: string,
  status: "open" | "resolved" | "dismissed",
) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const closing = status !== "open";
  const { error } = await admin
    .from("reports")
    .update({
      status,
      resolved_by: closing ? user.id : null,
      resolved_at: closing ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) fail("/admin/reports", error.message);
  revalidatePath("/admin/reports");
  redirect(`/admin/reports?tab=${status === "open" ? "open" : status}`);
}

export async function resolveReport(id: string) {
  await setReportStatus(id, "resolved");
}

export async function dismissReport(id: string) {
  await setReportStatus(id, "dismissed");
}

export async function reopenReport(id: string) {
  await setReportStatus(id, "open");
}

// ---------- Reviews ----------
// Soft delete (archive) is the default, reversible action: an archived review is
// hidden on every public surface and dropped from the employer's rating (the
// jobs_with_employer view + app queries filter archived=false). Hard delete is
// permanent. Both bypass RLS via the service-role client.

export async function setReviewArchived(id: string, archived: boolean) {
  const user = await requireAdmin();
  const admin = createAdminClient();

  // Need the employer to revalidate their public profile's rating/reviews.
  const { data: review } = await admin
    .from("reviews")
    .select("employer_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await admin
    .from("reviews")
    .update({ archived, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail("/admin/reviews", error.message);

  // Archiving a review closes out any open reports against it.
  if (archived) {
    await admin
      .from("reports")
      .update({
        status: "resolved",
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("target_type", "review")
      .eq("target_id", id)
      .eq("status", "open");
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/admin/reports");
  if (review?.employer_id) revalidatePath(`/profile/${review.employer_id}`);
  redirect(`/admin/reviews?tab=${archived ? "archived" : "visible"}`);
}

export async function deleteReviewAdmin(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: review } = await admin
    .from("reviews")
    .select("employer_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await admin.from("reviews").delete().eq("id", id);
  if (error) fail("/admin/reviews", error.message);
  revalidatePath("/admin/reviews");
  if (review?.employer_id) revalidatePath(`/profile/${review.employer_id}`);
  redirect("/admin/reviews");
}
