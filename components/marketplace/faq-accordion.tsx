"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Faq } from "@/lib/types/database";

/** Public FAQ list on the job detail page. Multiple rows can be open at once. */
export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  if (faqs.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className="space-y-4">
      <h2 id="faq-heading" className="text-2xl font-bold">
        FAQ
      </h2>
      <ul className="divide-y border-t">
        {faqs.map((faq, i) => {
          const isOpen = open.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 py-4 text-left font-semibold text-foreground transition-colors hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {faq.question}
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {/* Slide: animate the row height via grid-template-rows 0fr→1fr,
                  no fixed/measured height needed. */}
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
                  <p className="max-w-[70ch] whitespace-pre-wrap pb-5 text-foreground/90">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
