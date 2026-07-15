"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * A flagged user appeals their restriction. RLS enforces that only a currently
 * flagged user may insert, and the one-open-per-user unique index blocks a
 * second open appeal. Redirects back to /appeal with a friendly message.
 */
export async function submitAppeal(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const message = String(formData.get("message") ?? "").trim();
  if (!message) {
    redirect(`/appeal?error=${encodeURIComponent("Write a message before submitting.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("flag_appeals")
    .insert({ user_id: user.id, message });

  if (error) {
    // 23505 = unique_violation -> flag_appeals_one_open
    const msg =
      error.code === "23505"
        ? "You already have an appeal under review."
        : error.message;
    redirect(`/appeal?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/appeal");
  revalidatePath("/admin/appeals");
  redirect("/appeal?ok=1");
}
