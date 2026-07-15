"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canBecomeEmployer } from "@/lib/auth";
import type { Socials } from "@/lib/types/database";

const SOCIAL_KEYS = ["facebook", "instagram", "linkedin"] as const;

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const skillsRaw = String(formData.get("skills") ?? "");
  const skills = skillsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const socials: Socials = {};
  for (const k of SOCIAL_KEYS) {
    const v = String(formData.get(`social_${k}`) ?? "").trim();
    if (v) socials[k] = v;
  }

  const messengerUsername = String(
    formData.get("messenger_username") ?? "",
  ).trim();
  const establishmentDescription = String(
    formData.get("establishment_description") ?? "",
  ).trim();
  const upgrade = formData.get("upgrade") === "1";

  const update: Record<string, unknown> = {
    full_name: String(formData.get("full_name") ?? "").trim() || null,
    messenger_username: messengerUsername || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    skills: skills.length ? skills : null,
    establishment_name:
      String(formData.get("establishment_name") ?? "").trim() || null,
    establishment_description: establishmentDescription || null,
    website_url: String(formData.get("website_url") ?? "").trim() || null,
    socials,
    contracts_hidden: formData.get("contracts_hidden") === "on",
    updated_at: new Date().toISOString(),
  };

  // Become-employer upgrade: re-check the .edu block + required fields
  // server-side (never trust the hidden button), then flip the role.
  if (upgrade) {
    if (!canBecomeEmployer(user.email)) {
      redirect(
        `/profile/edit?upgrade=1&error=${encodeURIComponent("Student (.edu) emails can't become employers.")}`,
      );
    }
    if (!messengerUsername || !establishmentDescription) {
      redirect(
        `/profile/edit?upgrade=1&error=${encodeURIComponent("Messenger username and establishment description are required to become an employer.")}`,
      );
    }
    update.role = "employer";
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    const q = upgrade ? "upgrade=1&" : "";
    redirect(`/profile/edit?${q}error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/profile/${user.id}`);
  redirect(`/profile/${user.id}`);
}

/**
 * Requests account verification: flips the caller's own verification_status to
 * 'pending' for an admin to review. Allowed on the normal (RLS) client because
 * the profiles_guard_admin_fields trigger permits the owner to move to 'pending'
 * — only 'verified'/'rejected' are service-role-only. No-op if already pending
 * or verified.
 */
export async function requestVerification() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ verification_status: "pending", updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .not("verification_status", "in", "(pending,verified)");

  if (error) {
    redirect(`/profile/${user.id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/profile/${user.id}`);
  redirect(`/profile/${user.id}`);
}

/**
 * Soft-deletes (deactivates) the user's account. Sets profiles.deactivated_at
 * on the owner's own row — nothing is dropped, the auth.users record is kept, so
 * the account can be restored later. The proxy then hides the user everywhere:
 * their jobs drop off public surfaces (jobs_with_employer view filters
 * deactivated_at is null) and any request routes them to /reactivate. Reviews
 * they *wrote* stay visible. Blocked while any contract is still live so a
 * counterparty never loses in-flight work. Signs out at the end; to come back
 * the user logs in again and reactivates. The owner may set deactivated_at
 * directly — it is intentionally not guarded by profiles_guard_admin_fields.
 */
export async function deactivateAccount() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  // Block deactivation while any contract is still live (Offered/Accepted) for
  // either party — going dark would silently strip the counterparty's pending or
  // in-flight work. They must complete, decline, or resign it first.
  const { data: live } = await supabase
    .from("contracts")
    .select("id")
    .in("status", ["Offered", "Accepted"])
    .or(`employer_id.eq.${user.id},student_id.eq.${user.id}`)
    .limit(1);
  if (live && live.length > 0) {
    redirect(
      `/profile/edit?error=${encodeURIComponent("You have active or pending contracts. Complete, decline, or resign them before deactivating your account.")}`,
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ deactivated_at: now, updated_at: now })
    .eq("id", user.id);
  if (error) {
    redirect(`/profile/edit?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Reactivates a previously deactivated account: clears profiles.deactivated_at
 * on the owner's own row, un-hiding their profile and republishing their jobs.
 * Reachable because the proxy allowlists /reactivate for deactivated users
 * (their session is kept, not signed out).
 */
export async function reactivateAccount() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ deactivated_at: null, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    redirect(`/reactivate?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
