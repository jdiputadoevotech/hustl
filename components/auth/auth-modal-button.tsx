"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useAuthModal } from "@/components/auth/auth-modal";

/**
 * Guest CTA that opens the auth modal instead of navigating to the login page.
 * Spreads ButtonProps, so use it anywhere a `<Button>` would go.
 */
export function AuthModalButton({
  view = "login",
  children,
  ...props
}: ButtonProps & { view?: "login" | "signup" }) {
  const { open } = useAuthModal();

  return (
    <Button onClick={() => open(view)} {...props}>
      {children}
    </Button>
  );
}
