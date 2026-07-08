"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canBecomeEmployer } from "@/lib/auth";
import type { Socials } from "@/lib/types/database";

const SOCIAL_KEYS = ["facebook", "instagram", "linkedin"] as const;

function fail(message: string): never {
  redirect(`/onboarding?error=${encodeURIComponent(message)}`);
}

/**
 * First-run onboarding: records the user's chosen role and profile details, then
 * marks `onboarded` in the JWT user_metadata so the proxy gate stops redirecting
 * here. Mirrors the server-side re-checks in profile `updateProfile` — never
 * trust the client's role choice.
 */
export async function completeOnboarding(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const wantsEmployer = formData.get("role") === "employer";
  const fullName = String(formData.get("full_name") ?? "").trim();
  const messengerUsername = String(
    formData.get("messenger_username") ?? "",
  ).trim();
  const establishmentName = String(
    formData.get("establishment_name") ?? "",
  ).trim();
  const establishmentDescription = String(
    formData.get("establishment_description") ?? "",
  ).trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const skills = String(formData.get("skills") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const socials: Socials = {};
  for (const k of SOCIAL_KEYS) {
    const v = String(formData.get(`social_${k}`) ?? "").trim();
    if (v) socials[k] = v;
  }

  // Messenger is how the other side reaches you about a job — required for both.
  if (!messengerUsername) fail("A Messenger username is required.");

  const update: Record<string, unknown> = {
    full_name: fullName || null,
    messenger_username: messengerUsername,
    establishment_name: establishmentName || null,
    bio: bio || null,
    skills: skills.length ? skills : null,
    socials,
    updated_at: new Date().toISOString(),
  };

  if (wantsEmployer) {
    // .edu emails can't be employers; description is required for employers.
    if (!canBecomeEmployer(user.email)) {
      fail("Student (.edu) emails can't become employers.");
    }
    if (!establishmentDescription) {
      fail("An establishment description is required to become an employer.");
    }
    update.role = "employer";
    update.establishment_description = establishmentDescription;
  } else {
    // Students must be tied to a school for the (future) verification process.
    if (!establishmentName) fail("Your school name is required.");
    // role already defaults to 'student'.
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);
  if (error) fail(error.message);

  // Flip the onboarded flag in user_metadata, then force a token refresh so the
  // new access-token JWT actually carries it — updateUser alone leaves the JWT
  // stale, and the proxy gate reads the JWT (getClaims), so without the refresh
  // it keeps bouncing /dashboard back to /onboarding.
  await supabase.auth.updateUser({ data: { onboarded: true } });
  await supabase.auth.refreshSession();

  redirect("/dashboard");
}
