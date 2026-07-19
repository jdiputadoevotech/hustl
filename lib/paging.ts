export const PAGE_SIZE = 10;

/**
 * Turn a `?page=` search param into a Supabase `.range(from, to)` pair.
 * Garbage ("0", "-3", "abc") falls back to page 1 rather than erroring — the
 * value comes straight off the URL, so it can be anything.
 */
export function pageRange(page: string | undefined, size = PAGE_SIZE) {
  const n = Math.max(1, Math.floor(Number(page)) || 1);
  const from = (n - 1) * size;
  return { page: n, from, to: from + size - 1, size };
}
