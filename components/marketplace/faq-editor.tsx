"use client";

import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Faq } from "@/lib/types/database";

const MAX_FAQS = 10;

/**
 * Controlled FAQ editor. The parent <JobForm> owns the list so it can validate
 * on Post; this serializes the value to a hidden input as JSON so the form
 * action picks it up via FormData (same pattern as the `skills` field).
 * `invalid` flips the styling red after a failed Post attempt.
 */
export function FaqEditor({
  value,
  onChange,
  invalid,
}: {
  value: Faq[];
  onChange: (faqs: Faq[]) => void;
  invalid?: boolean;
}) {
  const update = (i: number, patch: Partial<Faq>) =>
    onChange(value.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const add = () =>
    value.length >= MAX_FAQS
      ? undefined
      : onChange([...value, { question: "", answer: "" }]);

  return (
    <div
      className={cn(
        "space-y-4 rounded-lg p-3 transition-colors",
        invalid
          ? "border border-destructive bg-destructive/5"
          : "border border-transparent",
      )}
    >
      <input type="hidden" name="faqs" value={JSON.stringify(value)} />

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No FAQs yet. Add at least 2 so this job can be posted.
        </p>
      )}

      {value.map((faq, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-input p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`faq-q-${i}`} className="text-xs">
              FAQ {i + 1}
            </Label>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`Remove FAQ ${i + 1}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Input
            id={`faq-q-${i}`}
            value={faq.question}
            maxLength={200}
            onChange={(e) => update(i, { question: e.target.value })}
            placeholder="Question, e.g. What do I need to get started?"
          />
          <Textarea
            value={faq.answer}
            rows={3}
            onChange={(e) => update(i, { answer: e.target.value })}
            placeholder="Answer"
          />
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={value.length >= MAX_FAQS}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add FAQ
        </Button>
        <span
          className={cn(
            "text-xs",
            invalid ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {value.length}/{MAX_FAQS} · need 2+ to post
        </span>
      </div>
    </div>
  );
}
