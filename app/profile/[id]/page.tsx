import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, bio, skills, messenger_username")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  // Jobs this user has posted (as an employer).
  const { data: jobs } = await supabase
    .from("jobs_with_employer")
    .select(
      "id, title, category, job_type, pay_min, pay_max, pay_period, employer_name, employer_rating_avg, employer_rating_count",
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">
            {profile.full_name ?? "Hustler"}
          </h1>
          <StarRating average={rAvg} count={rCount} />
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
          {profile.messenger_username && (
            <a
              href={`https://m.me/${profile.messenger_username}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline block"
            >
              Message on Messenger
            </a>
          )}
        </div>
        {isOwner && (
          <Button asChild variant="outline" size="sm">
            <Link href="/profile/edit">Edit profile</Link>
          </Button>
        )}
      </div>

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
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Employer reviews</h2>
          <StarRating average={rAvg} count={rCount} />
        </div>
        <ReviewList reviews={reviews} />
      </section>
    </div>
  );
}
