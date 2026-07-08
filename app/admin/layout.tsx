import { requireAdmin } from "@/lib/auth";

/**
 * Guards every /admin/* page. AdminNav only hides the links for non-admins;
 * this redirect is the real gate (there is no admin RLS — admin writes go
 * through the service-role client, so the route must be locked here).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
