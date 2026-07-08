import { redirect } from "next/navigation";
import { getCurrentUser, canBecomeEmployer } from "@/lib/auth";
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

  // .edu users are auto-students and never prompted — bounce them if they land
  // here manually (the proxy already exempts them from the gate).
  if (!canBecomeEmployer(user.email)) redirect("/dashboard");

  return <OnboardingFlow error={error} />;
}
