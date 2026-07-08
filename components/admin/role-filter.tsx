"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLES = [
  { value: "student", label: "Students" },
  { value: "employer", label: "Employers" },
] as const;

/** Pill dropdown that filters the users table by role (?role=). */
export function RoleFilter({ selected }: { selected?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const go = (role: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (role) next.set("role", role);
    else next.delete("role");
    router.push(`${pathname}?${next.toString()}`);
  };

  const label = ROLES.find((r) => r.value === selected)?.label ?? "Role";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-accent focus:outline-none">
        {label}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => go(null)}>All roles</DropdownMenuItem>
        {ROLES.map((r) => (
          <DropdownMenuItem key={r.value} onClick={() => go(r.value)}>
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
