"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export interface StatusOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Pill row over ?status=. A row (not a dropdown) because status is the primary
 * axis on the contract lists — the options double as a summary of what's there.
 * Resets ?page= on change, since a new filter invalidates the old offset.
 */
export function StatusFilter({
  options,
  selected,
  allLabel = "All",
}: {
  options: StatusOption[];
  selected?: string;
  allLabel?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const go = (value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("status", value);
    else next.delete("status");
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  };

  const pill = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
      active
        ? "border-foreground bg-foreground text-background"
        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => go(null)} className={pill(!selected)}>
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => go(o.value)}
          className={pill(selected === o.value)}
        >
          {o.label}
          {typeof o.count === "number" && (
            <span className="ml-1.5 tabular-nums opacity-70">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
