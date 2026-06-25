import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { JobForm } from "@/components/marketplace/job-form";
import { updateJob } from "../../actions";

export const metadata = { title: "Edit job — Hustl" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, title, description, job_type, category, pay_min, pay_max, pay_period, skills, location, work_mode, term, company, is_urgent, employer_id",
    )
    .eq("id", id)
    .single();

  if (!job) notFound();
  if (job.employer_id !== user.id) redirect(`/jobs/${id}`);

  return (
    <div className="space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Edit job</h1>
        <p className="text-muted-foreground">
          Update your posting. Changes go live immediately.
        </p>
      </header>
      <JobForm
        action={updateJob.bind(null, id)}
        job={job}
        submitLabel="Save changes"
        error={error}
        cancelHref={`/jobs/${id}`}
      />
    </div>
  );
}
