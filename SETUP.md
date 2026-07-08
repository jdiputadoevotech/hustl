# Hustl — Local Setup Guide

Get Hustl running on your machine. Hustl is a USC **student job board** built on
**Next.js (App Router) + Supabase + Tailwind**. Employers post jobs (gig,
part-time, full-time); students browse, contact employers on Messenger, and get
hired through a contract workflow. This guide assumes no prior Supabase experience.

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

## 4. Database schema — Fresh Migration (SQL Editor)

This is the **single, all-in-one** schema script for the job-board model. It
safely **drops the old marketplace tables** (`gigs`, `orders`, old `reviews`) and
recreates everything fresh: `jobs`, `contracts`, `reviews`, all RLS policies, the
signup trigger, and the `jobs_with_employer` view.

> **Your auth users are NOT touched.** The script never drops `auth.users`, and it
> preserves the `profiles` table (it only drops a now-unused column). Existing
> logins keep working — you're only resetting the app tables.

**How to run the Fresh Migration:**
1. Open **Supabase → SQL Editor → New query**.
2. Paste the **entire** block below.
3. Click **Run**. It's idempotent — safe to re-run.

```sql
-- ============================================================
-- HUSTL — JOB BOARD SCHEMA (fresh migration)
-- ============================================================

-- 1. Drop old views + tables (CASCADE removes dependent objects/policies).
drop view  if exists public.gigs_with_ratings;
drop view  if exists public.jobs_with_employer;
drop table if exists public.saved_jobs cascade;
drop table if exists public.reviews   cascade;
drop table if exists public.orders    cascade;
drop table if exists public.gigs      cascade;
drop table if exists public.contracts cascade;
drop table if exists public.jobs      cascade;

-- ============================================================
-- PROFILES (preserved — one row per auth user; id = auth.users.id)
-- ============================================================
create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text,
  -- Account role. Everyone starts 'student'; the become-employer flow flips it
  -- to 'employer' (blocked for .edu emails). Only employers may post jobs
  -- (enforced by the jobs INSERT policy below + the server action).
  role               text not null default 'student'
                     check (role in ('student','employer','admin')),
  messenger_username text,            -- powers m.me/<username> contact handoff
  bio                text,
  skills             text[],
  -- Establishment: the poster's company (employer) or school (student). An
  -- employer with a blank establishment_name is an "independent" employer.
  establishment_name        text,
  establishment_description text,
  website_url               text,
  socials                   jsonb not null default '{}'::jsonb,  -- { facebook, instagram, linkedin }
  -- Student privacy: when true, non-parties see a placeholder instead of the
  -- student's contract history (enforced in the contracts SELECT policy).
  contracts_hidden   boolean not null default false,
  -- Admin moderation: archived users are hard-locked out (blocked at login and
  -- their live sessions killed) by the proxy. Only the service-role admin client
  -- may flip this (guarded by profiles_guard_admin_fields below).
  archived           boolean not null default false,
  -- Verification: 'none' -> 'pending' (user requests) -> 'verified'|'rejected'
  -- (admin decides). Only service role may set verified/rejected; the owner may
  -- only request (->pending) or withdraw (->none). Both enforced by the trigger.
  verification_status text not null default 'none'
                     check (verification_status in ('none','pending','verified','rejected')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- Drop the old marketplace-only column if it still exists.
alter table public.profiles drop column if exists is_seller;

-- ============================================================
-- JOBS — a posting by any authenticated user (the "employer")
-- ============================================================
create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  description text,
  job_type    text not null check (job_type in ('gig','part-time','full-time')),
  category    text,
  -- Flexible pay: a min–max range plus a period.
  --   gig        -> pay_period = 'project' (fixed project budget range)
  --   part/full  -> pay_period in ('hourly','weekly','monthly') (salary rate range)
  pay_min     numeric(10,2),
  pay_max     numeric(10,2),
  pay_period  text not null default 'project'
              check (pay_period in ('project','hourly','weekly','monthly')),
  -- Hiring detail surfaced on the job card.
  skills      text[] not null default '{}',  -- required skills, shown as badges
  location    text,                           -- free text, e.g. 'Manila', 'Campus'
  work_mode   text check (work_mode in ('on-site','remote','hybrid')),
  term        text,                           -- free-text duration, e.g. '3-4 days'
  is_urgent   boolean not null default false,
  faqs        jsonb not null default '[]'::jsonb,  -- [{ "question", "answer" }], max 10
  -- Public-visibility flag, set by the server. A job is listed (false) only when
  -- the owner Posts it with 2–10 valid FAQs; Saving a draft, or dropping below 2
  -- FAQs, keeps it hidden. Disabled jobs stay visible to their owner only.
  -- Defaults true so a freshly-added row (0 FAQs) starts hidden until it qualifies.
  is_disabled boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- CONTRACTS — the hiring lifecycle between employer + student for a job
--   Offered -> Accepted (student) | Declined (student)
--   Accepted -> Completed (employer) | Resigned (either party)
-- ============================================================
create table public.contracts (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs (id) on delete cascade,
  employer_id uuid not null references public.profiles (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'Offered'
              check (status in ('Offered','Accepted','Declined','Completed','Resigned')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (job_id, student_id)   -- one offer per student per job
);

-- ============================================================
-- REVIEWS — a student rates the EMPLOYER after a contract Completes
-- reviewer_id / contract_id are ON DELETE SET NULL (not cascade): when the
-- reviewing student deletes their account (or the contract is removed) the
-- review row SURVIVES so the employer's rating history stays intact. A null
-- reviewer_id renders as "Deleted user". A review about a deleted EMPLOYER
-- still cascade-deletes (employer_id), since their profile/rating is gone.
-- ============================================================
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts (id) on delete set null,
  employer_id uuid not null references public.profiles (id) on delete cascade, -- reviewee
  reviewer_id uuid references public.profiles (id) on delete set null, -- the student; null once they delete their account
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (contract_id)          -- one review per completed contract (nulls are distinct)
);

-- ============================================================
-- SAVED_JOBS — a student bookmarks a job to revisit later
-- ============================================================
create table public.saved_jobs (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  job_id      uuid not null references public.jobs (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (student_id, job_id)   -- a job is saved at most once per student
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles   enable row level security;
alter table public.jobs       enable row level security;
alter table public.contracts  enable row level security;
alter table public.reviews    enable row level security;
alter table public.saved_jobs enable row level security;

-- ---------- PROFILES ----------
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete using (auth.uid() = id);

-- Column guard: RLS can restrict WHICH rows a user updates but not WHICH columns,
-- so without this a user could self-set verification_status='verified' or
-- archived=false via the raw API. This BEFORE UPDATE trigger is NOT security
-- definer, so current_user reflects the caller: 'service_role' for the admin
-- client (bypasses RLS), 'authenticated' for a normal signed-in request.
--   * archived              -> only service_role may change it.
--   * verification_status   -> owner may only move to 'pending' or 'none';
--                              'verified'/'rejected' require service_role.
create or replace function public.profiles_guard_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'service_role' then
    return new;  -- admin client: unrestricted
  end if;
  if new.archived is distinct from old.archived then
    raise exception 'archived can only be changed by an administrator';
  end if;
  if new.verification_status is distinct from old.verification_status
     and new.verification_status not in ('pending','none') then
    raise exception 'verification_status can only be set to that value by an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_admin_fields on public.profiles;
create trigger profiles_guard_admin_fields
  before update on public.profiles
  for each row execute function public.profiles_guard_admin_fields();

-- ---------- JOBS ----------
drop policy if exists "Jobs are viewable by everyone" on public.jobs;
create policy "Jobs are viewable by everyone"
  on public.jobs for select using (true);

-- Only employers may post a job, as themselves.
drop policy if exists "Users can post jobs" on public.jobs;
create policy "Users can post jobs"
  on public.jobs for insert with check (
    employer_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'employer'
    )
  );

drop policy if exists "Employers can update their own jobs" on public.jobs;
create policy "Employers can update their own jobs"
  on public.jobs for update
  using (auth.uid() = employer_id) with check (auth.uid() = employer_id);

drop policy if exists "Employers can delete their own jobs" on public.jobs;
create policy "Employers can delete their own jobs"
  on public.jobs for delete using (auth.uid() = employer_id);

-- ---------- CONTRACTS ----------
-- The two parties always see a contract; everyone else may read a student's
-- contracts only when the student hasn't hidden them (public profile display).
drop policy if exists "Contracts visible to the parties" on public.contracts;
create policy "Contracts visible to the parties"
  on public.contracts for select
  using (
    auth.uid() = employer_id
    or auth.uid() = student_id
    or exists (
      select 1 from public.profiles p
      where p.id = contracts.student_id and p.contracts_hidden = false
    )
  );

-- Only the job's employer creates an offer, as themselves, in 'Offered' state.
drop policy if exists "Employers can offer contracts" on public.contracts;
create policy "Employers can offer contracts"
  on public.contracts for insert
  with check (
    employer_id = auth.uid()
    and status = 'Offered'
    and employer_id = (select j.employer_id from public.jobs j where j.id = job_id)
  );

-- Either party may update the row; the legal transition is enforced in the app.
drop policy if exists "Parties can update a contract" on public.contracts;
create policy "Parties can update a contract"
  on public.contracts for update
  using (auth.uid() = employer_id or auth.uid() = student_id)
  with check (auth.uid() = employer_id or auth.uid() = student_id);

-- ---------- REVIEWS ----------
drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone"
  on public.reviews for select using (true);

-- The student may review the employer only for a Completed contract of theirs.
drop policy if exists "Students can review completed employers" on public.reviews;
create policy "Students can review completed employers"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and c.student_id = auth.uid()
        and c.employer_id = reviews.employer_id
        and c.status = 'Completed'
    )
  );

drop policy if exists "Reviewers can update their own review" on public.reviews;
create policy "Reviewers can update their own review"
  on public.reviews for update
  using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());

drop policy if exists "Reviewers can delete their own review" on public.reviews;
create policy "Reviewers can delete their own review"
  on public.reviews for delete using (reviewer_id = auth.uid());

-- ---------- SAVED_JOBS ----------
-- Private to the owner: a student only ever sees/manages their own bookmarks.
drop policy if exists "Students can view their saved jobs" on public.saved_jobs;
create policy "Students can view their saved jobs"
  on public.saved_jobs for select using (auth.uid() = student_id);

-- Only a student may bookmark, as themselves.
drop policy if exists "Students can save jobs" on public.saved_jobs;
create policy "Students can save jobs"
  on public.saved_jobs for insert with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  );

drop policy if exists "Students can unsave their jobs" on public.saved_jobs;
create policy "Students can unsave their jobs"
  on public.saved_jobs for delete using (auth.uid() = student_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Default display name = signup full_name, else the email local-part.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: ensure existing auth users have a profile + a display name.
insert into public.profiles (id, full_name)
select u.id, split_part(u.email, '@', 1)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

update public.profiles p
set full_name = split_part(u.email, '@', 1)
from auth.users u
where p.id = u.id and (p.full_name is null or p.full_name = '');

-- ============================================================
-- HELPER: resolve a student's email to their user id (for sending offers).
-- SECURITY DEFINER reads auth.users; only signed-in users may call it.
-- ============================================================
create or replace function public.lookup_user_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;

revoke all on function public.lookup_user_by_email(text) from public, anon;
grant execute on function public.lookup_user_by_email(text) to authenticated;

-- ============================================================
-- VIEW: each job + employer name + employer's aggregate rating.
-- Read by the browse grid and profile job lists. Inherits table RLS.
-- ============================================================
create or replace view public.jobs_with_employer as
select
  j.*,
  p.full_name as employer_name,
  p.establishment_name as employer_establishment_name,
  p.verification_status as employer_verification_status,
  coalesce(round(avg(r.rating), 1), 0)::numeric(2, 1) as employer_rating_avg,
  count(r.id) as employer_rating_count
from public.jobs j
left join public.profiles p on p.id = j.employer_id
left join public.reviews  r on r.employer_id = j.employer_id
group by j.id, p.full_name, p.establishment_name, p.verification_status;
```

