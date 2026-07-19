"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Search box that writes ?q= on submit, preserving the current tab/filters and
 * resetting ?page= (a new query invalidates the old offset). Server pages read
 * `q` and filter their query. Submit-based (not per-keystroke) to avoid a
 * request per character.
 */
export function SearchInput({
  placeholder = "Search…",
}: {
  placeholder?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const active = params.get("q") ?? "";

  const push = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("q", value);
    else next.delete("q");
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    push(String(new FormData(e.currentTarget).get("q") ?? "").trim());
  };

  return (
    <form onSubmit={onSubmit} className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        // Remount on change so the box reflects a query cleared elsewhere.
        key={active}
        name="q"
        defaultValue={active}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {active && (
        <button
          type="button"
          onClick={() => push("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
