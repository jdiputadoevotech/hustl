import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { ConfirmSubmit } from "@/components/marketplace/confirm-submit";
import { FormError } from "@/components/marketplace/form-error";
import { FormSection } from "@/components/marketplace/form-section";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Edit profile</h1>
        <p className="text-muted-foreground">
          This is what students and employers see when they view your profile.
        </p>
      </header>

      <form
        action={updateProfile}
        className="space-y-6"
        aria-describedby={error ? "profile-form-error" : undefined}
      >
        {error && <FormError id="profile-form-error">{error}</FormError>}

        <Card>
          <CardContent className="space-y-6 pt-6">
            <FormSection
              title="Identity"
              description="Your name as it appears across Hustl."
            >
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={profile?.full_name ?? ""}
                />
              </div>
            </FormSection>

            <FormSection
              title="Contact"
              description="How people reach you about a job."
            >
              <div className="space-y-2">
                <Label htmlFor="messenger_username">Messenger username</Label>
                <Input
                  id="messenger_username"
                  name="messenger_username"
                  placeholder="e.g. juan.delacruz (powers m.me/<username>)"
                  defaultValue={profile?.messenger_username ?? ""}
                />
                <p className="text-xs text-muted-foreground">
                  Your Messenger handle from facebook.com/&lt;username&gt;.
                  People use this to reach you after they message you about a
                  job.
                </p>
              </div>
            </FormSection>

            <FormSection
              title="About you"
              description="Give employers a sense of who you are."
            >
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
            </FormSection>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <SubmitButton>Save profile</SubmitButton>
          <Button asChild variant="ghost">
            <Link href={`/profile/${user.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>

      <Card className="border-destructive/30">
        <CardContent className="space-y-3 pt-6">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-destructive">
              Danger zone
            </h2>
            <p className="text-xs text-muted-foreground">
              Deletes your profile and all your jobs and contracts. This cannot
              be undone.
            </p>
          </div>
          <ConfirmSubmit
            action={deleteAccount}
            label="Delete account"
            confirmTitle="Delete your account?"
            confirmBody="This permanently deletes your profile and all your jobs and contracts. This cannot be undone."
            size="sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
