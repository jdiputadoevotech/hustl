import { cn } from "@/lib/utils";

interface FormErrorProps {
  /** Wire to the form's `aria-describedby` so the error is announced. */
  id?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Inline form-level error banner. `role="alert"` so screen readers announce it
 * when a server action redirects back with a failure.
 */
export function FormError({ id, className, children }: FormErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "rounded-md border border-destructive/40 p-3 text-sm text-destructive",
        className,
      )}
    >
      {children}
    </p>
  );
}
