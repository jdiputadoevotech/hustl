import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GIG_CATEGORIES } from "@/lib/categories";
import type { Gig } from "@/lib/types/database";

interface GigFormProps {
  action: (formData: FormData) => void | Promise<void>;
  gig?: Pick<Gig, "title" | "description" | "price" | "category" | "image_url">;
  submitLabel: string;
  error?: string;
}

/** Shared create/edit form. Server-rendered; posts to a server action. */
export function GigForm({ action, gig, submitLabel, error }: GigFormProps) {
  return (
    <form action={action} className="space-y-5 max-w-xl">
      {error && (
        <p className="text-sm text-destructive border border-destructive/40 rounded-md p-3">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          defaultValue={gig?.title}
          placeholder="I will design your org's poster"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          defaultValue={gig?.category ?? ""}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">Select a category</option>
          {GIG_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Price (PHP)</Label>
        <Input
          id="price"
          name="price"
          type="number"
          min={0}
          step="1"
          required
          defaultValue={gig?.price}
          placeholder="500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={gig?.description ?? ""}
          placeholder="Describe what you offer, turnaround time, and what you need from the buyer."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Cover image {gig && "(leave empty to keep current)"}</Label>
        <Input id="image" name="image" type="file" accept="image/*" />
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
