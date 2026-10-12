# Nexu AI

CV screening for recruitment and staffing agencies. Upload or paste a stack of
resumes against a job description; Claude scores and ranks each candidate
with a written reason for the grade — not a black-box score.

Extracted on 2026-10-12 from NodalNexus's shared internal app
(`NodalNexus-Files/Codes/website/`), where this feature used to live
alongside the CRM, SDR agent, and other tools. This is now its own
standalone, deployable product with no dependency on that app.

## What's actually here

| Path | What it is |
|---|---|
| `app/dashboard/recruit/` | The main product — candidate list, upload, filters, job pages, printable shortlist |
| `app/apply/[jobId]/` | Public, no-login application page a candidate can be sent a link to |
| `app/api/recruit/` | Scoring endpoints (single resume, batch) |
| `app/api/apply/[jobId]/` | Public application intake — extracts the resume, scores it, saves the candidate |
| `lib/recruit-scoring.ts` | The actual Claude prompt/schema/call — the "brain" |
| `lib/resume-extract.ts` | Turns an uploaded .pdf/.docx/.txt into plain text |
| `supabase/schema.sql` | The full database schema — run this once in a new Supabase project |
| `sample-candidates.csv` | A sample file matching the CSV-upload format, for trying it out |

## Setup

1. `npm install`
2. Create a new Supabase project at [supabase.com](https://supabase.com), then
   run `supabase/schema.sql` in its SQL Editor (Dashboard → SQL Editor → New
   query → paste the whole file → Run).
3. `cp .env.example .env.local` and fill in:
   - Supabase URL + anon key + service role key (Settings → API in your
     Supabase project)
   - An Anthropic API key (console.anthropic.com) — this is what actually
     scores resumes
4. `npm run dev` and open `http://localhost:3000` — it redirects to
   `/dashboard/recruit`, which will prompt you to sign in or create an
   account (uses Supabase Auth — the sign-up form on the login page creates
   a real, auto-confirmed account).

### Try it without setting up Supabase at all

Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`. The whole app runs against
built-in sample jobs/candidates, no backend needed, no login required —
good for a first look before committing to real setup. Data persists to
your browser's local storage, not a real database.

## What changed during extraction (vs. the original shared app)

- Removed the "recruit-only mode" toggle and multi-feature sidebar — this
  app only ever shows the recruit feature, so that logic was unnecessary.
- Added an explicit public read policy on `jobs` (`status = 'open'`) in
  `schema.sql` so the public `/apply` page actually works for a signed-out
  visitor — the original schema's RLS was scoped to `auth.uid() = client_id`
  only, which doesn't cover anonymous candidates.
- Trimmed `lib/demo-data.ts` down to just jobs/candidates (the original file
  mixed in leads/clients/workflow seed data for other features).
- `package.json` only lists dependencies this app actually uses — dropped
  Stripe, Gemini, Sentry, Resend, and other shared-app-only packages.

## Honest state

This is a real, working extraction — it builds and the scoring logic is
unchanged from the original. It has **not** been run against a fresh
Supabase project end-to-end yet; do that before treating it as production-ready.
