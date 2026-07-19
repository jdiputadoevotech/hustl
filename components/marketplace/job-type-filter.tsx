"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JOB_TYPE_LABEL } from "@/components/marketplace/job-type-badge";
import type { JobType } from "@/lib/types/database";

const TYPES: JobType[] = ["gig", "part-time", "full-time"];

/** Pill dropdown that filters the board by job type. */
export function JobTypeFilter({ selected }: { selected?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const go = (type: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (type) next.set("type", type);
    else next.delete("type");
    next.delete("page"); // filtering invalidates the current offset
    router.push(`${pathname}?${next.toString()}`);
  };

  const label =
    selected && TYPES.includes(selected as JobType)
      ? JOB_TYPE_LABEL[selected as JobType]
      : "Job type";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-accent focus:outline-none">
        {label}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => go(null)}>All types</DropdownMenuItem>
        {TYPES.map((t) => (
          <DropdownMenuItem key={t} onClick={() => go(t)}>
            {JOB_TYPE_LABEL[t]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