That's the whole schema — there is no separate Storage step (jobs have no images).

### Already ran the Fresh Migration? Add the new job columns

If your `jobs` table already exists (from an earlier run), paste this **idempotent**
block instead of recreating everything. It adds the hiring-detail columns and
refreshes the view so the new columns flow through.

```sql
alter table public.jobs add column if not exists skills    text[] not null default '{}';
alter table public.jobs add column if not exists location  text;
alter table public.jobs add column if not exists work_mode text
  check (work_mode in ('on-site','remote','hybrid'));
alter table public.jobs add column if not exists term      text;
alter table public.jobs add column if not exists company   text;
alter table public.jobs add column if not exists is_urgent boolean not null default false;
alter table public.jobs add column if not exists faqs        jsonb   not null default '[]'::jsonb;
-- default true => existing jobs (0 FAQs) hide until their owner adds 2+ FAQs.
-- Change to `default false` instead if you'd rather grandfather current jobs.
alter table public.jobs add column if not exists is_disabled boolean not null default true;

-- Recreate the view: it expands `j.*` at creation time, so it must be re-run
-- to pick up the new columns. Drop first — `create or replace` cannot change
-- column order, and the new `j.*` columns shift existing positions.
drop view if exists public.jobs_with_employer;
create view public.jobs_with_employer as
select
  j.*,
  p.full_name as employer_name,
  coalesce(round(avg(r.rating), 1), 0)::numeric(2, 1) as employer_rating_avg,
  count(r.id) as employer_rating_count
from public.jobs j
left join public.profiles p on p.id = j.employer_id
left join public.reviews  r on r.employer_id = j.employer_id
group by j.id, p.full_name;
```

