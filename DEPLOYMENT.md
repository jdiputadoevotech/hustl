# Hustl — Production Deployment Guide

Ship Hustl to production with **Vercel** (hosting + CI/CD) and **Supabase**
(database + auth). Both have free tiers; total cost is $0.

Prerequisite: you have completed `SETUP.md` and the app runs locally.

---

## 1. Push the repository to GitHub

```bash
git add .
git commit -m "Initial Hustl scaffold"
git branch -M main
git remote add origin https://github.com/<you>/hustl.git
git push -u origin main
```

> `.env.local` is git-ignored — your keys never get committed. You will set them
> in Vercel instead (Step 3).

---

## 2. Import the project into Vercel (CI/CD)

1. Go to https://vercel.com → sign in with GitHub.
2. **Add New… → Project** → select your `hustl` repository → **Import**.
3. Vercel auto-detects **Next.js** — leave the build settings at their defaults
   (Build Command `next build`, Output handled automatically).
4. **Do not deploy yet** — first add the environment variables (Step 3), then
   deploy.

After this, every `git push` to `main` triggers an automatic production
deployment, and pushes to other branches get preview deployments.

---

## 3. Configure environment variables in Vercel

In the Vercel project: **Settings → Environment Variables**. Add both, scoped to
**Production** (and Preview/Development if you want previews to work):

| Name                                   | Value                                   |
| -------------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | your Supabase Project URL               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your Supabase anon / publishable key    |

> These must match the variable names the code reads (`lib/supabase/client.ts`,
> `server.ts`). Using the legacy name `NEXT_PUBLIC_SUPABASE_ANON_KEY` will leave
> the client unconfigured and the app will fail to authenticate.

Then trigger a deploy: **Deployments → Redeploy**, or push a commit. Note your
production domain, e.g. `https://hustl.vercel.app`.

---

## 4. Point Supabase Auth at the production domain

By default Supabase redirects auth callbacks (email confirmation, password
reset) to `http://localhost:3000`. Update this so production auth works.

In **Supabase → Authentication → URL Configuration**:

1. **Site URL** → set to your Vercel domain, e.g. `https://hustl.vercel.app`.
2. **Redirect URLs** → add (keep localhost for local dev):
   ```
   https://hustl.vercel.app/**
   http://localhost:3000/**
   ```
   If you use Vercel preview deployments, also add your preview wildcard, e.g.
   `https://*-<your-team>.vercel.app/**`.

Click **Save**. Email confirmation and password-reset links now route back to
the live site instead of localhost.

---

## 5. Post-deploy smoke test

1. Visit the production URL.
2. **Sign up** with an `@usc.edu.ph` email → confirm via the emailed link →
   verify it redirects to the production domain (not localhost).
3. Confirm the session persists (refresh the page while logged in).
4. Sign up with a non-USC email and confirm it works as a client account.

---

## Notes

- **Schema changes:** run new SQL in the Supabase **SQL Editor** for the same
  project Vercel points at. There is one shared database across local and prod
  unless you create separate Supabase projects per environment.
- **Custom domain:** add it under Vercel **Settings → Domains**, then add that
  URL to the Supabase Site URL / Redirect URLs above.
- **Free-tier note:** Supabase pauses a free project after ~1 week of
  inactivity; open the dashboard to resume it.
