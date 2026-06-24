---
target: app/profile
total_score: 23
p0_count: 0
p1_count: 3
timestamp: 2026-06-24T07-09-37Z
slug: app-profile-id-page-tsx
---
# Critique — app/profile (public `[id]` + `edit`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Save has no pending/success feedback; redirect is the only signal |
| 2 | Match System / Real World | 2 | Fiverr leftovers ("gig", "buyers", "order this gig"); name fallbacks differ ("Hustler" vs "Carolinian") |
| 3 | User Control and Freedom | 2 | Delete account: no confirm, no undo; edit form has no explicit Cancel |
| 4 | Consistency and Standards | 2 | Reviewers get avatars, profile owner doesn't; rating rendered twice; Messenger is a text link while other CTAs are buttons |
| 5 | Error Prevention | 1 | Irreversible delete is one unguarded click; skills are free-text comma parsing |
| 6 | Recognition Rather Than Recall | 3 | Skills format relies on recall; otherwise visible |
| 7 | Flexibility and Efficiency | 3 | Simple flows, adequate |
| 8 | Aesthetic and Minimalist | 3 | Clean, but weak hierarchy on the primary action + redundant rating |
| 9 | Error Recovery | 2 | Raw Supabase `error.message` surfaced to user; no inline field errors |
| 10 | Help and Documentation | 3 | Good messenger hint + placeholders |
| **Total** | | **23/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment**: Not AI slop. No gradient text, no tracked eyebrows, no fake hero-metrics, no identical card grids, no glassmorphism. Clean shadcn. The failure mode is the opposite of slop — it is **under-designed and forgettable**: monochrome, no identity anchor, primary trust action buried. On a product whose stated #1 principle is "trust is the product," the profile (the trust surface) does the least to sell trust.

**Deterministic scan**: `detect.mjs` over both page files → `[]` (0 findings). Confirms no banned visual patterns. Detector cannot see the behavioral/IA issues below.

**Visual overlays**: No dev server running; browser injection not attempted. No user-visible overlay available — manual review + clean CLI scan only.

## Overall Impression
The profile is the moment a student decides "do I trust this employer enough to message them?" Right now it answers weakly. The single biggest opportunity: make the **Message on Messenger** action a real, prominent button and give the profile a visual identity anchor (avatar), so the page reads as a credible person, not a text dump.

## What's Working
1. **Honest information architecture.** Name → rating → bio → skills → contact, then posted jobs, then reviews. Logical scan order for the "can I trust this?" question.
2. **Reusable rating/review system.** `StarRating` (compact/full/starsOnly) and `ReviewList` are consistent with the rest of the marketplace; reviewers get avatars + dates.
3. **Edit page is appropriately minimal.** Four fields, clear labels, a genuinely useful Messenger hint, danger zone visually separated.

## Priority Issues

- **[P1] Primary contact action is buried.** `Message on Messenger` is `text-sm underline` — the least prominent element on the page, yet it's the conversion action and violates principle #2 "shortest path to contact." On mobile it's also a sub-44px tap target.
  - **Why it matters**: The whole product funnels to this contact. Styling it as a footnote leaks conversions.
  - **Fix**: Promote to a `Button` (with a Messenger/Send icon), top of the header column near the rating. Keep `m.me/<username>` target.
  - **Suggested command**: `/impeccable layout`

- **[P1] Delete account is an unguarded, irreversible click.** `deleteAccount` cascades jobs + contracts and signs out; the button fires immediately with no confirmation.
  - **Why it matters**: Accidental, unrecoverable data loss. A user would absolutely contact support.
  - **Fix**: Wrap in the existing `AlertDialog` / `confirm-submit.tsx` pattern; require typed or explicit confirm. Surface the cascade consequences in the dialog.
  - **Suggested command**: `/impeccable harden`

- **[P1] Review ratings are invisible to screen readers.** In `ReviewList`, each rating uses `StarRating ... starsOnly`, which renders 5 decorative `<Star>` icons with no text/aria alternative. WCAG AA target (PRODUCT.md) means rating must not be conveyed by icon alone.
  - **Why it matters**: Sam (screen-reader user) gets no rating at all — the core trust signal is silent.
  - **Fix**: Add `aria-label="Rated N of 5"` (or visually-hidden text) to the rating; mark decorative stars `aria-hidden`.
  - **Suggested command**: `/impeccable audit`

- **[P2] Fiverr leftover copy + inconsistent identity terms.** Empty review state: "Buyers who order this gig can leave the first one." This is a USC job board, not a gig marketplace. Name fallbacks disagree: profile says "Hustler", reviews say "Carolinian".
  - **Why it matters**: Breaks match-to-real-world and the student-native voice; reads as a half-rebranded template.
  - **Fix**: Rewrite to job-board language ("No reviews yet — employers who complete a contract can leave the first one."); pick one fallback name term and use it everywhere.
  - **Suggested command**: `/impeccable clarify`

- **[P2] No identity anchor + duplicated rating.** The owner has no avatar (reviewers do), and the rating renders twice (header + "Employer reviews" h2). Hierarchy is flat: h1 name, then small grey everything.
  - **Why it matters**: Weakens credibility and visual hierarchy on the trust surface; the duplication is noise.
  - **Fix**: Add `AvatarInitials` (large) beside the name; drop one rating instance; strengthen the header into a clear identity block.
  - **Suggested command**: `/impeccable layout`

## Persona Red Flags

**Sam (Accessibility-Dependent)**: Review ratings announced as nothing (decorative stars, no label). Delete has no confirmation safety. Default focus states only; no verified visible focus on the Messenger link / edit controls.

**Casey (Distracted Mobile)**: The one action that matters — Message on Messenger — is a tiny underlined link, hard to thumb-tap (<44px). Save button gives no feedback on a slow connection, so it invites double-submits. No state-loss safety on the edit form.

**Riley (Stress Tester)**: One click nukes the account with no confirm and cascades deletes. Save failure surfaces a raw Supabase `error.message` string. Skills are naive comma-split — `"C++, , React,"` yields odd tokens.

**Project persona — "Maria, the job seeker deciding to reach out"**: Lands on an employer profile to judge trust before messaging. Sees a grey wall of text, a rating she can't act on next to a contact link she might miss, and "buyers/gig" language that doesn't match the campus job board she was promised. Hesitates.

## Minor Observations
- Edit: no explicit **Cancel**; no `useFormStatus` pending state on Save; no inline field validation or required markers.
- `messenger_username` accepted without shape validation — a bad handle yields a dead `m.me` link with no warning.
- Bio/skills have no empty-state nudge for an owner viewing a thin profile (onboarding gap).
- Whole surface is monochrome (default shadcn neutral) — consistent with the app, but the rating amber is the only color carrying meaning.

## Questions to Consider
- What would a confident, trust-first version of this header look like — avatar + name + rating + a real "Message" button as one identity block?
- Should "Message on Messenger" be the single visual focal point of the page?
- Does a brand-new user's empty profile teach them to complete it, or just look broken?
