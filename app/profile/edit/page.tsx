import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateProfile, deleteAccount } from "../actions";

export const metadata = { title: "Edit profile — Hustl" };

type SearchParams = Promise<{ error?: string }>;

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, messenger_username, bio, skills")
    .eq("id", user.id)
    .single();

  return (
    <div className="py-10 space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Edit profile</h1>

      <form action={updateProfile} className="space-y-5">
        {error && (
          <p className="text-sm text-destructive border border-destructive/40 rounded-md p-3">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={profile?.full_name ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="messenger_username">Messenger username</Label>
          <Input
            id="messenger_username"
            name="messenger_username"
            placeholder="e.g. juan.delacruz (powers m.me/<username>)"
            defaultValue={profile?.messenger_username ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            Your Messenger handle from facebook.com/&lt;username&gt;. Buyers use
            this to contact you after an inquiry.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            rows={4}
            defaultValue={profile?.bio ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="skills">Skills (comma-separated)</Label>
          <Input
            id="skills"
            name="skills"
            placeholder="Figma, React, Tutoring"
            defaultValue={(profile?.skills ?? []).join(", ")}
          />
        </div>

        <Button type="submit">Save profile</Button>
      </form>

      <hr className="border-border" />

      <form action={deleteAccount} className="space-y-2">
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <p className="text-xs text-muted-foreground">
          Deletes your profile and all your gigs and orders. This cannot be
          undone.
        </p>
        <Button type="submit" variant="destructive" size="sm">
          Delete account
        </Button>
      </form>
    </div>
  );
}
