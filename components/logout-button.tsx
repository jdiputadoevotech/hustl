"use client";

import { logout } from "@/lib/logout";
import { Button, type ButtonProps } from "@/components/ui/button";

export function LogoutButton({ children = "Logout", ...props }: ButtonProps) {
  return (
    <Button onClick={logout} {...props}>
      {children}
    </Button>
  );
}
