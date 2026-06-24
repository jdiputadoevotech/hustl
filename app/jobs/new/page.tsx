import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
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

  return (
    <div className="py-10 space-y-6">
      <h1 className="text-2xl font-bold">Post a job</h1>
      <p className="text-muted-foreground -mt-4">
        Hiring? Post a gig, part-time, or full-time opening for students.
      </p>
      <JobForm action={createJob} submitLabel="Publish job" error={error} />
    </div>
  );
}
