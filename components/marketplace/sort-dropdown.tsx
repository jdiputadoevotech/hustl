"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

/** "Sort by: <label>" dropdown (Fiverr-style, text trigger). */
export function SortDropdown({ selected }: { selected: SortValue }) {
  const router = useRouter();
  const params = useSearchParams();

  const current =
    SORT_OPTIONS.find((o) => o.value === selected) ?? SORT_OPTIONS[0];

  const go = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("sort", value);
    router.push(`/jobs?${next.toString()}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-sm focus:outline-none">
        <span className="text-muted-foreground">Sort by:</span>
        <span className="font-semibold">{current.label}</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SORT_OPTIONS.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => go(o.value)}>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
