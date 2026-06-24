# Product

## Register

product

## Users

University of San Carlos (USC, Cebu) students and the people who hire them.
Two sides of one marketplace:

- **Students** browsing for income — gigs, part-time, or full-time work — between
  or around classes. Often on mobile, often on limited data, deciding fast
  whether a posting is worth a Messenger message. They need to trust the
  employer before reaching out.
- **Employers** (other students, local businesses, individuals — no domain
  restriction) posting work and hiring through a `contracts` lifecycle. They want
  a posting to look credible and attract the right people quickly.

The job to be done: get from "I need work / I need someone" to a real
connection (contact on Messenger, hire tracked here, review after `Completed`)
with as little friction and as much trust as possible.

## Product Purpose

Hustl is a campus job board for Carolinians. Employers post jobs; students
browse, filter, contact employers on Messenger, and get hired through a tracked
contract lifecycle. Once a contract is `Completed`, students review the employer,
building the reputation signal the next student relies on.

Success looks like: a student finds a relevant, trustworthy posting and reaches
out within a session; an employer's posting attracts qualified applicants; the
review loop keeps the marketplace honest over time. The product wins by making
trust legible and the path to contact short.

## Brand Personality

Energetic, trustworthy, fast.

Voice is student-native and action-first — "Browse jobs", "Post a job", "Join",
not corporate HR-speak. Confident and warm, never stiff. The energy comes from
momentum and clarity (you always know the next step), not from hype or noise.
Trust is earned visually: ratings, reviews, real names, and clear contract status
do the talking. Emotionally the interface should feel like a sharp, reliable
campus tool a student is glad exists — quick to scan, safe to act on.

## Anti-references

This should NOT look or feel like:

- **Corporate job boards (Indeed / LinkedIn).** No stiff, grey, enterprise
  HR-portal density or jargon. Hustl is for students, not recruiters.
- **Crypto / startup hype.** No neon gradients, glassmorphism, gradient text, or
  hype-deck aesthetics. Energy without the snake oil.
- **Generic AI SaaS.** Avoid the saturated template: cream/warm-near-white body
  bg, tiny tracked-uppercase eyebrows over every section, identical icon-card
  grids, hero-metric blocks.
- **Cluttered classifieds (Craigslist).** No dense, noisy, untrusted wall of
  listings. Postings must read as credible and scannable, never as spam.

## Design Principles

1. **Trust is the product.** Ratings, reviews, real identities, and contract
   status are first-class, not afterthoughts. Every screen should make it easy to
   judge "can I rely on this?"
2. **Shortest path to contact.** Reduce steps between seeing a job and reaching
   the employer. Friction is the enemy; momentum is the feel.
3. **Scannable under pressure.** Students decide fast on mobile, on data. Strong
   hierarchy, honest density, instant legibility over decoration.
4. **Student-native, not corporate.** Tone, copy, and visuals belong on a campus,
   not in an HR suite. Familiar marketplace patterns, warmer voice.
5. **Familiar, not strange.** Standard marketplace affordances done well (search,
   filters, cards, badges). The tool disappears into the task; delight lives in
   moments, not gimmicks.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**.

- Body text ≥ 4.5:1 contrast; large/bold text ≥ 3:1; placeholders held to the
  same body bar (no washed-out muted-gray-on-tint).
- Visible focus states on every interactive element; full keyboard navigation.
- Status/semantic colors (urgent, success, contract states) must not rely on hue
  alone — pair with icon, label, or shape so they read for colorblind users.
- Every animation has a `prefers-reduced-motion: reduce` alternative (the
  rating-distribution grow animation included).
- Mobile-first and low-bandwidth conscious: this audience is frequently on phones
  and limited data.
