import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/marketplace/job-form";
import { createJob } from "../actions";

export const metadata = { title: "Post a job — Hustl" };

type SearchParams = Promise<{ error?: string }>;

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  // Only employers can post — students never see the form.
  const supabase = await createClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "employer") {
    redirect(
      `/profile/${user.id}?error=${encodeURIComponent("Become an employer to post a job.")}`,
    );
  }

  return (
    <div className="space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Post a job</h1>
        <p className="text-muted-foreground">
          Hiring? Post a gig, part-time, or full-time opening for students.
        </p>
      </header>
      <JobForm action={createJob} submitLabel="Save draft" error={error} />
    </div>
  );
}
