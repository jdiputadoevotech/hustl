"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { ReportReason, ReportTargetType } from "@/lib/types/database";

const TARGET_TYPES: ReportTargetType[] = ["profile", "job", "review"];
const REASONS: ReportReason[] = [
  "spam",
  "harassment",
  "scam",
  "inappropriate",
  "other",
];

/**
 * File a report against a profile or a job. RLS also enforces the self-report
 * block; here we re-validate the enum inputs and turn the one-open-per-target
 * unique-index violation into a friendly message. Redirects back to the
 * originating page (passed as `redirectTo`) with ?reportOk / ?reportError.
 */
export async function createReport(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const targetType = String(formData.get("target_type") ?? "") as ReportTargetType;
  const targetId = String(formData.get("target_id") ?? "");
  const reason = String(formData.get("reason") ?? "") as ReportReason;
  const details = String(formData.get("details") ?? "").trim() || null;

  // Only allow relative in-app paths as the return target (no open redirect).
  const rawRedirect = String(formData.get("redirectTo") ?? "");
  const redirectTo = rawRedirect.startsWith("/") ? rawRedirect : "/";

  const back = (params: string) => redirect(`${redirectTo}?${params}`);

  if (!TARGET_TYPES.includes(targetType) || !REASONS.includes(reason) || !targetId) {
    back("reportError=" + encodeURIComponent("Pick a reason to submit a report."));
  }
  if (targetType === "profile" && targetId === user.id) {
    back("reportError=" + encodeURIComponent("You can't report yourself."));
  }

  const supabase = await createClient();

  // A review's author can't report their own review.
  if (targetType === "review") {
    const { data: review } = await supabase
      .from("reviews")
      .select("reviewer_id")
      .eq("id", targetId)
      .maybeSingle();
    if (review?.reviewer_id === user.id) {
      back("reportError=" + encodeURIComponent("You can't report your own review."));
    }
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
    details,
  });

  if (error) {
    // 23505 = unique_violation -> reports_one_open_per_target
    const message =
      error.code === "23505"
        ? "You already have an open report on this."
        : error.message;
    back("reportError=" + encodeURIComponent(message));
  }

  revalidatePath("/admin/reports");
  back("reportOk=1");
}
