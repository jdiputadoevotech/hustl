import Link from "next/link";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { ContractStatusBadge } from "@/components/marketplace/contract-status-badge";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { ReviewForm } from "@/components/marketplace/review-form";
import { timeAgo } from "@/lib/time";
import {
  acceptOffer,
  declineOffer,
  completeContract,
  resignContract,
} from "@/app/contracts/actions";
import { one, type ContractRowData, type JobRef, type Named } from "../_lib";

/**
 * One contract, from either side. The student and employer lists render the
 * same row — `perspective` picks which party is named and which transitions
 * are offered. `returnTo` carries the current tab/filter through the server
 * action redirect so acting on a row doesn't dump the user back on Overview.
 */
export function ContractRow({
  contract,
  perspective,
  review,
  returnTo,
}: {
  contract: ContractRowData;
  perspective: "student" | "employer";
  review?: { rating: number; comment: string; archived: boolean } | null;
  returnTo: string;
}) {
  const job = one<NonNullable<JobRef>>(contract.job);
  const asStudent = perspective === "student";
  const party = one<NonNullable<Named>>(
    asStudent ? contract.employer : contract.student,
  );
  const partyFallback = asStudent ? "an employer" : "a student";
  const { status } = contract;
  const jobLabel = job?.title ?? "this job";

  return (
    <li className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <AvatarInitials
            name={party?.full_name}
            className="h-9 w-9 text-xs"
          />
          <div className="min-w-0">
            {job ? (
              <Link
                href={`/jobs/${job.id}`}
                className="font-medium hover:underline"
              >
                {job.title}
              </Link>
            ) : (
              <span className="font-medium text-muted-foreground">
                Removed job
              </span>
            )}
            <p className="text-xs text-muted-foreground">
              {asStudent ? "from" : "to"}{" "}
              {party ? (
                <Link href={`/profile/${party.id}`} className="underline">
                  {party.full_name ?? partyFallback}
                </Link>
              ) : (
                partyFallback
              )}{" "}
              · {timeAgo(contract.created_at)}
            </p>
          </div>
        </div>
        <ContractStatusBadge status={status} />
      </div>

      {asStudent && status === "Offered" && (
        <div className="flex gap-2">
          <form action={acceptOffer.bind(null, contract.id)}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <SubmitButton size="sm">Accept</SubmitButton>
          </form>
          <ConfirmSubmit
            action={declineOffer.bind(null, contract.id)}
            label="Decline"
            variant="outline"
            size="sm"
            confirmTitle="Decline this offer?"
            confirmBody={`This permanently declines the offer for "${jobLabel}". The employer will need to send a new one.`}
            confirmLabel="Decline offer"
          >
            <input type="hidden" name="returnTo" value={returnTo} />
          </ConfirmSubmit>
        </div>
      )}

      {status === "Accepted" && (
        <div className="flex gap-2">
          {!asStudent && (
            <form action={completeContract.bind(null, contract.id)}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <SubmitButton size="sm">Mark completed</SubmitButton>
            </form>
          )}
          <ConfirmSubmit
            action={resignContract.bind(null, contract.id)}
            label="End contract"
            size="sm"
            confirmTitle="End this contract?"
            confirmBody={
              asStudent
                ? `This ends your contract for "${jobLabel}" and can't be undone.`
                : `This ends the contract for "${jobLabel}" with ${party?.full_name ?? "this student"} and can't be undone.`
            }
            confirmLabel="End contract"
          >
            <input type="hidden" name="returnTo" value={returnTo} />
          </ConfirmSubmit>
        </div>
      )}

      {asStudent &&
        status === "Completed" &&
        (review?.archived ? (
          <p className="text-xs text-muted-foreground">
            Your review was removed by a moderator.
          </p>
        ) : (
          <ReviewForm
            contractId={contract.id}
            existing={review ?? null}
            redirectTo={returnTo}
          />
        ))}
    </li>
  );
}
