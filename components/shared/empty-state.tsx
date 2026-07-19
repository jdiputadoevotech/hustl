import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The one empty state. Every list that can be empty renders this instead of a
 * blank card, so "nothing here yet" and "nothing matched your filters" read the
 * same everywhere and always offer a way forward.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/60" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {body && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {body}
          </p>
        )}
      </div>
      {action && (
        <Button asChild size="sm" variant="outline" className="mt-1">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
