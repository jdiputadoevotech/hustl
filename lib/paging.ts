/** Dense row lists (dashboard, admin) and review lists. */
export const PAGE_SIZE = 10;

/** Card grids — 24 fills six clean rows at the xl 4-column breakpoint. */
export const GRID_PAGE_SIZE = 24;

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
