# Hustl — Local Setup Guide

Get Hustl running on your machine. Hustl is a USC student gig marketplace built
on **Next.js (App Router) + Supabase + Tailwind**. This guide assumes no prior
Supabase experience.

## Prerequisites

- **Node.js 18.18+** (Node 20 LTS or newer recommended) — check with `node -v`
- **npm** (ships with Node) — check with `npm -v`
- A **Supabase** account (free) — https://supabase.com
- **git**

---

## 1. Clone and install

```bash
git clone <your-repo-url> hustl
cd hustl
npm install
```

---

## 2. Create a Supabase project and get your keys

1. Go to https://supabase.com → sign in → **New project**.
2. Pick an organization, name the project (e.g. `hustl`), set a strong database
   password (save it), choose the region closest to Cebu (e.g. Singapore),
   click **Create new project**. Wait ~2 minutes for provisioning.
3. Open **Project Settings → API**. Copy these two values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API Keys → `anon` / `publishable`** key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

> **Key naming note.** Supabase renamed the public `anon` key to the
> **publishable** key. They are the same value. This codebase reads
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `lib/supabase/client.ts` and
> `server.ts`), so use that variable name. If you see older docs referring to
> `NEXT_PUBLIC_SUPABASE_ANON_KEY`, it means this same key.

Both keys are safe to expose in the browser — row-level security (Step 4)
protects your data.

---

## 3. Configure `.env.local`

Create a file named `.env.local` in the project root (it is git-ignored):

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
```

There is a `.env.example` in the repo you can copy from.

---

## 4. Set up the database schema (SQL Editor)

Open **Supabase → SQL Editor → New query**, paste the entire block below, and
click **Run**. It creates the three tables, enables Row Level Security, defines
the access policies, and adds a trigger that auto-creates a profile on signup.

```sql
-- ============================================================
-- HUSTL SCHEMA
-- ============================================================

-- ---------- PROFILES ----------
-- One row per auth user. id matches auth.users.id.
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text,
  messenger_username text,            -- powers m.me/<username> contact handoff
  bio                text,
  skills             text[],
  is_seller          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- GIGS ----------
