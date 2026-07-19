import { Inbox, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { SortDropdown } from "@/components/marketplace/sort-dropdown";
import { SearchInput } from "@/components/shared/search-input";
import { StatusFilter } from "@/components/shared/status-filter";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { pageRange } from "@/lib/paging";
import { ContractRow } from "./contract-row";
import { OfferForm } from "./offer-form";
import {
  CONTRACT_SELECT,
  CONTRACT_SORTS,
  CONTRACT_STATUSES,
  contractSearchFilter,
  isContractStatus,
  type ContractRowData,
} from "../_lib";

interface Params {
  q?: string;
  status?: string;
  sort?: string;
  page?: string;
  job?: string;
}

/**
 * The contract list, rendered for both roles: "Offers I've sent" (employer) and
 * "My offers & work" (student). Same data shape and same controls — only the
 * scoping column, the row perspective, and the employer's offer form differ.
 */
export async function ContractsTab({
  userId,
  perspective,
  params,
  returnTo,
}: {
  userId: string;
  perspective: "student" | "employer";
  params: Params;
  returnTo: string;
}) {
  const supabase = await createClient();
  const isEmployer = perspective === "employer";
  const ownerColumn = isEmployer ? "employer_id" : "student_id";
  const { q, status, sort } = params;
  const { page, from, to, size } = pageRange(params.page);

  // Employers get the offer form above the list, with the full job list for
  // the select and an optional preselection deep-linked from a job row.
  const myJobs = isEmployer
    ? ((
        await supabase
          .from("jobs")
          .select("id, title")
          .eq("employer_id", userId)
          .order("created_at", { ascending: false })
      ).data ?? [])
    : [];

  // Search spans the related job title and the other party's name, which
  // PostgREST can't OR across in one request — resolve ids first. A null
  // filter means nothing matched, so skip the list query entirely.
  const searchFilter = q
    ? await contractSearchFilter(supabase, q, {
        jobEmployerId: isEmployer ? userId : undefined,
        partyColumn: isEmployer ? "student_id" : "employer_id",
      })
    : "";

  let rows: ContractRowData[] = [];
  let total = 0;

  if (searchFilter !== null) {
    let query = supabase
      .from("contracts")
      .select(CONTRACT_SELECT, { count: "exact" })
      .eq(ownerColumn, userId)
      .order("created_at", { ascending: sort === "oldest" })
      .order("id", { ascending: false }) // stable tiebreak for paging
      .range(from, to);

    if (searchFilter) query = query.or(searchFilter);
    if (isContractStatus(status)) query = query.eq("status", status);

    const { data, count } = await query;
    rows = (data ?? []) as unknown as ContractRowData[];
    total = count ?? 0;
  }

  // Students can review a Completed contract — pull only this page's reviews.
  const reviewByContract = new Map<
    string,
    { rating: number; comment: string; archived: boolean }
  >();
  if (!isEmployer && rows.length) {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("contract_id, rating, comment, archived")
      .eq("reviewer_id", userId)
      .in(
        "contract_id",
        rows.map((r) => r.id),
      );
    for (const r of reviews ?? [])
      reviewByContract.set(r.contract_id, {
        rating: r.rating,
        comment: r.comment,
        archived: r.archived,
      });
  }

  const filtered = Boolean(q || status);
  const clearHref = `/dashboard?tab=${isEmployer ? "offers" : "work"}`;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {isEmployer && myJobs.length > 0 && (
          <OfferForm
            jobs={myJobs}
            preselectJobId={params.job}
            returnTo={returnTo}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            placeholder={
              isEmployer ? "Search job or student…" : "Search job or employer…"
            }
          />
          <SortDropdown selected={sort ?? "newest"} options={CONTRACT_SORTS} />
        </div>

        <StatusFilter
          options={CONTRACT_STATUSES}
          selected={isContractStatus(status) ? status : undefined}
          allLabel="All"
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={isEmployer ? Send : Inbox}
            title={
              filtered
                ? "Nothing matches these filters"
                : isEmployer
                  ? "No offers sent yet"
                  : "No offers yet"
            }
            body={
              filtered
                ? "Try a different search term, or clear the filters to see everything."
                : isEmployer
                  ? "Once a student messages you on Messenger and you agree on the work, send them an offer here."
                  : "Browse jobs and message employers on Messenger — offers you receive land here."
            }
            action={
              filtered
                ? { href: clearHref, label: "Clear filters" }
                : isEmployer
                  ? undefined
                  : { href: "/jobs", label: "Browse jobs" }
            }
          />
        ) : (
          <>
            <ul className="divide-y rounded-lg border">
              {rows.map((c) => (
                <ContractRow
                  key={c.id}
                  contract={c}
                  perspective={perspective}
                  review={reviewByContract.get(c.id)}
                  returnTo={returnTo}
                />
              ))}
            </ul>
            <Pagination page={page} pageSize={size} total={total} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