### Already ran the Fresh Migration? Add the role column + slim down reviews

Adds `profiles.role` and drops the redundant `reviews.job_id` (it was always
derivable from `contract_id`, and no query reads it). Idempotent.

```sql
-- Account role: existing rows default to 'student'. RLS is unchanged.
alter table public.profiles
  add column if not exists role text not null default 'student'
  check (role in ('student','employer','admin'));

-- Drop the redundant, unread job_id from reviews (contract_id implies it).
alter table public.reviews drop column if exists job_id;
```

### Already ran the Fresh Migration? Move `company` onto profiles as an establishment

Moves the per-job `company` to a per-profile **establishment** (name +
description + website + socials), backfills each employer's most-recent non-blank
`company`, drops `jobs.company`, adds student contract-privacy, gates job posting
to employers, and opens contract reads for public student profiles. Idempotent.

```sql
-- 1. Establishment + privacy columns on profiles.
alter table public.profiles
  add column if not exists establishment_name        text,
  add column if not exists establishment_description text,
  add column if not exists website_url               text,
  add column if not exists socials                   jsonb not null default '{}'::jsonb,
  add column if not exists contracts_hidden          boolean not null default false;

-- 2. Drop the view first — its `j.*` depends on jobs.company, which blocks the
--    column drop below.
drop view if exists public.jobs_with_employer;

-- 3. Backfill establishment_name from each employer's latest non-blank company,
--    then drop jobs.company. Guarded so re-runs are safe once company is gone.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'company'
  ) then
    update public.profiles p
    set establishment_name = sub.company
    from (
      select distinct on (employer_id) employer_id, company
      from public.jobs
      where company is not null and btrim(company) <> ''
      order by employer_id, created_at desc
    ) sub
    where p.id = sub.employer_id
      and (p.establishment_name is null or btrim(p.establishment_name) = '');

    alter table public.jobs drop column company;
  end if;
end $$;

-- 4. Recreate the view exposing employer_establishment_name.
create view public.jobs_with_employer as
select
  j.*,
  p.full_name as employer_name,
  p.establishment_name as employer_establishment_name,
  coalesce(round(avg(r.rating), 1), 0)::numeric(2, 1) as employer_rating_avg,
  count(r.id) as employer_rating_count
from public.jobs j
left join public.profiles p on p.id = j.employer_id
left join public.reviews  r on r.employer_id = j.employer_id
group by j.id, p.full_name, p.establishment_name;

-- 5. Only employers may post a job.
drop policy if exists "Users can post jobs" on public.jobs;
create policy "Users can post jobs"
  on public.jobs for insert with check (
    employer_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'employer'
    )
  );

-- 6. Contracts: parties always; others only when the student hasn't hidden them.
drop policy if exists "Contracts visible to the parties" on public.contracts;
create policy "Contracts visible to the parties"
  on public.contracts for select
  using (
    auth.uid() = employer_id
    or auth.uid() = student_id
    or exists (
      select 1 from public.profiles p
      where p.id = contracts.student_id and p.contracts_hidden = false
    )
  );
```

