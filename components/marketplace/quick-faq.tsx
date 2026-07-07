"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Faq } from "@/lib/types/database";

/**
 * Compact FAQ preview for the job sidebar. Shows the first two FAQs; the first
 * is open by default. "See all FAQs" jumps to the full accordion (#faq-heading).
 */
export function QuickFaq({ faqs }: { faqs: Faq[] }) {
  const preview = faqs.slice(0, 2);
  const [open, setOpen] = useState<Set<number>>(new Set([0]));

  if (preview.length === 0) return null;

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Quick FAQ
      </p>
      <ul className="divide-y">
        {preview.map((faq, i) => {
          const isOpen = open.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {faq.question}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300 ease-out",
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
                aria-hidden={!isOpen}
              >
                <div className="overflow-hidden">
                  <p className="whitespace-pre-wrap pb-3 text-sm text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {faqs.length > preview.length && (
        <a
          href="#faq-heading"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          See all FAQs ›
        </a>
      )}
    </div>
  );
}
