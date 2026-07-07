"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Budget-style pill dropdown: filter gigs by a max price (₱). */
export function BudgetFilter({ max }: { max?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(max ?? "");

  // Radix DropdownMenu handles open coordination (only one filter open at a time)
  // via its shared dismissable layer.
  const push = (next: URLSearchParams) => {
    router.push(`/jobs?${next.toString()}`);
    setOpen(false);
  };

  const apply = () => {
    const next = new URLSearchParams(params.toString());
    if (value && Number(value) > 0) next.set("max", value);
    else next.delete("max");
    push(next);
  };

  const clear = () => {
    setValue("");
    const next = new URLSearchParams(params.toString());
    next.delete("max");
    push(next);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-accent focus:outline-none">
        {max ? `Up to ₱${max}` : "Budget"}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-4">
        <label htmlFor="budget-max" className="text-sm text-muted-foreground">
          Up to
        </label>
        <div className="relative mt-1.5">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ₱
          </span>
          <Input
            id="budget-max"
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              // Stop Radix menu typeahead; let Enter apply.
              e.stopPropagation();
              if (e.key === "Enter") apply();
            }}
            placeholder="Any"
            className="pl-7"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={clear}
            className="text-sm font-medium hover:underline"
          >
            Clear all
          </button>
          <Button type="button" size="sm" onClick={apply}>
            Apply
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
