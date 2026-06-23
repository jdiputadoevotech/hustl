import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GigCard } from "@/components/marketplace/gig-card";

type Params = Promise<{ id: string }>;

export default async function ProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, bio, skills, messenger_username, is_seller")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const { data: gigs } = await supabase
    .from("gigs")
    .select("id, title, price, category, image_url")
    .eq("student_id", id)
    .order("created_at", { ascending: false });

  const user = await getCurrentUser();
  const isOwner = user?.id === profile.id;

  return (
    <div className="py-8 space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {profile.full_name ?? "Carolinian"}
            </h1>
            {profile.is_seller && <Badge variant="secondary">Seller</Badge>}
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
          {profile.messenger_username && (
            <a
              href={`https://m.me/${profile.messenger_username}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline"
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

      {profile.is_seller && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Gigs</h2>
          {!gigs || gigs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No gigs yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {gigs.map((g) => (
                <GigCard key={g.id} gig={g} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