### Already ran the Fresh Migration? Add admin moderation + verification

Adds `profiles.archived` (hard lockout) and `profiles.verification_status`, the
column-guard trigger that stops users self-elevating those fields, and refreshes
the view to expose `employer_verification_status` for the job-card badge.
Idempotent.

```sql
alter table public.profiles
  add column if not exists archived boolean not null default false,
  add column if not exists verification_status text not null default 'none'
    check (verification_status in ('none','pending','verified','rejected'));

-- Column guard: only the service-role admin client may set archived, or set
-- verification_status to verified/rejected. Owners may only request (->pending)
-- or withdraw (->none). Not security-definer, so current_user is the caller.
create or replace function public.profiles_guard_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'service_role' then
    return new;
  end if;
  if new.archived is distinct from old.archived then
    raise exception 'archived can only be changed by an administrator';
  end if;
  if new.verification_status is distinct from old.verification_status
     and new.verification_status not in ('pending','none') then
    raise exception 'verification_status can only be set to that value by an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_admin_fields on public.profiles;
create trigger profiles_guard_admin_fields
  before update on public.profiles
  for each row execute function public.profiles_guard_admin_fields();

-- Recreate the view to add employer_verification_status (drop first: `j.*`
-- positions shift and create-or-replace can't reorder columns).
drop view if exists public.jobs_with_employer;
create view public.jobs_with_employer as
select
  j.*,
  p.full_name as employer_name,
  p.establishment_name as employer_establishment_name,
  p.verification_status as employer_verification_status,
  coalesce(round(avg(r.rating), 1), 0)::numeric(2, 1) as employer_rating_avg,
  count(r.id) as employer_rating_count
from public.jobs j
left join public.profiles p on p.id = j.employer_id
left join public.reviews  r on r.employer_id = j.employer_id
group by j.id, p.full_name, p.establishment_name, p.verification_status;
```

