"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Avatar (with online dot) that opens a menu: profile, dashboard, log out. */
export function UserMenu({
  userId,
  name,
  isAdmin = false,
}: {
  userId: string;
  name: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/?auth=login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative outline-none rounded-full focus-visible:ring-2 focus-visible:ring-ring">
        <AvatarInitials name={name} className="h-11 w-11 text-base" />
        <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/profile/${userId}`}>My profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/edit">Edit profile</Link>
        </DropdownMenuItem>
        {!isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard">Dashboard</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
