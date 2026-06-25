import type { ReactNode } from "react";

/** A labeled group of fields inside a form card. Dividers between groups. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-x-10 gap-y-4 border-t border-border pt-8 first:border-t-0 first:pt-0 md:grid-cols-[minmax(180px,260px)_1fr]">
      <div className="space-y-0.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
