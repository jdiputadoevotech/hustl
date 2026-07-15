"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Faq } from "@/lib/types/database";

const MAX_FAQS = 10;
const MIN_LISTED_FAQS = 2;

type JobFields = {
  title: string;
  description: string | null;
  job_type: string;
  category: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_period: string;
  skills: string[];
  location: string | null;
  work_mode: string | null;
  term: string | null;
  is_urgent: boolean;
  faqs: Faq[];
};

/** Parse the hidden `faqs` JSON field; keep only pairs with both Q and A. */
function readFaqs(formData: FormData): Faq[] {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("faqs") ?? "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => ({
      question: String((f as Faq)?.question ?? "").trim(),
      answer: String((f as Faq)?.answer ?? "").trim(),
    }))
    .filter((f) => f.question && f.answer);
}

function readJob(formData: FormData): JobFields {
  const num = (v: FormDataEntryValue | null) => {
    const n = Number(v);
    return v == null || v === "" || Number.isNaN(n) ? null : n;
  };
  const skills = String(formData.get("skills") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const faqs = readFaqs(formData);
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    job_type: String(formData.get("job_type") ?? "gig"),
    category: String(formData.get("category") ?? "").trim() || null,
    pay_min: num(formData.get("pay_min")),
    pay_max: num(formData.get("pay_max")),
    pay_period: String(formData.get("pay_period") ?? "project"),
    skills,
    location: String(formData.get("location") ?? "").trim() || null,
    work_mode: String(formData.get("work_mode") ?? "").trim() || null,
    term: String(formData.get("term") ?? "").trim() || null,
    is_urgent: formData.get("is_urgent") === "on",
    faqs,
  };
}

/** Did the submit come from the Post button (publish) vs Save (draft)? */
const wantsPost = (formData: FormData) => formData.get("intent") === "post";

export async function createJob(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  // Only employers may post. RLS enforces this too; this gives a clear message.
  const { data: me } = await supabase
    .from("profiles")
    .select("role, flagged_at")
    .eq("id", user.id)
    .single();
  if (me?.flagged_at) {
    redirect(
      `/appeal?error=${encodeURIComponent("Your account is restricted, so you can't post jobs.")}`,
    );
  }
  if (me?.role !== "employer") {
    redirect(
      `/profile/${user.id}?error=${encodeURIComponent("Become an employer to post a job.")}`,
    );
  }

  const fields = readJob(formData);
  if (fields.faqs.length > MAX_FAQS) {
    redirect(`/jobs/new?error=${encodeURIComponent("You can add at most 10 FAQs.")}`);
  }

  // Publish only when Posting with enough FAQs; otherwise it's a hidden draft.
  const canList = fields.faqs.length >= MIN_LISTED_FAQS;
  const is_disabled = !(wantsPost(formData) && canList);

  const { data, error } = await supabase
    .from("jobs")
    .insert({ employer_id: user.id, ...fields, is_disabled })
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

  const fields = readJob(formData);
  if (fields.faqs.length > MAX_FAQS) {
    redirect(
      `/jobs/${jobId}/edit?error=${encodeURIComponent("You can add at most 10 FAQs.")}`,
    );
  }

  const supabase = await createClient();
  const canList = fields.faqs.length >= MIN_LISTED_FAQS;
  let is_disabled: boolean;
  if (wantsPost(formData) && canList) {
    is_disabled = false; // Post → publish
  } else {
    // Save → keep current visibility, but force-hide if it now lacks 2 FAQs.
    const { data: cur } = await supabase
      .from("jobs")
      .select("is_disabled")
      .eq("id", jobId)
      .single();
    is_disabled = (cur?.is_disabled ?? true) || !canList;
  }

  const { error } = await supabase
    .from("jobs")
    .update({ ...fields, is_disabled, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) {
    redirect(`/jobs/${jobId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  redirect(`/jobs/${jobId}`);
}

/**
 * Owner one-click Hide/Unhide from the job detail page. Hiding always works;
 * unhiding only lists the job if it still has the minimum FAQs (a job under the
 * threshold can't be forced into listings).
 */
export async function toggleJobVisibility(jobId: string, hide: boolean) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("employer_id, faqs")
    .eq("id", jobId)
    .single();
  if (!job || job.employer_id !== user.id) redirect(`/jobs/${jobId}`);

  const faqs = (job.faqs as Faq[] | null) ?? [];
  const is_disabled = hide || faqs.length < MIN_LISTED_FAQS;

  await supabase
    .from("jobs")
    .update({ is_disabled, updated_at: new Date().toISOString() })
    .eq("id", jobId);

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
