import Link from "next/link";
import { LayoutDashboard, Users, Briefcase, BadgeCheck, Flag, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { hasEnvVars } from "@/lib/utils";

/**
 * Thin secondary nav shown directly under the main Navbar for admins only.
 * Same muted background as the Footer. Renders null for everyone else, so it
 * can be dropped into the layout unconditionally.
 */
const LINKS = [
  { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/verification", label: "Verification", icon: BadgeCheck },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/reports", label: "Reports", icon: Flag },
];

export async function AdminNav() {
  if (!hasEnvVars) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;

  return (
    <nav className="w-full border-b bg-muted sticky top-20 z-10">
      <div className="mx-auto w-full max-w-[1400px] flex items-center gap-1 px-6 lg:px-8 h-11">
        <span className="mr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Admin
        </span>
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