### Already ran the Fresh Migration? Add the `saved_jobs` bookmarks table

Adds the student bookmark table + its owner-only RLS (insert gated to
`role = 'student'`). Idempotent.

```sql
create table if not exists public.saved_jobs (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  job_id      uuid not null references public.jobs (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (student_id, job_id)
);

alter table public.saved_jobs enable row level security;

drop policy if exists "Students can view their saved jobs" on public.saved_jobs;
create policy "Students can view their saved jobs"
  on public.saved_jobs for select using (auth.uid() = student_id);

drop policy if exists "Students can save jobs" on public.saved_jobs;
create policy "Students can save jobs"
  on public.saved_jobs for insert with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student'
    )
  );

drop policy if exists "Students can unsave their jobs" on public.saved_jobs;
create policy "Students can unsave their jobs"
  on public.saved_jobs for delete using (auth.uid() = student_id);
```

### Already ran the Fresh Migration? Preserve reviews when a reviewer deletes

Keeps an employer's rating history intact after the reviewing student deletes
their account: the review detaches instead of cascade-deleting. `reviewer_id`
and `contract_id` become nullable + `ON DELETE SET NULL`; a null reviewer renders
as "Deleted user". Idempotent.

```sql
alter table public.reviews alter column reviewer_id drop not null;
alter table public.reviews alter column contract_id drop not null;

alter table public.reviews drop constraint if exists reviews_reviewer_id_fkey;
alter table public.reviews
  add constraint reviews_reviewer_id_fkey
  foreign key (reviewer_id) references public.profiles (id) on delete set null;

alter table public.reviews drop constraint if exists reviews_contract_id_fkey;
alter table public.reviews
  add constraint reviews_contract_id_fkey
  foreign key (contract_id) references public.contracts (id) on delete set null;
```

---

## 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000. Use **Sign up** to create an account — **any email
works** (no domain restriction). Every user can both post jobs (as an employer)
and get hired (as a student).

> First run with placeholder/empty Supabase keys will still render the UI, but
> auth and data calls fail until Steps 2–4 are complete.

---

## Project structure (quick map)

```
app/
  auth/         template auth flow (login, sign-up, reset)
  jobs/         job board: browse, detail, post, edit
  contracts/    server actions for the hiring lifecycle
  dashboard/    employer + student hiring views
  profile/      public profiles + edit
components/
  ui/           shadcn primitives (from template)
  marketplace/  shared job UI (cards, badges, filters, reviews)
lib/
  supabase/     client.ts / server.ts / proxy.ts (do not duplicate)
  types/        database.ts — shared Profile/Job/Contract/Review types
  pay.ts        formatPay() helper
  categories.ts job categories
```

See `DEPLOYMENT.md` to ship to production on Vercel.
