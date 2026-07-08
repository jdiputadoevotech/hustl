"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS = [
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "none", label: "Unverified" },
] as const;

/** Pill dropdown that filters the users table by verification status (?verification=). */
export function VerificationFilter({ selected }: { selected?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const go = (value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("verification", value);
    else next.delete("verification");
    router.push(`${pathname}?${next.toString()}`);
  };

  const label =
    OPTIONS.find((o) => o.value === selected)?.label ?? "Verification";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-accent focus:outline-none">
        {label}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => go(null)}>All statuses</DropdownMenuItem>
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => go(o.value)}>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
