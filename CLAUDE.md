# CLAUDE.md

Guidance for Claude Code when working in this repo.

## Project
Hustl — a USC student **job board** (Next.js App Router + Supabase + Tailwind).
Employers post jobs (gig / part-time / full-time); students browse, contact
employers on Messenger, and get hired through a `contracts` lifecycle. Students
review employers once a contract is `Completed`. No domain restrictions — any
authenticated user can post or be hired.

Tables: `profiles`, `jobs`, `contracts`, `reviews`, plus the `jobs_with_employer`
view. The canonical schema lives in `SETUP.md` (Section 4 — Fresh Migration).

## Database migration rules (IMPORTANT)

The Supabase database is managed by hand through the SQL Editor — there is no
automated migration runner. So whenever a change touches the database schema
(new/changed table, column, RLS policy, function, trigger, or view):

1. **Always update `SETUP.md` first.** Keep the Section 4 "Fresh Migration"
   block the single source of truth — it must always reflect the current full
   schema so a clean clone + paste reproduces the live database exactly. Do NOT
   leave schema changes only in code or chat.

2. **After completing the implementation, output a copy-pastable SQL command**
   that updates an *existing* database to the new schema — the incremental
   migration the user runs in the Supabase SQL Editor. This is separate from the
   full Fresh Migration: give only the delta (e.g. `alter table ... add column`,
   `create policy ...`, `drop policy ... / create policy ...`), written to be
   idempotent and safe to re-run (`if exists` / `if not exists`,
   `create or replace`, `drop policy if exists` before `create policy`).

   Present it in a fenced ```sql block at the end of the response so the user can
   paste it straight into the SQL Editor.

3. Remember `public.profiles` ≠ `auth.users`. Never instruct dropping profiles to
   "reset a user" — deleting an account is done in Auth → Users (cascades to
   profiles). Schema resets preserve `profiles`/auth.

## Conventions
- Server mutations are server actions in `app/<area>/actions.ts` (`"use server"`;
  every export must be an `async function`).
- Data access via `@/lib/supabase/server` (server) or `client` (client). Don't
  duplicate the Supabase client setup.
- Shared types in `@/lib/types/database.ts`; reuse them, don't redeclare shapes.
- RLS is the real authority; server actions also re-check role/status for clear
  errors. Keep both in sync with `SETUP.md`.
- After changes, run `npx tsc --noEmit` and `npx eslint app components lib`.
  Note `npm run lint` scans `node_modules` (template quirk) — scope to the dirs.
