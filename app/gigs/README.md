# `app/gigs/` — Marketplace listings (planned)

Routes for the **Gigs** CRUD entity. Built in a later pass; this folder is a
placeholder so the architecture is visible now.

Planned routes:
- `page.tsx` — browse / search the marketplace (Fiverr-style gig card grid).
- `[id]/page.tsx` — gig detail + "Inquire" CTA (creates a `Pending` order, then
  hands off to the seller's Facebook Messenger via `m.me/<messenger_username>`).
- `new/page.tsx` — post a gig. Seller-only; gated to `@usc.edu.ph` by the
  Carolinian RLS policy (see SETUP.md). Includes image upload to the
  `gig-images` Storage bucket.
- `[id]/edit/page.tsx` — modify price / description (owner only).

Types: `import type { Gig } from "@/lib/types/database"`.
Data access: `@/lib/supabase/server` (server components) or `client` (client components).
