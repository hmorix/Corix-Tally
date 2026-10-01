# Architecture & decisions

Read this before changing structure, stack, or design — it records *why*,
so a new session doesn't re-litigate settled choices or contradict them.

## Stack (and why)
- **Vite + React (JS, not TS)** — smaller mental overhead for a mobile/Termux
  workflow where you can't easily use a type-aware editor. Plain `.jsx`.
- **Tailwind** — utility classes avoid a separate CSS file per component,
  which matters when editing on a phone keyboard.
- **Supabase** — Postgres + Auth + Row Level Security in one free-tier
  service. Every table's RLS policy checks `auth.uid()` so users can never
  see each other's data even though they share one database (see
  `supabase/schema.sql`). No custom backend/API server exists or is needed —
  the browser talks to Supabase directly, which is why this deploys as a
  static site on Vercel with zero serverless functions.
- **react-router-dom** — client-side routing; `vercel.json` has a catch-all
  rewrite to `index.html` so deep links (e.g. `/vouchers`) don't 404 on
  refresh.
- **papaparse (CSV) / xlsx (Excel)** — both are dynamically `import()`ed
  inside `src/lib/csv.js` / `src/lib/excel.js`, never imported at the top of
  a file. This is *the* mechanism keeping the initial bundle small — xlsx
  alone is ~450KB. Do not change these to static imports.
- **vite-plugin-pwa** — makes the site "installable" (Settings > Add to Home
  Screen on Android, or a desktop install prompt) without a native app.
  This is what satisfies "build in Vite so we can also create a web
  installation application."

## Why no native mobile app
Tally itself is Windows-only; there's no realistic "native Tally app" to
compete with. A PWA gets installability (home-screen icon, offline shell,
full-screen) without App Store review or a second codebase.

## Bundle-size strategy (the "no heavy load" requirement)
1. Route-level pages are all small; nothing pulls in xlsx/papaparse until a
   button is clicked (see above).
2. `vite.config.js` manualChunks separates `vendor_supabase` and
   `vendor_sheets` from `vendor_react`, so the auth screens' first paint
   doesn't wait on Supabase's SDK weight either.
3. Fonts are loaded via a single Google Fonts `<link>` in `index.html`
   (Fraunces + IBM Plex Sans + IBM Plex Mono), not self-hosted — trades a
   small amount of control for zero build-time font tooling.
4. Keep new dependencies rare. Before adding one, check if a ~50-line
   hand-written function does the job (this is why `src/lib/accounting.js`
   is hand-rolled instead of using an accounting library).

