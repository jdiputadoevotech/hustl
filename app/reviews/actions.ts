"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Resolve the in-app path the caller wants to return to. Only relative paths
 * are allowed (must start with a single "/") to prevent an open redirect; any
 * other value falls back to the dashboard.
 */
function returnPath(formData: FormData): string {
  const to = String(formData.get("redirectTo") ?? "");
  if (to.startsWith("/") && !to.startsWith("//")) return to;
  return "/dashboard";
}

/**
 * Create or update the student's review of an employer for a Completed
 * contract. RLS also enforces the Completed + student check; here we resolve
 * the employer/job from the contract and upsert on the contract_id unique key.
 */
export async function submitReview(contractId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const base = returnPath(formData);

  const rating = Number(formData.get("rating") ?? 0);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect(`${base}?contractError=Pick%20a%20rating%20from%201%20to%205`);
  }

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, employer_id, student_id, status")
    .eq("id", contractId)
    .single();

  if (
    !contract ||
    contract.student_id !== user.id ||
    contract.status !== "Completed"
  ) {
    redirect(`${base}?contractError=You%20can%27t%20review%20that%20contract`);
  }

  const { error } = await supabase.from("reviews").upsert(
    {
      contract_id: contractId,
      employer_id: contract.employer_id,
      reviewer_id: user.id,
      rating,
      comment: String(formData.get("comment") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "contract_id" },
  );

  if (error) {
    redirect(`${base}?contractError=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/profile/${contract.employer_id}`);
  if (base !== "/dashboard") revalidatePath(base);
  redirect(`${base}?contractOk=Review+saved`);
}

export async function deleteReview(contractId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const base = returnPath(formData);

  const supabase = await createClient();
  // Grab employer_id before delete so we can revalidate their profile page.
  const { data: review } = await supabase
    .from("reviews")
    .select("employer_id")
    .eq("contract_id", contractId)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  await supabase
    .from("reviews")
    .delete()
    .eq("contract_id", contractId)
    .eq("reviewer_id", user.id);

  revalidatePath("/dashboard");
  if (review) revalidatePath(`/profile/${review.employer_id}`);
  if (base !== "/dashboard") revalidatePath(base);
  redirect(`${base}?contractOk=Review+removed`);
}
