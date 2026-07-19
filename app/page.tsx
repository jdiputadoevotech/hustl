import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canBecomeEmployer } from "@/lib/auth";
import { HomeHero } from "@/components/home/home-hero";
import { LatestGigs } from "@/components/home/latest-gigs";
import { HowItWorks } from "@/components/home/how-it-works";
import { JOB_CARD_SELECT } from "@/lib/jobs";
import type { JobWithEmployer } from "@/lib/types/database";

type Variant = "guest" | "student" | "employer" | "admin";

export default async function Home() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  let variant: Variant = "guest";
  let name = "";
  let employerEligible = false;
  let verificationStatus: string | null = null;
  const profileHref = user ? `/profile/${user.id}` : undefined;

  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("full_name, role, verification_status")
      .eq("id", user.id)
      .single();
    const role = me?.role ?? "student";
    variant = role === "admin" ? "admin" : role === "employer" ? "employer" : "student";
    name = me?.full_name || user.email.split("@")[0] || "";
    employerEligible = canBecomeEmployer(user.email);
    verificationStatus = me?.verification_status ?? null;
  }

  // Admins land on their own console — skip the student-facing feed for them.
  const showFeed = variant !== "admin";
  const isStudent = variant === "student";

  let jobs: JobWithEmployer[] = [];
  const savedIds = new Set<string>();
  if (showFeed) {
    const { data } = await supabase
      .from("jobs_with_employer")
      .select(JOB_CARD_SELECT)
      .eq("is_disabled", false)
      .order("created_at", { ascending: false })
      .limit(6);
    jobs = (data as JobWithEmployer[] | null) ?? [];
    if (isStudent && user) {
      const { data: saved } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("student_id", user.id);
      saved?.forEach((s) => savedIds.add(s.job_id));
    }
  }

  return (
    <div className="flex min-h-screen flex-col gap-16">
      <HomeHero
        variant={variant}
        name={name}
        employerEligible={employerEligible}
        verificationStatus={verificationStatus}
        profileHref={profileHref}
      />
      {showFeed && jobs.length > 0 && (
        <LatestGigs jobs={jobs} canSave={isStudent} savedIds={savedIds} />
      )}
      {variant !== "admin" && <HowItWorks />}
    </div>
  );
}
