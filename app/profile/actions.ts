"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const skillsRaw = String(formData.get("skills") ?? "");
  const skills = skillsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: String(formData.get("full_name") ?? "").trim() || null,
      messenger_username:
        String(formData.get("messenger_username") ?? "").trim() || null,
      bio: String(formData.get("bio") ?? "").trim() || null,
      skills: skills.length ? skills : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/profile/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/profile/${user.id}`);
  redirect(`/profile/${user.id}`);
}

/**
 * Deletes the user's profile row (cascading to their gigs/orders) and signs
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
