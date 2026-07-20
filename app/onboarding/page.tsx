import { redirect } from "next/navigation";
import { getCurrentUser, canBecomeEmployer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding-flow";

export const metadata = { title: "Welcome — Hustl" };

type SearchParams = Promise<{ error?: string }>;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  // Prefill from whatever the profile already has — `handle_new_user` seeds
  // full_name from the email local-part, and users gated in after the fact may
  // have filled things in from /profile/edit. Nothing here is required to exist.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, messenger_username, establishment_name, establishment_description, bio, skills, socials",
    )
    .eq("id", user.id)
    .single();

  return (
    <OnboardingFlow
      error={error}
      canEmploy={canBecomeEmployer(user.email)}
      defaults={{
        full_name: profile?.full_name ?? "",
        messenger_username: profile?.messenger_username ?? "",
        establishment_name: profile?.establishment_name ?? "",
        establishment_description: profile?.establishment_description ?? "",
        bio: profile?.bio ?? "",
        skills: profile?.skills?.join(", ") ?? "",
        socials: profile?.socials ?? {},
      }}
    />
  );
}
