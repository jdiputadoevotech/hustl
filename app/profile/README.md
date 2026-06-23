# `app/profile/` — User profiles (planned)

Routes for the **Profiles** CRUD entity. Built in a later pass; placeholder for now.

Planned routes:
- `[id]/page.tsx` — public portfolio: full name, bio, skills, and the seller's
  gigs. Visible to anyone.
- `edit/page.tsx` — edit own bio, skills, and `messenger_username`
  (the Messenger handle powers the `m.me/<username>` contact handoff).
- Account deletion (Delete in CRUD) lives here too.

A profile row is auto-created at signup by the `handle_new_user` trigger, which
also sets `is_seller = (email ends with @usc.edu.ph)`. See SETUP.md.

Types: `import type { Profile } from "@/lib/types/database"`.
