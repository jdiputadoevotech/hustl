# `components/marketplace/` — Shared gig UI (planned)

Reusable presentational components for the marketplace, built in a later pass.
Kept separate from the template's `components/ui/` (shadcn primitives).

Planned:
- `gig-card.tsx` — Fiverr-style summary card: thumbnail, title, seller, price,
  CTA. Used in the browse grid and profile pages.
- `order-status-badge.tsx` — colored badge per `OrderStatus`.
- `inquire-button.tsx` — creates a `Pending` order then redirects to
  `m.me/<messenger_username>`.

Build on the existing shadcn primitives in `components/ui/` and `@/lib/utils`.
