"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

type JobFields = {
  title: string;
  description: string | null;
  job_type: string;
  category: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_period: string;
};

function readJob(formData: FormData): JobFields {
  const num = (v: FormDataEntryValue | null) => {
    const n = Number(v);
    return v == null || v === "" || Number.isNaN(n) ? null : n;
  };
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    job_type: String(formData.get("job_type") ?? "gig"),
    category: String(formData.get("category") ?? "").trim() || null,
    pay_min: num(formData.get("pay_min")),
    pay_max: num(formData.get("pay_max")),
    pay_period: String(formData.get("pay_period") ?? "project"),
  };
}

export async function createJob(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({ employer_id: user.id, ...readJob(formData) })
    .select("id")
    .single();

  if (error) {
    redirect(`/jobs/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/jobs");
  redirect(`/jobs/${data.id}`);
}

export async function updateJob(jobId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update({ ...readJob(formData), updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) {
    redirect(`/jobs/${jobId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  redirect(`/jobs/${jobId}`);
}

export async function deleteJob(jobId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  await supabase.from("jobs").delete().eq("id", jobId);

  revalidatePath("/jobs");
  redirect("/dashboard");
}
