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

export function LoginForm({
  className,
  embedded = false,
  onNavigate,
  onSuccess,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  /** Render without the Card chrome (for use inside the auth modal). */
  embedded?: boolean;
  /** In modal context, switch view instead of navigating away. */
  onNavigate?: (view: "signup") => void;
  /** In modal context, called after a successful login (close + refresh). */
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // The user already has an active session.
      if (onSuccess) {
        // Modal context: stay on the current page, let the caller close +
        // refresh so the server Navbar re-renders with the new auth cookies.
        onSuccess();
      } else {
        router.push("/dashboard");
      }
      router.refresh(); // re-render server components (Navbar) with new auth cookies
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const body = (
    <form onSubmit={handleLogin}>
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
            <Link
              href="/auth/forgot-password"
              className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </div>
      <div className="mt-4 text-center text-sm">
        Don&apos;t have an account?{" "}
        {onNavigate ? (
          <button
            type="button"
            onClick={() => onNavigate("signup")}
            className="underline underline-offset-4"
          >
            Sign up
          </button>
        ) : (
          <Link href="/auth/sign-up" className="underline underline-offset-4">
            Sign up
          </Link>
        )}
      </div>
      <div className="mt-2 text-center text-sm text-muted-foreground">
        Didn&apos;t get a confirmation email?{" "}
        <Link
          href="/auth/resend-confirmation"
          className="underline underline-offset-4"
        >
          Resend
        </Link>
      </div>
    </form>
  );

  if (embedded) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="text-sm text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    </div>
  );
}
