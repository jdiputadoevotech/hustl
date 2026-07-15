import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { LogoutButton } from "@/components/logout-button";
import { FormError } from "@/components/marketplace/form-error";
import { reactivateAccount } from "@/app/profile/actions";

export const metadata = { title: "Reactivate your account — Hustl" };

type SearchParams = Promise<{ error?: string }>;

/**
 * Shown to a self-deactivated user. The proxy keeps their session but routes
 * every request here until they reactivate (clearing profiles.deactivated_at)
 * or log out. Restoring un-hides their profile and republishes their jobs.
 */
export default async function ReactivatePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Your account is deactivated. Nothing was deleted — reactivate to
              restore your profile and republish your job posts.
            </p>
            {error && <FormError>{error}</FormError>}
            <div className="flex flex-col gap-2">
              <ConfirmSubmit
                action={reactivateAccount}
                label="Reactivate account"
                variant="default"
                confirmTitle="Reactivate your account?"
                confirmBody="This restores your profile and republishes your job posts."
              />
              <LogoutButton variant="outline">Log out</LogoutButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
