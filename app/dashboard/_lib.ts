import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContractStatus, JobType, PayPeriod } from "@/lib/types/database";
import type { StatusOption } from "@/components/shared/status-filter";
import type { SortOption } from "@/components/marketplace/sort-dropdown";

/** Tabs, resolved per role. `overview` is the default for both. */
export const EMPLOYER_TABS = ["overview", "jobs", "offers", "reviews"] as const;
export const STUDENT_TABS = ["overview", "work", "reviews"] as const;
export type DashboardTab =
  | (typeof EMPLOYER_TABS)[number]
  | (typeof STUDENT_TABS)[number];

export function resolveTab(tab: string | undefined, isEmployer: boolean) {
  const allowed: readonly string[] = isEmployer ? EMPLOYER_TABS : STUDENT_TABS;
  return (allowed.includes(tab ?? "") ? tab : "overview") as DashboardTab;
}

/** Labels match ContractStatusBadge, which renders the raw status. */
export const CONTRACT_STATUSES: StatusOption[] = (
  ["Offered", "Accepted", "Completed", "Declined", "Resigned"] as ContractStatus[]
).map((value) => ({ value, label: value }));

export const isContractStatus = (v: string | undefined): v is ContractStatus =>
  CONTRACT_STATUSES.some((s) => s.value === v);

export const CONTRACT_SORTS: SortOption[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

export const JOB_SORTS: SortOption[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title (A–Z)" },
];

/** Shared row shapes. Embeds stay `unknown` — see `one()`. */
export type Named = { id: string; full_name: string | null } | null;
export type JobRef = { id: string; title: string } | null;

export interface ContractRowData {
  id: string;
  status: ContractStatus;
  created_at: string;
  job: unknown;
  student?: unknown;
  employer?: unknown;
}

export interface JobRowData {
  id: string;
  title: string;
  category: string;
  job_type: JobType;
  pay_min: number | null;
  pay_max: number | null;
  pay_period: PayPeriod;
  is_disabled: boolean;
  created_at: string;
}

export const CONTRACT_SELECT =
  "id, status, created_at, job:jobs ( id, title ), student:profiles!contracts_student_id_fkey ( id, full_name ), employer:profiles!contracts_employer_id_fkey ( id, full_name )";

export const JOB_SELECT =
  "id, title, category, job_type, pay_min, pay_max, pay_period, is_disabled, created_at";

/**
 * Supabase returns a to-one embed as an object or a 1-element array depending
 * on how it infers the relationship. Normalize both, and null when absent
 * (the job or the other party's account was deleted).
 */
export function one<T>(v: unknown): T | null {
  return (Array.isArray(v) ? (v[0] ?? null) : (v ?? null)) as T | null;
}

/**
 * Contract search runs over the *related* job title and party name, which
 * PostgREST can't OR across in a single request. Resolve the matching ids
 * first, then filter contracts by them. Returns null when nothing matched, so
 * callers can skip the contracts query and render an empty list.
 */
export async function contractSearchFilter(
  supabase: SupabaseClient,
  q: string,
  opts: {
    /** Scope the job-title match to one employer's posts (employer view). */
    jobEmployerId?: string;
    /** Which side of the contract the name match applies to. */
    partyColumn: "student_id" | "employer_id";
  },
): Promise<string | null> {
  const like = `%${q}%`;

  let jobQuery = supabase.from("jobs").select("id").ilike("title", like).limit(200);
  if (opts.jobEmployerId) jobQuery = jobQuery.eq("employer_id", opts.jobEmployerId);

  const [{ data: jobs }, { data: parties }] = await Promise.all([
    jobQuery,
    supabase.from("profiles").select("id").ilike("full_name", like).limit(200),
  ]);

  const clauses: string[] = [];
  if (jobs?.length) clauses.push(`job_id.in.(${jobs.map((j) => j.id).join(",")})`);
  if (parties?.length)
    clauses.push(`${opts.partyColumn}.in.(${parties.map((p) => p.id).join(",")})`);

  return clauses.length ? clauses.join(",") : null;
}
