import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Shown to an archived (suspended) user. The proxy signs them out and redirects
 * here on every request, so this is the only page they can reach while archived.
 */
export default function SuspendedPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Account suspended</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Your account has been suspended by an administrator and you have
              been signed out. You can no longer access Hustl with this account.
            </p>
            <p>
              If you think this is a mistake, contact support to appeal the
              decision.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
