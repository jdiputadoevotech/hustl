"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "pay", label: "Highest pay" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export interface SortOption {
  value: string;
  label: string;
}

/**
 * "Sort by: <label>" dropdown (Fiverr-style, text trigger). Defaults to the
 * marketplace options; pass `options` for lists that sort on other fields
 * (the dashboard uses newest/oldest/title).
 */
export function SortDropdown({
  selected,
  options = SORT_OPTIONS as readonly SortOption[],
}: {
  selected: string;
  options?: readonly SortOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const current = options.find((o) => o.value === selected) ?? options[0];

  const go = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("sort", value);
    next.delete("page"); // a new order invalidates the current offset
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-sm focus:outline-none">
        <span className="text-muted-foreground">Sort by:</span>
        <span className="font-semibold">{current.label}</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => go(o.value)}>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
