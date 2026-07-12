"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markAllRead } from "@/app/notifications/actions";
import type { Notification } from "@/lib/types/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Relative time like "5m ago" / "2h ago" / "3d ago". */
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * Navbar bell with an unread red dot. Opening the dropdown marks everything
 * read (server) then refreshes so the dot clears. Items deep-link.
 */
export function NotificationBell({
  items,
  unreadCount,
}: {
  items: Notification[];
  unreadCount: number;
}) {
  const router = useRouter();

  const onOpenChange = async (open: boolean) => {
    if (open && unreadCount > 0) {
      await markAllRead();
      router.refresh();
    }
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        aria-label="Notifications"
        className="relative text-foreground/80 hover:text-foreground outline-none rounded-full focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </p>
        ) : (
          items.map((n) => (
            <DropdownMenuItem key={n.id} asChild>
              <Link
                href={n.link ?? "#"}
                className={`flex flex-col items-start gap-0.5 ${
                  n.read ? "" : "bg-accent/50"
                }`}
              >
                <span className="text-sm font-medium">{n.title}</span>
                {n.body && (
                  <span className="text-xs text-muted-foreground">{n.body}</span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {timeAgo(n.created_at)}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
