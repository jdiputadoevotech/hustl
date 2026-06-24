import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarInitials } from "@/components/marketplace/avatar-initials";
import { JobCard } from "@/components/marketplace/job-card";
import { StarRating } from "@/components/marketplace/star-rating";
import {
  ReviewList,
  type ReviewItem,
} from "@/components/marketplace/review-list";

type Params = Promise<{ id: string }>;

export default async function ProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, bio, skills, messenger_username")
    .eq("id", id)
    .maybeSingle();

  if (profileError) throw profileError; // real failure → error boundary, not a fake 404
  if (!profile) notFound(); // genuinely missing → 404

  // Jobs this user has posted (as an employer).
  const { data: jobs } = await supabase
    .from("jobs_with_employer")
    .select(
      "id, title, category, job_type, pay_min, pay_max, pay_period, skills, location, work_mode, term, company, is_urgent, created_at, employer_name, employer_rating_avg, employer_rating_count",
    )
    .eq("employer_id", id)
    .order("created_at", { ascending: false });

  // Reviews this user received as an employer.
  const { data: reviewsRaw } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, profiles:reviewer_id ( full_name )")
    .eq("employer_id", id)
    .order("created_at", { ascending: false });

  const reviews: ReviewItem[] = (reviewsRaw ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    reviewer_name:
      (r.profiles as unknown as { full_name: string | null } | null)
        ?.full_name ?? null,
  }));
  const rCount = reviews.length;
  const rAvg =
    rCount > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / rCount : 0;

  const user = await getCurrentUser();
  const isOwner = user?.id === profile.id;

  return (
    <div className="py-8 space-y-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4 sm:gap-5 min-w-0">
          <AvatarInitials
            name={profile.full_name}
            className="h-16 w-16 sm:h-20 sm:w-20 text-xl sm:text-2xl"
          />
          <div className="space-y-3 min-w-0">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {profile.full_name ?? "Carolinian"}
              </h1>
              <StarRating average={rAvg} count={rCount} />
            </div>
            {profile.bio && (
              <p className="text-muted-foreground max-w-2xl whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}
            {profile.skills && profile.skills.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {profile.skills.map((s: string) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contextual primary action: visitors message, owner edits. */}
        {isOwner ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0 self-start"
          >
            <Link href="/profile/edit">Edit profile</Link>
          </Button>
        ) : profile.messenger_username ? (
          <Button
            asChild
            size="lg"
            className="shrink-0 gap-2 w-full sm:w-auto"
          >
            <a
              href={`https://m.me/${profile.messenger_username}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              Message on Messenger
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </Button>
        ) : null}
      </header>

      {/* Jobs posted */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Posted jobs</h2>
        {!jobs || jobs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No jobs posted yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </section>

      {/* Reviews received as an employer */}
      <section className="space-y-4 max-w-3xl">
        <h2 className="text-lg font-semibold">
          Employer reviews
          {rCount > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {rCount}
            </span>
          )}
        </h2>
        <ReviewList reviews={reviews} />
      </section>
    </div>
  );
}
