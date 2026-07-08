"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
 * Permanently deletes the user's account. Uses the service-role admin client to
 * delete the auth.users record, which cascades to profiles and everything the
 * profile owns (jobs, contracts, saved jobs). Reviews the user *wrote* are kept
 * — their reviewer_id is set null so the employer's rating history survives (the
 * review then renders as "Deleted user"). Blocked while any contract is still
 * live so a counterparty never loses in-flight work. Clears cookies at the end.
 */
export async function deleteAccount() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect(
      `/profile/edit?error=${encodeURIComponent("Account deletion isn't configured. Contact support.")}`,
    );
  }

  const supabase = await createClient();

  // Block deletion while any contract is still live (Offered/Accepted) for
  // either party — deleting would silently strip the counterparty's pending or
  // in-flight work. They must complete, decline, or resign it first.
  const { data: live } = await supabase
    .from("contracts")
    .select("id")
    .in("status", ["Offered", "Accepted"])
    .or(`employer_id.eq.${user.id},student_id.eq.${user.id}`)
    .limit(1);
  if (live && live.length > 0) {
    redirect(
      `/profile/edit?error=${encodeURIComponent("You have active or pending contracts. Complete, decline, or resign them before deleting your account.")}`,
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    redirect(`/profile/edit?error=${encodeURIComponent(error.message)}`);
  }

  // The auth user is gone; clear the now-orphaned session cookies.
  await supabase.auth.signOut();

  redirect("/");
}
