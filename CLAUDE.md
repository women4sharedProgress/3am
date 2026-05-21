# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Vite dev server (default localhost:5173)
npm run build        # tsc type-check + Vite production build
npm run preview      # serve the production build locally
npx tsc -p tsconfig.app.json --noEmit   # type-check only, no emit

# Seed the database (requires SUPABASE_SECRET_KEY in .env)
node --env-file=.env supabase/seed.mjs

# Deploy edge functions
npx supabase functions deploy auth-check
npx supabase functions deploy auth-signin
npx supabase functions deploy auth-validate
npx supabase functions deploy auth-sensitive
npx supabase functions deploy auth-signout
npx supabase functions deploy auth-register
npx supabase functions deploy auth-create-account
npx supabase functions deploy daily-refresh

# Profile / district data
npx supabase functions deploy profile-save

# Notification system
npx supabase functions deploy push-subscribe
npx supabase functions deploy alert-settings-save
npx supabase functions deploy bill-status-sync
npx supabase functions deploy notifications-list
npx supabase functions deploy notifications-read
npx supabase functions deploy notify-send

# Generate VAPID keys (run once, then set secrets as instructed)
node scripts/gen-vapid.mjs
```

There are no tests. There is no linter config beyond the default Vite scaffold.

## Environment

```
VITE_SUPABASE_URL=           # Supabase project URL, exposed to browser
VITE_SUPABASE_PUBLISHABLE_KEY= # Supabase publishable key, exposed to browser
VITE_FUNCTIONS_BASE=           # MUST be empty string in ALL environments — see proxy note below
SUPABASE_SECRET_KEY=           # Server-side only — seed script, edge functions
VITE_GOOGLE_CIVIC_API_KEY=     # Google Civic Information API key (browser-side; restrict to your domain in Google Cloud Console)
```

`src/lib/supabase.ts` throws at module load time if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing.

**`authApi.ts` uses a hardcoded relative path `/functions/v1` — `VITE_FUNCTIONS_BASE` is intentionally ignored for all auth and edge function calls.** This ensures requests always route through the active proxy (Vite in dev, Vercel in prod) and are never sent cross-origin. Cross-origin requests lose the `wsp_session` cookie (browsers block third-party cookies), causing silent sign-outs on every page refresh and lost profile/district data. Do not re-introduce `VITE_FUNCTIONS_BASE` into `authApi.ts`.

**Vercel production proxy:** `vercel.json` rewrites `/functions/v1/:path*` → Supabase URL. This is the production equivalent of the Vite dev proxy. **Do not remove it.** Without it, every edge function call fails (cookie not sent, CORS issues).

**Supabase secrets** (set via `supabase secrets set KEY=value`, not `.env`):
- `ALLOWED_ORIGIN` — the app's public URL (`https://3ampipeline.org`), used in CORS headers for credentialed requests
- `ADMIN_SECRET` — protects the `auth-create-account` edge function

---

## Data Model — Two Layers

### Layer 1 — Auto-pulled (official sources only)
Fields populated and updated by the daily edge function cron:
- `name` (bill number + title), `introduced`, `stage`, `stage_dates`, `stage_note`
- Federal source: api.congress.gov
- Michigan source: legislature.mi.gov (LegiScan as fallback)
- **Never pull from unofficial sources.**

### Layer 2 — Human-written (never auto-overwritten)
Fields that only a human sets via the admin UI:
- `bill_desc`, `decisions`, `supporters`, `blockers`, `influence_window`, `policy_bias`, `urgency`
- The daily pull must never touch these fields, even during a hard refresh.

---

## Bills Table — Verification Columns

Migration `002_add_verification_columns.sql` adds to the `bills` table:

```sql
verified          boolean     not null default false,
verified_by       text,        -- human moniker e.g. "SL" or "Margaret"
verified_at       timestamptz,
last_pulled_at    timestamptz,
pull_source       text,        -- URL used in the most recent pull
raw_pull_data     jsonb,       -- full snapshot from source at last pull
pending_changes   jsonb,       -- diff object; null means no pending changes
source_url        text,
notes             text
```

---

## Verification Rules

