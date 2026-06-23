import { cn } from "@/lib/utils";

const COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic colored circle with a person's initials. No image infra. */
export function AvatarInitials({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const safe = name?.trim() || "Carolinian";
  let hash = 0;
  for (let i = 0; i < safe.length; i++) hash = safe.charCodeAt(i) + hash * 31;
  const color = COLORS[Math.abs(hash) % COLORS.length];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full text-white font-medium select-none shrink-0",
        color,
        className ?? "h-6 w-6 text-[10px]",
      )}
      aria-hidden
    >
      {initials(safe)}
    </span>
  );
}
