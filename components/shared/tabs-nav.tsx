"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

/** Params that describe a list *within* a tab, so they don't leak across tabs. */
const LIST_PARAMS = ["q", "status", "type", "category", "sort", "page", "job"];

/**
 * URL-param tab strip (?tab=). Used by the admin pages and the dashboard — the
 * app has no Tabs primitive, and query-param tabs keep each view server-rendered
 * and shareable. Switching tabs clears the list params (search/filter/sort/page)
 * because they mean different things per tab; anything else is preserved.
 */
export function TabsNav({
  tabs,
  current,
}: {
  tabs: TabItem[];
  current: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const go = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", key);
    for (const p of LIST_PARAMS) next.delete(p);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    // No overflow-x-auto here: setting overflow on one axis computes the other
    // to `auto`, and the buttons' -mb-px overlap then triggers a stray vertical
    // scrollbar. Few enough tabs to wrap instead.
    <div className="flex flex-wrap items-center gap-1 border-b">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => go(t.key)}
          aria-current={t.key === current ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            t.key === current
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                t.key === current
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
