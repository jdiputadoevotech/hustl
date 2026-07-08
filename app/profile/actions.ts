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
 * Deletes the user's profile row (cascading to their jobs/contracts) and signs
 * them out. Note: removing the underlying auth.users record requires the
 * service-role key and is out of scope for this client-key build.
 */
export async function deleteAccount() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  await supabase.from("profiles").delete().eq("id", user.id);
  await supabase.auth.signOut();

  redirect("/");
}