## Design system ("the ledger book")
Not a generic SaaS dashboard — the visual language is literally ruled ledger
paper, because the audience is people *learning what a ledger looks like*.
- **Color:** `#EDE7D6` paper background, `#1F2A24` ink (near-black warm
  green, used for text and the sidebar), `#A9822C` brass (accent, primary
  actions, the shortcut bar's armed-modifier highlight), `#B23A2E` seal-red
  (errors, unbalanced totals, sign-out), `#2E6B4F` credit-green (balanced
  totals, profit). See `tailwind.config.js` for the exact token names.
- **Type:** Fraunces (serif, display/headings — gives a stamped, bookish
  weight) + IBM Plex Sans (UI text) + IBM Plex Mono (**numbers only** — every
  amount anywhere in the app uses `.font-tabular` / `font-num` so figures
  align in columns like a real ledger).
- **Structural device:** hairline rules (`.rule-line`, `border-rule`)
  instead of card shadows/rounded panels — reinforces "paper with ruled
  lines," not "SaaS cards."
- If you add a new page, match this — don't reach for a generic white-card
  layout because it's the default in your training data. Check
  `/mnt/skills/public/frontend-design/SKILL.md` (or ask the user for it if
  unavailable) before inventing new visual patterns.

## Mobile shortcut bar (the trickiest piece — read before touching it)
`src/components/ShortcutBar.jsx` shows/hides itself based on
`visualViewport` shrinking (proxy for "the on-screen keyboard is open") and
on `focusin`/`focusout` on inputs. It does **not** try to dispatch synthetic
`KeyboardEvent`s into the DOM (unreliable across browsers/inputs). Instead:
- Every button calls `fireShortcut(action)` from `src/lib/shortcuts.js`,
  which dispatches a `window` CustomEvent `"corix:shortcut"` with
  `{ detail: { action } }`.
- Any page that cares (see `Vouchers.jsx`) adds a
  `window.addEventListener("corix:shortcut", ...)` listener.
- A **physical keyboard** should eventually fire the same event via
  `comboFromEvent()` + `matchShortcut()` (both already written in
  `shortcuts.js`) — this wiring into a global `keydown` listener is
  currently only partial (only Escape is wired in ShortcutBar.jsx itself).
  See PROJECT_TASKS.md.
- Modifiers (Ctrl/Alt/Shift) are "sticky" (tap to arm, tap a key to fire,
  then auto-clear) because holding two on-screen buttons at once isn't
  practical with one thumb.

## Data model summary
`companies` (1 per practice book) → `ledger_groups` (Capital, Sales, etc.,
seeded by `seed_default_groups()`) → `ledgers` (individual accounts, each
with an opening balance + side, optional GST%) → `vouchers` (a transaction)
→ `voucher_entries` (its debit/credit lines — this is where double-entry
actually lives). Reports (Day Book / Trial Balance / P&L) are all *computed
client-side* from these four tables in `src/lib/accounting.js` — nothing is
pre-aggregated server-side, so those functions are the one place ledger math
can go wrong. Keep them pure and easy to eyeball.

## Known simplifications (intentional, not bugs)
- GST summary is a flat slab total, not a real GSTR-1/3B layout.
- No voucher auto-numbering, no voucher editing/deletion yet.
- Google Sheets integration currently only obtains and stores an OAuth
  token — it doesn't push data yet (see PROJECT_TASKS.md).

## Local-first data layer (added in sprint 2 — read before touching data fetching)
Every screen used to call Supabase directly and re-fetch on mount, which
meant re-querying the same tables every time the user changed pages — slow
on mobile data and wasteful of Supabase's free-tier request quota. This was
replaced with a single hook, `src/hooks/useCompanyData.js`, instantiated
once in `App.jsx` and passed down as a `data` prop to every page.

**Write path** (`saveLedger`, `deleteLedger`, `saveVoucher`, `deleteVoucher`):
1. Update React state immediately — the UI reflects the change with zero
   network latency.
2. Write the same record to IndexedDB (`src/lib/localStore.js`) — survives a
   refresh or losing signal mid-edit.
3. Push the change onto a persisted `sync_queue` IndexedDB store and attempt
   to send it to Supabase right away (`flushQueue()`).
4. If step 3 fails (offline, dropped connection), the item stays queued.
   It's retried automatically on the browser's `online` event and once more
   on the next app load — the user never has to manually "retry sync."

**Read path**: `loadForCompany()` paints instantly from whatever's already
in IndexedDB for that company, then — if `navigator.onLine` — does exactly
**one** full Supabase fetch per company per session and reconciles the
cache. It will not fetch again just because the user navigated to a
different report page; Day Book / Trial Balance / P&L / GSTR-1 / GSTR-3B /
ITR Summary all compute their views client-side from the same in-memory
`ledgers` / `vouchers` / `entries` / `groups` arrays.

**Why client-generated UUIDs matter here**: `saveLedger`/`saveVoucher`
generate the record's `id` locally (`db.uuid()`) before it ever reaches
Supabase, and insert with that same id (`upsert`, not `insert`-then-read-id-
back). This means the local optimistic record and the eventually-synced
Supabase row are the *same* row from the start — no id-remapping step, no
"replace the fake local row once the real one comes back" logic needed.

**If you add a new field or table**: extend `useCompanyData`'s state +
mutation functions rather than having a page call `supabase.from(...)`
directly. Bypassing the hook reintroduces the "fetch on every page visit"
problem this was built to remove.

**Known limitation** (see PROJECT_TASKS.md): IndexedDB is scoped to the
browser, not the signed-in account. Switching accounts on the same device
doesn't wipe the previous account's cached rows immediately — RLS still
prevents any actual data leak (the new account's Supabase fetch simply
won't return the old account's rows), but the cache should ideally be
cleared on sign-out for tidiness.

## Google Sheets push (sprint 3)
Two small libs, kept separate on purpose:
- `src/lib/googleAuth.js` — loads Google Identity Services once (cached
  promise, `gisLoadPromise`), and `requestSheetsToken(clientId)` opens the
  consent screen and resolves an access token. This is also reused by
  Settings.jsx's initial "Connect" flow so there's exactly one place that
  knows how to talk to GIS.
- `src/lib/googleSheets.js` — a bare `fetch()` call to the Sheets
  `values:append` REST endpoint. No SDK. Takes an array of plain objects,
  writes their keys as a header row, appends the rest.

`DayBook.jsx`'s "Push to Google Sheet" button tries the stored token first;
on a 401 (expired — GIS tokens are short-lived, ~1hr) it transparently
re-requests one via `requestSheetsToken` and retries once, then persists the
new token back onto `profiles.google_access_token`. The user only sees a
consent popup again once the old token has actually expired, not on every
push.

## Physical-keyboard shortcuts (sprint 3)
`ShortcutBar.jsx` now has a second `keydown` listener (alongside the
viewport-based show/hide logic) that runs every keypress through
`comboFromEvent()` + `matchShortcut()` (both in `src/lib/shortcuts.js`) and
fires the same `corix:shortcut` event the on-screen buttons fire. This means
a page never needs to know whether a shortcut came from a tap or a real
keyboard — they're the same event. Bare `Tab` is deliberately left alone
(falls through, normal browser field navigation) so typing/tabbing through
a form isn't hijacked; only modifier combos and function keys are
intercepted.

## Sign-out data hygiene
`useAuth().signOut()` now calls `supabase.auth.signOut()` **and**
`localStore.clearAll()` (wipes every IndexedDB store) **and** removes the
`corix:company` localStorage key. `App.jsx` also resets its in-memory
`company` state when `user` goes null. None of this is a security boundary
(Supabase RLS is) — it's purely so a second person signing into the same
browser/device doesn't see a confusing flash of the previous user's last
selected company or cached rows before their own data loads.

## Multi-database backend (sprint 4 — the big one)
Added `server/`, a self-contained Express + Prisma API that's a genuine
alternative to Supabase, not a replacement — the frontend's default
(`VITE_BACKEND_MODE` unset or `supabase`) is completely untouched by this.

**The key design decision**: both Prisma schemas (`schema.relational.prisma`
for Postgres/MySQL/MariaDB, `schema.mongo.prisma` for MongoDB) declare NO
`@relation` fields — every foreign key is a plain string column, and every
route handler (`server/src/routes/*.js`) filters manually
(`prisma.ledger.findMany({ where: { companyId } })`) instead of using
Prisma's relational `include`/nested-write features. This sounds like giving
up convenience, but it buys something specific: **the exact same route code
runs unmodified against all four databases.** Prisma's relation API differs
meaningfully between its relational and Mongo modes (Mongo needs
`@db.ObjectId`, doesn't support the same cascading-delete declarations,
handles nested writes differently) — dropping relations sidesteps all of
that divergence at the cost of writing cascade/ownership logic by hand
(see `assertOwnsCompany()` and the manual `deleteMany` calls in
`routes/vouchers.js` / `routes/ledgers.js`).

**IDs are also provider-agnostic on purpose**: relational uses
`@default(uuid())`, Mongo uses `@default(cuid()) @map("_id")` — a plain
opaque string either way, never Mongo's native ObjectId type. This matters
because the frontend generates its own ids client-side for optimistic local-
first writes (`db.uuid()` in `localStore.js`) and needs the server to accept
that exact id rather than generating its own — see the `upsert({ create:
{ id, ...data } })` pattern in `ledgers.js`/`vouchers.js`. If Mongo's schema
required real ObjectIds, a client-generated UUID would be rejected outright.

**Provider selection** (`server/src/lib/detectProvider.js`) reads whichever
of `DATABASE_URL` / `MYSQL_URL` / `MONGODB_URI` is set in `server/.env` —
priority Mongo > MySQL > Postgres if more than one is somehow set. This is a
restart-time decision, not a runtime one: `server/scripts/generate.js` has
to re-copy the right schema template into `prisma/schema.prisma` and re-run
`prisma generate` whenever you switch, which is why it's a separate `npm run
setup` step rather than something the running server does automatically.

**Auth is fully separate from Supabase Auth** in API mode: bcrypt + JWT
(`server/src/middleware/auth.js`), with Google sign-in verified server-side
via `google-auth-library`'s ID-token verification
(`server/src/lib/googleVerify.js`) rather than Supabase's OAuth redirect
flow. The frontend's Google button (`Login.jsx`) calls
`backend.auth.signInWithGoogle()`, which resolves to either Supabase's
redirect-based flow or, in API mode, a Google Identity Services "One Tap"
ID-token prompt (`googleAuth.js`'s `requestGoogleIdToken`) — genuinely
different underlying flows, unified behind one adapter method.

**The frontend adapter** (`src/lib/backend.js`) is the single switch point.
`backendSupabase.js` is the pre-existing Supabase logic moved (not rewritten)
into the shared interface shape; `backendApi.js` implements the identical
interface against the Express server. `useCompanyData.js`'s local-first
IndexedDB caching and sync-queue logic (see the sprint-2 section above)
didn't need to change AT ALL to support this — it already only ever called
"the backend," it just used to mean "Supabase" hardcoded. Now it means
whichever adapter `backend.js` picked. This is why sprint 2's local-first
design paid off here: adding a second whole backend was purely additive.

**What this buys, concretely**: `server/README.md` walks through running
MariaDB directly on Termux (`pkg install mariadb`) for a fully offline
practice setup with zero external accounts needed, or pointing `DATABASE_URL`
at Supabase's own Postgres connection string (bypassing Supabase's
REST/Auth layer entirely and talking to the same underlying database via
Prisma instead), or MongoDB Atlas's free tier.

**Known real risk, stated plainly**: none of this has run against a live
database (see PROJECT_TASKS.md's "Untested" banner at the top). The design
is sound and each piece was written carefully, but "written carefully" and
"proven to work" are different claims — treat the first real `npm run setup`
+ `npm run dev` against a live database as the actual test, not this write-up.
