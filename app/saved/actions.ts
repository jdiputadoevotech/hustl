"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Toggle a student's bookmark on a job. Insert to save, delete to unsave.
 * `currentlySaved` is the button's current state, so we know which way to flip.
 * RLS enforces owner-only writes and the student-role gate on insert; the UI
 * only shows the button to students, so no extra role check is needed here.
 */
export async function toggleSaveJob(jobId: string, currentlySaved: boolean) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  if (currentlySaved) {
    await supabase
      .from("saved_jobs")
      .delete()
      .eq("student_id", user.id)
      .eq("job_id", jobId);
  } else {
    await supabase
      .from("saved_jobs")
      .insert({ student_id: user.id, job_id: jobId });
  }

  revalidatePath("/saved");
}