-- A service listing owned by a student seller.
create table public.gigs (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  description text,
  price       numeric(10,2) not null default 0,
  category    text,
  image_url   text,                   -- object in the gig-images Storage bucket
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- ORDERS ----------
-- A transaction inquiry. App tracks status only; payment is P2P off-platform.
create table public.orders (
  id         uuid primary key default gen_random_uuid(),
  gig_id     uuid not null references public.gigs (id) on delete cascade,
  client_id  uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'Pending'
             check (status in ('Pending','In Progress','Completed','Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.gigs     enable row level security;
alter table public.orders   enable row level security;

-- ---------- PROFILES policies ----------
-- Public portfolios are readable by anyone.
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- A user can update only their own profile.
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- A user can delete only their own profile (account deletion).
create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- ---------- GIGS policies ----------
-- Anyone can browse the marketplace.
create policy "Gigs are viewable by everyone"
  on public.gigs for select
  using (true);

-- Only verified Carolinians (@usc.edu.ph) may post gigs, and only as themselves.
create policy "Allow gig creation only for Carolinians"
  on public.gigs for insert
  with check (
    auth.jwt() ->> 'email' like '%@usc.edu.ph'
    and student_id = auth.uid()
  );

-- A seller can edit only their own gigs.
create policy "Sellers can update their own gigs"
  on public.gigs for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- A seller can delete only their own gigs.
create policy "Sellers can delete their own gigs"
  on public.gigs for delete
  using (auth.uid() = student_id);

-- ---------- ORDERS policies ----------
-- Readable by the client who placed it and by the seller who owns the gig.
create policy "Orders visible to client and gig owner"
  on public.orders for select
  using (
    auth.uid() = client_id
    or auth.uid() = (select student_id from public.gigs where gigs.id = orders.gig_id)
  );

-- Any authenticated user can place an order, as themselves.
create policy "Clients can create their own orders"
  on public.orders for insert
  with check (auth.uid() = client_id);

-- Only the seller who owns the gig can advance the order status.
create policy "Sellers can update orders on their gigs"
  on public.orders for update
  using (
    auth.uid() = (select student_id from public.gigs where gigs.id = orders.gig_id)
  )
  with check (
    auth.uid() = (select student_id from public.gigs where gigs.id = orders.gig_id)
  );

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Sets is_seller = true when the email is @usc.edu.ph.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, is_seller)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    (new.email like '%@usc.edu.ph')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### Reviews & ratings

Run this block too — it adds the `reviews` table, its RLS policies, and a
`gigs_with_ratings` view used by the marketplace cards to show the average
star rating without loading every review.

```sql
-- ---------- REVIEWS ----------
-- One 1-5 star review per (gig, reviewer). Only buyers who ordered the gig
-- may insert (enforced below). Reviewers can edit/delete their own.
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  gig_id      uuid not null references public.gigs (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (gig_id, reviewer_id)
);

alter table public.reviews enable row level security;

-- Anyone can read reviews.
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

-- Only a buyer who has an order on the gig may post, and only as themselves.
create policy "Buyers who ordered can review"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.gig_id = reviews.gig_id
        and o.client_id = auth.uid()
    )
  );

-- Reviewers can edit their own review.
create policy "Reviewers can update their own review"
  on public.reviews for update
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

-- Reviewers can delete their own review.
create policy "Reviewers can delete their own review"
  on public.reviews for delete
  using (reviewer_id = auth.uid());

-- ---------- RATINGS VIEW ----------
-- Each gig + seller name + aggregated rating. Read by the browse grid and
-- profile gig lists. Inherits the underlying tables' RLS (reviews/gigs are
-- publicly readable), so no extra policy is required.
create or replace view public.gigs_with_ratings as
select
  g.*,
  p.full_name as seller_name,
  coalesce(round(avg(r.rating), 1), 0)::numeric(2, 1) as rating_avg,
  count(r.id) as rating_count
from public.gigs g
left join public.profiles p on p.id = g.student_id
left join public.reviews  r on r.gig_id = g.id
group by g.id, p.full_name;
```

---

## 5. Set up Storage for gig images

Gig images are uploaded to a Supabase **Storage** bucket.

1. **Supabase → Storage → New bucket.** Name it `gig-images`. Toggle
   **Public bucket** ON (so images render without signed URLs). Create.
2. Open **SQL Editor** and run the policies below so the public can view images
   and only verified Carolinians can upload/manage them:

```sql
-- Public read of gig images.
create policy "Public read of gig images"
  on storage.objects for select
  using (bucket_id = 'gig-images');

-- Only @usc.edu.ph sellers may upload.
create policy "Carolinians can upload gig images"
  on storage.objects for insert
  with check (
    bucket_id = 'gig-images'
    and auth.jwt() ->> 'email' like '%@usc.edu.ph'
  );

-- Sellers may update/replace their own uploaded objects.
create policy "Owners can update gig images"
  on storage.objects for update
  using (bucket_id = 'gig-images' and owner = auth.uid());

-- Sellers may delete their own uploaded objects.
create policy "Owners can delete gig images"
  on storage.objects for delete
  using (bucket_id = 'gig-images' and owner = auth.uid());
```

---

## 6. Run the app

```bash
npm run dev
```

Open http://localhost:3000. Use **Sign up** to create an account:
- Sign up with an `@usc.edu.ph` email to act as a **seller** (can post gigs).
- Sign up with any other email (e.g. `@gmail.com`) to act as a **client**
  (browse, message, place orders).

> First run with placeholder/empty Supabase keys will still render the UI, but
> auth and data calls fail until Steps 2–4 are complete.

---

## Project structure (quick map)

```
app/
  auth/            template auth flow (login, sign-up, reset)
  protected/       example gated page
  gigs/            marketplace listings        (planned — see README)
  dashboard/       order management            (planned — see README)
  profile/         public portfolios + edit    (planned — see README)
components/
  ui/              shadcn primitives (from template)
  marketplace/     shared gig UI               (planned — see README)
lib/
  supabase/        client.ts / server.ts / proxy.ts (do not duplicate)
  types/           database.ts — shared Profile/Gig/Order types
```

See `DEPLOYMENT.md` to ship to production on Vercel.
