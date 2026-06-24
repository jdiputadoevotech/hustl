"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { SubmitButton } from "@/components/marketplace/submit-button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmSubmitProps {
  /** Bound server action to run once the user confirms. */
  action: () => void;
  /** Text on the trigger button shown in the list. */
  label: string;
  confirmTitle: string;
  confirmBody: string;
  /** Text on the confirming button inside the dialog. Defaults to `label`. */
  confirmLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

/**
 * Guards a destructive server action behind a confirmation dialog. The form
 * lives inside the (portaled) dialog content so the confirm button's pending
 * spinner stays visible while the action runs.
 */
export function ConfirmSubmit({
  action,
  label,
  confirmTitle,
  confirmBody,
  confirmLabel,
  variant = "destructive",
  size,
}: ConfirmSubmitProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} size={size}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{confirmBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <form action={action}>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <SubmitButton variant={variant}>
              {confirmLabel ?? label}
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