- One checkbox per card — verifies the entire card at once, not individual fields.
- Verified cards display a checkmark and the `verified_by` moniker publicly on the card.
- **Verified cards are read-only to the auto-pull.** The nightly job stores diffs in `pending_changes` instead of writing to the live card.
- **Hard refresh** (manual, admin-only): overwrites all Layer 1 fields directly and clears `verified` regardless of what changed.
- Any human edit to any field clears `verified`, `verified_by`, and `verified_at` automatically.

---

## 3am Soft Update — Edge Function Behavior

The `daily-refresh` edge function runs at 08:00 UTC (3 AM US Eastern) via pg_cron. Behavior differs by `verified` status:

**Unverified cards:**
1. Pull from official source.
2. Overwrite all Layer 1 fields directly.
3. Leave `verified = false` unchanged.

**Verified cards:**
1. Pull from official source.
2. Compare each Layer 1 field to the live card value.
3. If any field changed: write the diff to `pending_changes` only. **Do not touch the live card or clear `verified`.**
4. If nothing changed: do nothing. Leave `verified` and `pending_changes` alone.
5. The public always sees the verified version until a human accepts the diff.

---

## Verifier UI — Logged-in Users Only

Verified cards that have a non-null `pending_changes` show a dot indicator on the card.

Expanding the diff shows a field-by-field comparison (old → new). Three actions:

- **Accept All** — applies all Layer 1 changes from `pending_changes`, clears `verified` (card becomes unverified), clears `pending_changes`.
- **Edit Fields** — opens the Layer 1 fields inline pre-populated with the incoming values; verifier can modify before saving. Saving clears `pending_changes` but also clears `verified` (requires re-verification).
- **Skip** — dismisses the diff view until the next pull cycle. Live card is unchanged.

---

## Architecture

This is a React PWA backed by Supabase. Routing uses react-router-dom with three routes: `/` (tracker), `/login`, `/register`.

**Data flow:** `useBills` hook (in `TrackerPage.tsx`) → Supabase PostgREST → `Bill[]` → `filterBills()` → rendered cards.

**Auth flow:** `main.tsx` wraps everything in `BrowserRouter` → `AuthProvider` → `App`. On every page load, `AuthContext` calls `auth-validate` (reads httpOnly cookie automatically) to restore session.

---

## Custom Auth System

All auth uses a custom accounts table — **not Supabase Auth**. Sessions are httpOnly cookies (`wsp_session`), never exposed to JavaScript.

### Two-credential design
Each account has both a **password** and a **passcode**. On login, `auth-check` reads the existing `wsp_session` cookie:
- Cookie matches DB token → device is recognized → prompt for passcode (faster, daily use)
- No cookie or expired → prompt for password (new device or session expired)
- Locked → force password entry to unlock

### Session lifecycle
- 45-day rolling window: `auth-validate` re-issues the cookie with a fresh `Max-Age` on every page load while the session is active.
- `remember=false` on sign-in: cookie has no `Max-Age` (session cookie, cleared on browser close).
- `auth-signout` nulls the token in the DB and sets `Max-Age=0` — required because JS cannot clear httpOnly cookies.

### Passcode lockout
5 consecutive failed passcode attempts locks the account. Entering the correct password unlocks it and resets the counter.

### Credential hashing
PBKDF2-SHA256, 100,000 iterations, random 16-byte salt per credential, stored as `saltHex:hashHex`. Implemented in `supabase/functions/_shared/auth-utils.ts`.

### Edge functions
All auth edge functions are in `supabase/functions/auth-*/index.ts`. They share utilities from `supabase/functions/_shared/auth-utils.ts`:
- `auth-check` — device recognition (cookie → passcode or password mode)
- `auth-signin` — validates credential, issues session cookie
- `auth-validate` — session guard, rolls the 45-day window forward
- `auth-sensitive` — password re-verification for sensitive actions
- `auth-signout` — clears session server-side + cookie Max-Age=0
- `auth-register` — public self-registration, rate-limited 3/hour/IP, always tier=2 role=user
- `auth-create-account` — admin-only (requires `ADMIN_SECRET`), can set role/tier

