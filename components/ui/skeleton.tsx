import { cn } from "@/lib/utils";

/** Placeholder block for loading.tsx screens. Pulses only when motion is allowed. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted motion-safe:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}
