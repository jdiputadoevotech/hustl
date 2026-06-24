import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectProps extends React.ComponentProps<"select"> {
  /** Applied to the relative wrapper. Use `w-fit` for content-width selects. */
  containerClassName?: string;
}

/**
 * Native select styled to match `Input`: same height, border, shadow, focus
 * ring, and `text-base md:text-sm` sizing (the 16px mobile size stops iOS from
 * zooming on focus). The chevron is a decorative overlay since native arrow
 * styling isn't reliable across browsers.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, ...props }, ref) => (
    <div className={cn("relative", containerClassName)}>
      <select
        ref={ref}
        className={cn(
          "flex h-9 w-full appearance-none rounded-md border border-input bg-transparent py-1 pl-3 pr-9 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
