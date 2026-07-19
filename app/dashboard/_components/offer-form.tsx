import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { offerContract } from "@/app/contracts/actions";

/**
 * Converts a Messenger conversation into a contract. Hustl has no apply flow by
 * design — students reach out first — so the employer identifies the student by
 * the email they gave. `preselectJobId` lets a job row deep-link straight here.
 */
export function OfferForm({
  jobs,
  preselectJobId,
  returnTo,
}: {
  jobs: { id: string; title: string }[];
  preselectJobId?: string;
  returnTo: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="space-y-1">
        <h2 className="font-semibold">Send an offer</h2>
        <p className="text-sm text-muted-foreground">
          Hired someone after chatting on Messenger? Send them an offer using the
          email they gave you.
        </p>
      </div>
      <form
        action={offerContract}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="space-y-1.5">
          <Label htmlFor="job_id">Job</Label>
          <select
            id="job_id"
            name="job_id"
            required
            defaultValue={preselectJobId}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="student_email">Student email</Label>
          <Input
            id="student_email"
            name="student_email"
            type="email"
            required
            placeholder="student@example.com"
          />
        </div>
        <SubmitButton>Send offer</SubmitButton>
      </form>
    </div>
  );
}
