# `app/dashboard/` — Order management (planned)

Routes for the **Orders** CRUD entity. Built in a later pass; placeholder for now.

Planned routes:
- `page.tsx` — lists the signed-in user's orders. Two views:
  - As **client**: orders I placed (read status).
  - As **seller**: orders on my gigs, with controls to advance state
    `Pending → In Progress → Completed` or `Cancelled`.

State transitions are seller-only and enforced by RLS (see SETUP.md). The app
changes order **status** only — payments are P2P off-platform (GCash / cash).

Types: `import type { Order, OrderStatus } from "@/lib/types/database"`.
