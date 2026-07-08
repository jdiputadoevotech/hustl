"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Search box that writes ?q= on submit, preserving the current tab/filters.
 * Server pages read `q` and filter their query. Submit-based (not per-keystroke)
 * to avoid a request per character.
 */
export function AdminSearch({ placeholder = "Search…" }: { placeholder?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    const next = new URLSearchParams(params.toString());
    const value = String(q ?? "").trim();
    if (value) next.set("q", value);
    else next.delete("q");
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        defaultValue={params.get("q") ?? ""}
        placeholder={placeholder}
        className="pl-9"
      />
    </form>
  );
}
