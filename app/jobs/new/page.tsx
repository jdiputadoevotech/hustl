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
    <div className="max-w-xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Post a job</h1>
        <p className="text-muted-foreground">
          Hiring? Post a gig, part-time, or full-time opening for students.
        </p>
      </header>
      <JobForm action={createJob} submitLabel="Publish job" error={error} />
    </div>
  );
}
