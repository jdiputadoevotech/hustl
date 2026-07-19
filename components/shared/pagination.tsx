"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Prev/next pager over ?page= (1-based), preserving every other param. Server
 * pages pair it with `.range()` — see `pageRange` in `lib/paging.ts`. Renders
 * nothing when everything fits on one page.
 */
export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const go = (n: number) => {
    const next = new URLSearchParams(params.toString());
    if (n > 1) next.set("page", String(n));
    else next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  };

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm tabular-nums text-muted-foreground">
        {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm tabular-nums text-muted-foreground">
          {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={page >= pages}
          onClick={() => go(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