### Database tables
- `accounts` — uuid PK, username (unique), password_hash, passcode_hash, email (unique), role (`'user'|'verifier'|'admin'`), tier (int), session_token, session_expires_at, failed_passcode_attempts, passcode_locked. RLS enabled; service_role only.
- `registration_rate_limits` — ip_hash (PK, SHA-256), attempts, window_start. Rows older than 2 hours are deleted on each registration attempt. RLS enabled; service_role only.

### CORS and cookies
`auth-utils.ts` sets `Access-Control-Allow-Origin: ${ALLOWED_ORIGIN}` and `Access-Control-Allow-Credentials: true`. In development the Vite proxy removes the need for CORS entirely — requests arrive at Supabase from the proxy server, not from the browser.

---

## Key Non-Obvious Design Decisions

**CSS is verbatim from a source HTML file.** `src/tracker.css` is a direct copy of the original `Michigan_National_Tracker_08_May_26.html` stylesheet. Do not replace it with Tailwind utility classes. `src/index.css` only contains `@import './tracker.css'` — the Tailwind directives were intentionally removed to avoid a base-style reset that would break the design. Tailwind is installed but unused for tracker components. Auth page styles live in `src/auth.css`, imported separately in `main.tsx`.

**`policyBarStyle()` returns a CSS string, not a React style object.** `BillCard.tsx` contains a local `parseCssStyle()` helper that converts it to `React.CSSProperties` before use as an inline style. This exists because `policyBarStyle` was designed to be embedded directly in HTML attributes in the original file.

**Filter chip labels ≠ data values.** Several filters map UI labels to different DB values:
- Timing chip "Session" → filters on `urgency === 'year'` (not `'session'`)
- Impact chip "Due process / 14th" → matches bills with `'due'` OR `'14th'` in the `amend` array
- City sub-filter only applies when `level === 'local'`

**`stage` is 0-indexed and the length encodes enactment.** `stage === stages.length` means the bill is enacted/signed. The stage arrays differ by level: Federal has 6 stages, Michigan and Local have 5. `Pipeline.tsx` selects the correct array based on `bill.level`.

**Download HTML feature.** `Header.tsx` offers a "Download HTML" button that calls `generateHtml(bills, stateName, today)` from `src/lib/generateHtml.ts`. This function re-serializes the current filtered bill data back into the original standalone HTML format (including all CSS and JS) so the file works offline without any server. The DB uses snake_case; `generateHtml.ts` converts back to the camelCase field names the original HTML's embedded JS expects.

---

## Supabase Schema Notes

The `bills` table has RLS enabled. The schema grants are required in addition to the RLS policy — both must be present:

```sql
grant select on bills to anon, authenticated;   -- frontend reads
grant all    on bills to service_role;           -- seed + edge function writes
```

The edge function `supabase/functions/daily-refresh/index.ts` currently stubs the LegiScan API call (it just touches `updated_at`). The cron schedule targets 8:00 UTC (3 AM US Eastern).

## Adding a New State

1. Add seed data rows with the appropriate `state` char(2) code and `level` values.
2. Update `useBills` call in `src/pages/TrackerPage.tsx` to include the new state code.
3. Add any state-specific pipeline stages to `src/lib/constants.ts` if needed.
4. Update `OFFICE_META` and `CITY_FILTERS` for local jurisdictions in that state.

---

## Vendor Restrictions
- No Google APIs or Google services anywhere in the stack — **exception:** Google Civic Information API (`civicinfo/v2/representatives`) is permitted solely for federal/state representative and district lookup from the Profile page. Key stored in `VITE_GOOGLE_CIVIC_API_KEY`. No other Google services.
- No Palantir products or APIs
- For address to district lookup: use Census Geocoding API
- For mapping: OpenStreetMap / Leaflet only
- For analytics: Plausible self-hosted only
- All vendor names stay out of public-facing copy

---

## Data Privacy Rules — Non-Negotiable
- No third party analytics, tracking pixels, or session recording
- No advertising networks or SDKs of any kind
- No social share buttons that make external calls on page load
- All user data stays in our Supabase instance
- The only permitted external data calls involving user info are Census Geocoding API for district lookup and Google Civic Information API for representative/district autofill from the Profile page (approved exception — see Vendor Restrictions)
- Every feature must be evaluated for external data exposure before being built

---

