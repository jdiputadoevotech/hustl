"use client";

import { useState } from "react";
import { GraduationCap, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/marketplace/submit-button";
import { FormError } from "@/components/marketplace/form-error";
import { LogoutButton } from "@/components/logout-button";
import { completeOnboarding } from "@/app/onboarding/actions";
import type { Socials } from "@/lib/types/database";

type Role = "student" | "employer";

const ROLES: {
  value: Role;
  title: string;
  blurb: string;
  Icon: typeof GraduationCap;
}[] = [
  {
    value: "student",
    title: "I'm here to work",
    blurb: "Browse gigs and get hired by employers.",
    Icon: GraduationCap,
  },
  {
    value: "employer",
    title: "I'm here to hire",
    blurb: "Post jobs and hire students for your work.",
    Icon: Briefcase,
  },
];

export type OnboardingDefaults = {
  full_name: string;
  messenger_username: string;
  establishment_name: string;
  establishment_description: string;
  bio: string;
  skills: string;
  socials: Socials;
};

/**
 * Post-signup setup. Non-.edu users pick student/employer first; .edu users are
 * auto-students (`canEmploy` false) and go straight to the fields, no picker.
 * The establishment field is the user's school (student, required) or company
 * (employer, optional); employers additionally describe what they do. The server
 * action re-validates — the hidden role input below is not trusted.
 */
export function OnboardingFlow({
  error,
  canEmploy,
  defaults,
}: {
  error?: string;
  canEmploy: boolean;
  defaults: OnboardingDefaults;
}) {
  const [role, setRole] = useState<Role | null>(canEmploy ? null : "student");
  const isEmployer = role === "employer";

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12">
      <div className="flex justify-end">
        <LogoutButton variant="ghost" size="sm" className="text-muted-foreground">
          Sign out
        </LogoutButton>
      </div>

      <header className="space-y-2 text-center">
        <p className="text-2xl font-bold">
          Welcome to Hustl<span className="text-green-500">.</span>
        </p>
        <h1 className="text-xl font-semibold">
          {canEmploy ? "How will you use Hustl?" : "Finish setting up your account"}
        </h1>
        <p className="text-muted-foreground">
          {canEmploy
            ? "Pick one to set up your account. You can change this later."
            : "A few details so employers can find and reach you. You can change these later."}
        </p>
      </header>

      <form action={completeOnboarding} className="space-y-6">
        {error && <FormError id="onboarding-error">{error}</FormError>}
        <input type="hidden" name="role" value={role ?? ""} />

        {canEmploy && (
          <div className="grid gap-4 sm:grid-cols-2">
            {ROLES.map(({ value, title, blurb, Icon }) => {
              const selected = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col items-start gap-3 rounded-xl border bg-card p-6 text-left shadow-sm transition-colors hover:bg-accent/50",
                    selected
                      ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 dark:bg-emerald-950/20"
                      : "border-input",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-7",
                      selected
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="space-y-1">
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-sm text-muted-foreground">
                      {blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {role && (
          <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="full_name">What should we call you? *</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                defaultValue={defaults.full_name}
                placeholder="Juan dela Cruz"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="messenger_username">Messenger username *</Label>
              <Input
                id="messenger_username"
                name="messenger_username"
                required
                defaultValue={defaults.messenger_username}
                placeholder="e.g. juan.delacruz (powers m.me/<username>)"
              />
              <p className="text-xs text-muted-foreground">
                Your Messenger handle from facebook.com/&lt;username&gt; — how
                people reach you about a job.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="establishment_name">
                {isEmployer ? "Company name" : "School name *"}
              </Label>
              <Input
                id="establishment_name"
                name="establishment_name"
                maxLength={120}
                required={!isEmployer}
                defaultValue={defaults.establishment_name}
                placeholder={
                  isEmployer
                    ? "BrightLeaf Studio (optional — blank posts as independent)"
                    : "University of San Carlos"
                }
              />
              {!isEmployer && (
                <p className="text-xs text-muted-foreground">
                  The school you attend — used to verify you as a student.
                </p>
              )}
            </div>

            {isEmployer && (
              <div className="space-y-2">
                <Label htmlFor="establishment_description">
                  What do you do? *
                </Label>
                <Textarea
                  id="establishment_description"
                  name="establishment_description"
                  rows={3}
                  required
                  defaultValue={defaults.establishment_description}
                  placeholder="What your establishment does, or the kind of work you offer."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                rows={4}
                defaultValue={defaults.bio}
                placeholder="A little about you (optional)."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                name="skills"
                defaultValue={defaults.skills}
                placeholder="Figma, React, Tutoring (comma-separated, optional)"
              />
            </div>

            <div className="space-y-2">
              <Label>Socials</Label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  name="social_facebook"
                  type="url"
                  aria-label="Facebook URL"
                  defaultValue={defaults.socials.facebook ?? ""}
                  placeholder="Facebook"
                />
                <Input
                  name="social_instagram"
                  type="url"
                  aria-label="Instagram URL"
                  defaultValue={defaults.socials.instagram ?? ""}
                  placeholder="Instagram"
                />
                <Input
                  name="social_linkedin"
                  type="url"
                  aria-label="LinkedIn URL"
                  defaultValue={defaults.socials.linkedin ?? ""}
                  placeholder="LinkedIn"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Optional — full profile links.
              </p>
            </div>

            <SubmitButton className="w-full">
              {isEmployer ? "Start hiring" : "Start finding work"}
            </SubmitButton>
          </div>
        )}
      </form>
    </div>
  );
}
