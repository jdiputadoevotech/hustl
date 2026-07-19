"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { GIG_CATEGORIES } from "@/lib/categories";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Budget-style pill dropdown that filters the marketplace by category. */
export function CategoryFilter({ selected }: { selected?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const go = (category: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (category) next.set("category", category);
    else next.delete("category");
    next.delete("page"); // filtering invalidates the current offset
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-accent focus:outline-none">
        {selected || "Category"}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuItem
          onClick={() => go(null)}
          className="flex flex-col items-start gap-0.5"
        >
          <span className="font-medium">All categories</span>
          <span className="text-xs text-muted-foreground">
            Browse every gig on Hustl.
          </span>
        </DropdownMenuItem>
        {GIG_CATEGORIES.map((c) => (
          <DropdownMenuItem
            key={c.name}
            onClick={() => go(c.name)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="font-medium">{c.name}</span>
            <span className="text-xs text-muted-foreground">
              {c.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