## Data Model — Two Layers (Policy)
Layer 1 (auto-pulled, official sources only):
- Federal bills: api.congress.gov
- Michigan bills: legislature.mi.gov, LegiScan as fallback
- Fields: bill number, title, sponsors, stage, stage dates, vote counts, stageNote
- Never pull from unofficial sources

Layer 2 (human-written, never auto-overwritten):
- Fields: desc, decisions, supporters, blockers, window, policyBias, urgency
- Only set or changed by a human in admin UI

---

## Verification Rules (Policy)
- One checkbox per card, verifies the whole card at once
- Verified status and verifier moniker visible in admin view only
- Never shown on public card
- Verified cards are read-only to auto-pull
- Hard refresh: overwrites all Layer 1 fields, clears verified regardless of what changed
- Any human edit clears verification automatically

---

## Usage Tiers — Authoritative Definition

Tiers gate both the UI shown and the features available. **Each tier has a distinct UI.** Tier is stored as an integer in `accounts.tier`. The `role` column (`user | verifier | admin`) is separate and orthogonal to tier.

| Tier | Who | DB value | UI & Features |
|------|-----|----------|---------------|
| **1** | Public / signed-out | n/a (no account) | Read-only. LawTracker, Civic Calendar. No account required. |
| **2** | Account holder | `tier = 2` | Full tier-2 UI: My Profile, Your Representatives, Alert/Watch/Archive, stoplight pills, feedback button, crowdsourced verification and editing, personal comment box. Requires username + password. No personal info required — can remain fully anonymous. |
| **3** | W4SP-verified identity | `tier = 3` | Tier-3 UI adds: vetted verification agent tools. Covers W4SP Administration, Elected Officials, Partners, volunteers, broadcast agents. Identity verified by W4SP off-platform. |
| **4** | Opt-in data sharer | `tier = 4` | Same UI as Tier 5. Requires personal information + at least one opt-in to data sharing. Revenue share if aggregate opt-in data generates revenue. |
| **5** | Civic history verified | `tier = 5` | Same UI as Tier 4. Requires personal information + civic participation history. Includes Tier 3 electoral alumni and users with sound participation history. |

The DB `tier` column only stores values 2–5 (constraint: `CHECK (tier BETWEEN 2 AND 5)`, default 2). Tier 1 = no account = no DB row. The public tier number and DB integer are identical — there is no offset.

### Feature gates by tier (UI = what the component checks)
- **`!user`** → tier 1 (public). Show read-only UI, hide all account features.
- **`user`** → tier 2+. Show feedback button, stoplights, profile, alert/watch/archive.
- **`user.tier >= 3`** → tier 3+. Show verifier/admin tools. *(Not yet built.)*
- **`user.role === 'verifier' || user.role === 'admin'`** → verifier/admin actions within tier 3+ UI.

### What is NOT yet built
- Tier 3 UI (verifier agent tools, identity verification workflow)
- Tier 4/5 UI (opt-in data sharing, revenue share, civic history)
- Any UI differentiation beyond tier 2 (account holder)

---

## 3am Soft Update Rules (Policy)
- Unverified cards: overwrite all Layer 1 fields directly
- Verified cards: store diff in pending_changes only, never touch live card
- No mass delete ever — bills not in pull stay in system
- Bills not touched by pull and not verified get a unique color flag
- One change log entry per day, deleted after 8 days

---

## Per-Card User Controls
- Three selections: Alert, Watch, Archive
- Personal comment box: 1500 chars, visible to user only
- Send to aggregate: anonymous with tracking number, or with account data
- Bot detection: flag accounts sending more than one comment per day
- Keyword notifications: up to 10 keywords, 5 typed free-form, 5 from filter chips
- One daily digest maximum for keyword matches

---

## Design Source of Truth
- `Michigan_National_Tracker_08_May_26.html` is the visual reference
- App must match exactly: CSS variables, card layout, filter chips, pipeline stages, policy bias bar, urgency colors, office dot system
- Verified status is never shown on public cards

---

