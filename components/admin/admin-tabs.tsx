"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export interface AdminTab {
  key: string;
  label: string;
  count?: number;
}

/**
 * URL-param tab strip (?tab=). Reused by the Users and Jobs admin pages — the
 * app has no Tabs primitive, and query-param tabs keep each view server-rendered
 * and shareable. Switching a tab resets the search/other filters is intentional
 * only for `tab`; all other params are preserved.
 */
export function AdminTabs({
  tabs,
  current,
}: {
  tabs: AdminTab[];
  current: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const go = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", key);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex items-center gap-1 border-b">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => go(t.key)}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
            t.key === current
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
