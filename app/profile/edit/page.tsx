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

type SearchParams = Promise<{ error?: string; upgrade?: string }>;

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, upgrade } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, role, messenger_username, bio, skills, establishment_name, establishment_description, website_url, socials, contracts_hidden",
    )
    .eq("id", user.id)
    .single();

  // Upgrade flow: student clicked "Become an employer". Already an employer →
  // ignore the flag (nothing to upgrade).
  const upgrading = upgrade === "1" && profile?.role !== "employer";
  const isEmployer = profile?.role === "employer" || upgrading;
  const socials = (profile?.socials ?? {}) as {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  const estLabel = isEmployer ? "Company" : "School";

  return (
    <div className="space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">
          {upgrading ? "Become an employer" : "Edit profile"}
        </h1>
        <p className="text-muted-foreground">
          {upgrading
            ? "Add a Messenger username and describe your establishment so students can reach you. Then you can post jobs."
            : "This is what students and employers see when they view your profile."}
        </p>
      </header>

      <form
        action={updateProfile}
        className="space-y-6"
        aria-describedby={error ? "profile-form-error" : undefined}
      >
        {error && <FormError id="profile-form-error">{error}</FormError>}
        {upgrading && <input type="hidden" name="upgrade" value="1" />}

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
                <Label htmlFor="messenger_username">
                  Messenger username{upgrading && " *"}
                </Label>
                <Input
                  id="messenger_username"
                  name="messenger_username"
                  required={upgrading}
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
              title="Establishment"
              description={`Your ${estLabel.toLowerCase()} — name, description, and links. Employers with no name post as an independent.`}
            >
              <div className="space-y-2">
                <Label htmlFor="establishment_name">{estLabel} name</Label>
                <Input
                  id="establishment_name"
                  name="establishment_name"
                  maxLength={120}
                  defaultValue={profile?.establishment_name ?? ""}
                  placeholder={
                    isEmployer ? "BrightLeaf Studio" : "University of San Carlos"
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="establishment_description">
                  Description{upgrading && " *"}
                </Label>
                <Textarea
                  id="establishment_description"
                  name="establishment_description"
                  rows={3}
                  required={upgrading}
                  defaultValue={profile?.establishment_description ?? ""}
                  placeholder="What your establishment does, or the kind of work you offer."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  name="website_url"
                  type="url"
                  defaultValue={profile?.website_url ?? ""}
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="social_facebook">Facebook</Label>
                  <Input
                    id="social_facebook"
                    name="social_facebook"
                    type="url"
                    defaultValue={socials.facebook ?? ""}
                    placeholder="https://facebook.com/…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_instagram">Instagram</Label>
                  <Input
                    id="social_instagram"
                    name="social_instagram"
                    type="url"
                    defaultValue={socials.instagram ?? ""}
                    placeholder="https://instagram.com/…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_linkedin">LinkedIn</Label>
                  <Input
                    id="social_linkedin"
                    name="social_linkedin"
                    type="url"
                    defaultValue={socials.linkedin ?? ""}
                    placeholder="https://linkedin.com/…"
                  />
                </div>
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

            <FormSection
              title="Privacy"
              description="Control what shows on your public profile."
            >
              <label
                htmlFor="contracts_hidden"
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-3 transition-colors hover:bg-accent/50"
              >
                <input
                  id="contracts_hidden"
                  name="contracts_hidden"
                  type="checkbox"
                  defaultChecked={profile?.contracts_hidden ?? false}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">
                    Hide my contracts
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Visitors see a “hidden” note instead of your contract
                    history.
                  </span>
                </span>
              </label>
            </FormSection>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <SubmitButton>
            {upgrading ? "Become an employer" : "Save profile"}
          </SubmitButton>
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
              Deletes your profile, jobs, and contracts. Reviews you wrote stay
              up as &ldquo;Deleted user.&rdquo; This cannot be undone.
            </p>
          </div>
          <ConfirmSubmit
            action={deleteAccount}
            label="Delete account"
            confirmTitle="Delete your account?"
            confirmBody="This permanently deletes your profile, your job posts, and your contracts. Reviews you've written stay visible but show as from a deleted user. You can't delete while you have active or pending contracts. This cannot be undone."
            size="sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