## Process Rules
1. After any change to `supabase/functions/_shared/auth-utils.ts`, redeploy ALL edge functions immediately.
2. Always run `npm run build` before `git push` — never push with type errors.
3. Run all SQL migrations directly via CLI (`supabase db query --linked --file`), never copy-paste into the SQL Editor.
4. Commit after every completed feature, not in large batches.
5. After every deployment, verify on 3ampipeline.org before continuing.
6. When setting Supabase secrets, read from `.env` and set all at once rather than one at a time.
7. **NEVER re-introduce `VITE_FUNCTIONS_BASE` into `authApi.ts`.** The BASE is now hardcoded to `/functions/v1` (relative path) so all calls route through the proxy regardless of environment. The `VITE_FUNCTIONS_BASE` env var can be deleted from Vercel entirely — it is not read by the auth or function call code.
8. **NEVER call `profileSave` as a side effect of component mounting or auth state changes.** Only real user edits should push to the DB. The `skipNextDbSync` ref in `Profile.tsx` guards this — do not remove it. Writing empty/default state to the DB overwrites real user data with no recovery path.
9. **All edge function calls must go through `authApi.ts`'s `post()` helper**, not raw `fetch()` with `VITE_FUNCTIONS_BASE` constructed inline. The helper uses `||` (not `??`) so both undefined and empty string resolve to `/functions/v1` (same-origin proxy). Inline construction OR using `??` silently falls through to `VITE_SUPABASE_URL` when the env var is absent, making the call cross-origin and breaking cookies.
10. **The feedback button (FeedbackButton.tsx) is visible to any signed-in user (`user !== null`).** Tier 1 = public/no account; account holders are tier 2+ in the DB. Do not add a numeric tier check — the gate is simply `if (!user) return null`.
11. **Before fixing any bug, read the relevant file first and state the root cause in one sentence.** Do not make changes until the root cause is confirmed. If the same bug has been fixed before in this session, stop and ask the user what changed rather than re-fixing it.
12. **Never touch working code to fix an unrelated bug.** If fixing bug A requires changing code that bug B depends on, flag the conflict to the user before proceeding.
13. **Maximum two attempts to fix the same bug.** If a bug persists after two targeted fixes, stop and ask the user for more context rather than trying a third approach.
14. **Before answering "does X exist in multiple places", always run a grep across the entire src/ directory, not just the most recently touched file. Never answer existence questions from memory.**
15. **Never remove code that isn't directly causing the bug being fixed.** If cleanup is needed, ask the user first. Easter eggs, animations, and UI features are intentional — do not remove them as side effects of other fixes.
16. **All edge functions must be deployed with `--no-verify-jwt` flag. Never deploy without it.**

---

## Feedback System Architecture

- **Dev mode** (`npm run dev`): submissions write to both `feedback/feedback_log.csv` (via Vite plugin middleware at `/api/feedback-csv`) and the `feedback_submissions` DB table (via edge function). If the CSV write fails, the Vite server console logs `[feedback-csv] write failed:` with the reason. The browser console logs `[feedback] CSV write returned <status>` for non-200 responses.
- **Production**: only the `feedback_submissions` DB table is written. The CSV is never touched. To review feedback, query: `select * from feedback_submissions order by created_at desc limit 50;`
- **Common failure modes that cause silent CSV/DB loss:**
  1. `VITE_FUNCTIONS_BASE` set to Supabase URL in Vercel env → authApi BASE is cross-origin → CORS may block or cookie lost. Fix: delete `VITE_FUNCTIONS_BASE` from Vercel env entirely. The `||` in authApi.ts then defaults to `/functions/v1` (same-origin via Vercel proxy).
  2. `??` vs `||` in authApi BASE: `??` falls through to `VITE_SUPABASE_URL` when env var is absent (cross-origin). `||` falls through to `''` (same-origin). Always use `||`.
  3. CSV file open in Excel on Windows → `appendFileSync` throws → Vite server console logs `[feedback-csv] write failed:`, browser console logs the HTTP 500 status.
  4. Not in dev mode (running `npm run preview` or accessing production) → `import.meta.env.DEV` is false → CSV path never runs. Production feedback is DB-only.
- **Never add an auth requirement to `feedback-submit`.** It must accept any request. Tier 2+ gate is in the UI only (FeedbackButton.tsx). The edge function must not require a session.
- **To verify feedback is reaching the DB** (production): `select * from feedback_submissions order by created_at desc limit 20;`
