import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/marketplace/form-error";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/time";
import { submitAppeal } from "@/app/appeal/actions";
import type { AppealStatus } from "@/lib/types/database";

export const metadata = { title: "Appeal your restriction — Hustl" };

type SearchParams = Promise<{ error?: string; ok?: string }>;

/**
 * Shown to a flagged (soft-restricted) user. Unlike /suspended and /reactivate
 * the user isn't penned here — they reach it from the app-wide banner. Lets them
 * see why they were flagged and file one appeal for admin review.
 */
export default async function AppealPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, ok } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("flagged_at, flag_reason")
    .eq("id", user.id)
    .single();

  // Not flagged (or just got unflagged) — nothing to appeal.
  if (!me?.flagged_at) redirect("/dashboard");

  // Most recent appeal, to show its state instead of a fresh form.
  const { data: latest } = await supabase
    .from("flag_appeals")
    .select("status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const status = latest?.status as AppealStatus | undefined;
  const hasOpenAppeal = status === "open";

  return (
    <div className="mx-auto w-full max-w-lg p-6 md:p-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Appeal your restriction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            An administrator restricted your account. You can still browse, but
            can&apos;t post jobs, leave reviews, offer or accept contracts, or
            file reports until the restriction is lifted.
          </p>
          {me.flag_reason && (
            <p className="rounded-md border bg-muted/40 p-3 text-foreground/90">
              <span className="font-medium">Reason given:</span>{" "}
              {me.flag_reason}
            </p>
          )}

          {ok || hasOpenAppeal ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
              Your appeal was submitted and is under review. An admin will
              decide soon
              {latest ? ` (sent ${timeAgo(latest.created_at)})` : ""}.
            </p>
          ) : (
            <form action={submitAppeal} className="space-y-3">
              {status === "denied" && (
                <p className="text-foreground/90">
                  Your previous appeal was denied. If you have new information,
                  you may submit another.
                </p>
              )}
              {error && <FormError>{error}</FormError>}
              <div className="space-y-1">
                <label htmlFor="message" className="font-medium text-foreground">
                  Your appeal
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  placeholder="Explain why this restriction should be reconsidered."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <SubmitButton>Submit appeal</SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
