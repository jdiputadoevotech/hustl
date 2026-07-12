"use client";

import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/components/auth/auth-modal";

/** Signed-out navbar actions that open the auth modal instead of navigating. */
export function AuthTriggerButtons() {
  const { open } = useAuthModal();

  return (
    <>
      <button
        type="button"
        onClick={() => open("login")}
        className="text-base font-medium text-foreground/80 hover:text-foreground"
      >
        Sign in
      </button>
      <Button size="lg" onClick={() => open("signup")}>
        Join
      </Button>
    </>
  );
}
