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
```

`src/lib/supabase.ts` throws at module load time if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing.

**VITE_FUNCTIONS_BASE must be empty string in ALL environments** (dev and production). Both the Vite dev server proxy and the Vercel rewrite in `vercel.json` forward `/functions/v1/*` to Supabase. This keeps auth cookie requests same-origin from the browser's perspective — browsers block third-party cookies (Supabase domain ≠ app domain), which causes `auth-validate` to fail silently, signing users out on every page load and losing all restored profile/district data. **If `VITE_FUNCTIONS_BASE` is ever set to the full Supabase URL in a deployed environment, users will be signed out on every refresh and profile data will not persist.**

**Vercel production proxy:** `vercel.json` rewrites `/functions/v1/:path*` → Supabase URL. This is the production equivalent of the Vite proxy. Do not remove it.

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
- `auth-register` — public self-registration, rate-limited 3/hour/IP, always tier=1 role=user
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
- No Google APIs or Google services anywhere in the stack
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
- The only permitted external data call involving user info is Census Geocoding API for district lookup
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

## Role Permissions
- Public: read cards and change log only
- Tier 1 Account: Alert/Watch/Archive per card, personal comment box
- Tier 2 Verified Account: verified badge, district info, dates timeline
- Verifier role: check/uncheck verified checkbox, re-pull button, notes block only
- Admin role: full write on all fields, assign roles, view aggregates

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
7. **NEVER set `VITE_FUNCTIONS_BASE` to a full URL in any deployed environment.** It must always be empty string. Changing it to a Supabase URL breaks the same-origin cookie flow and silently signs every user out on every page refresh.
8. **NEVER write to user profile/district data fields with empty or default values on page load.** Profile data writes must only happen in response to explicit user edits — never as a side effect of component mounting or auth state changes. Writing EMPTY state to the DB overwrites real user data.
9. **profile-save must never be called before confirming the data being saved reflects actual user input**, not initialized defaults. The `[data, user]` effect in Profile.tsx must be guarded so it does not fire on the initial EMPTY load before any user interaction.
