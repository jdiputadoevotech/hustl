"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  embedded = false,
  onNavigate,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  /** Render without the Card chrome (for use inside the auth modal). */
  embedded?: boolean;
  /** In modal context, switch view instead of navigating away. */
  onNavigate?: (view: "login") => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      if (embedded) {
        // Modal context: show the confirmation notice inline instead of
        // navigating to the standalone success page.
        setSuccess(true);
      } else {
        router.push("/auth/sign-up-success");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const successPanel = (
    <div className="flex flex-col gap-2 text-center">
      <h2 className="text-2xl font-semibold">Check your email</h2>
      <p className="text-sm text-muted-foreground">
        We&apos;ve sent a confirmation link to <strong>{email}</strong>. Click it
        to activate your account, then come back and log in.
      </p>
    </div>
  );

  const body = (
    <form onSubmit={handleSignUp}>
      <div className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="repeat-password">Repeat Password</Label>
          </div>
          <Input
            id="repeat-password"
            type="password"
            required
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating an account..." : "Sign up"}
        </Button>
      </div>
      <div className="mt-4 text-center text-sm">
        Already have an account?{" "}
        {onNavigate ? (
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="underline underline-offset-4"
          >
            Login
          </button>
        ) : (
          <Link href="/auth/login" className="underline underline-offset-4">
            Login
          </Link>
        )}
      </div>
    </form>
  );

  if (embedded) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        {success ? (
          successPanel
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-semibold">Join Hustl</h2>
              <p className="text-sm text-muted-foreground">
                Create a new account
              </p>
            </div>
            {body}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    </div>
  );
}
