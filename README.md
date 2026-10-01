# Corix Tally

A free, browser-based ledger-accounting practice app — vouchers, day book,
trial balance, profit & loss, GST, CSV/Excel import-export, and a built-in
mobile shortcut bar mirroring TallyPrime's real keyboard shortcuts. Runs
entirely as a static site (React + Supabase), installable as a PWA, deployed
free on Vercel.

## 1. One-time accounts to create (free)
1. **Supabase** — supabase.com → New project. Note the **Project URL** and
   **anon public key** (Project Settings → API).
2. **Vercel** — vercel.com → sign in with GitHub.
3. **GitHub** — you'll push this folder to a new repo; Vercel deploys from it.
4. *(Optional, for Google Sheets sync)* **Google Cloud Console** —
   console.cloud.google.com → new project → APIs & Services → Credentials →
   Create OAuth client ID (type: Web application) → add your Vercel URL to
   "Authorized JavaScript origins" → also enable the **Google Sheets API**
   under "APIs & Services > Library".

## 2. Set up the database (2 minutes, no terminal needed)
1. Open your Supabase project → **SQL Editor** → New query.
2. Paste the entire contents of `supabase/schema.sql` → Run.
3. Done — this creates every table, security rule, and the 50,000-entry
   safety cap.

## 3. Environment variables
Copy `.env.example` to `.env` and fill in the three values:
```
cp .env.example .env
```
Then edit `.env` (any text editor works, including `nano .env` in Termux) with:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase step 1.
- `VITE_GOOGLE_CLIENT_ID` from step 4 above (skip if you don't need Sheets sync yet).

## 4. Running this from Termux (light commands only)
You only need to do the install once — it's the one heavy step:
```
pkg install nodejs -y      # once, if Node isn't already on your phone
npm install                # once — this is the slow one, let it finish
```
Day to day, after that:
```
npm run dev                # local preview at the printed localhost URL
```
You generally do **not** need `npm run build` on your phone at all — Vercel
builds it for you in the cloud (step 5). Only run `npm run build` locally if
you want to sanity-check a build before pushing.

## 5. Deploy to Vercel (build happens on Vercel's servers, not your phone)
1. Push this folder to a new GitHub repo (GitHub's mobile-friendly upload,
   or `git init && git add . && git commit -m "init" && git push`).
2. In Vercel: **Add New Project** → import that repo → it auto-detects Vite.
3. Add the same three environment variables from your `.env` under
   **Project Settings → Environment Variables**.
4. Deploy. You get a live `https://your-app.vercel.app` URL.
5. Anyone can now open that URL, sign up, and practice — no install required
   (though they can also "Add to Home Screen" since it's a PWA).

## 6. What's in this repo
```
src/
  lib/          accounting.js (day book/trial balance/P&L math),
                csv.js, excel.js (lazy-loaded import/export),
                shortcuts.js (Tally shortcut map + event bus),
                supabaseClient.js
  components/   Layout, Sidebar, ShortcutBar (the mobile key row),
                DataTable (import/export table), Logo (SVG)
  pages/        Login, Signup, ForgotPassword, Dashboard, Ledgers,
                Vouchers, DayBook, TrialBalance, ProfitLoss, GST, Settings
supabase/
  schema.sql    run once in Supabase's SQL editor
PROJECT_TASKS.md   what's done / what's left — read this every session
ARCHITECTURE.md    why things are built the way they are
```

## 7. If you're continuing this with a fresh Antigravity session
Read `PROJECT_TASKS.md` first, then `ARCHITECTURE.md`. Don't re-run
`npm install` unless a dependency actually changed — it's the slowest
command on a phone. See PROJECT_TASKS.md's "How to use this file" section.

## 8. If you already ran the old schema.sql (before GST/ITR fields)
Open Supabase SQL Editor and run `supabase/migrations/002_gst_itr_fields.sql`
once — it just adds four columns to `vouchers` (party name/GSTIN, place of
supply, invoice number) needed for GSTR-1. Safe to run even if you're not
sure; it's guarded with `IF NOT EXISTS`.

## 9. How data saving works now (local-first)
Every add/edit/delete (ledgers, vouchers) saves to your phone's local
storage instantly — no waiting on network — and syncs to your Supabase
account in the background. A small dot next to the logo in the header shows
this: **brass = syncing, green = fully saved**. If you lose signal mid-edit,
your change is safe and will sync automatically once you're back online;
you don't need to redo anything.

## 10. Bulk-importing vouchers from Excel
On the Vouchers page, "Bulk import vouchers (Excel)" expects one row per
debit/credit line, with these columns (any extra columns are ignored):
```
group_id, date, voucher_type, ledger, debit, credit, narration,
party_name, party_gstin, place_of_supply, invoice_number
```
Give every line of the *same* voucher the same `group_id` (e.g. `V001`) —
that's how the importer knows which rows belong together. A voucher only
imports if its debit and credit lines add up to the same total.

## 11. Running on MySQL, MariaDB, PostgreSQL, or MongoDB instead of Supabase
By default this app talks to Supabase — that's the simplest option and what
you should deploy for other people. If you specifically want a different
database (e.g. fully offline practice on a local MariaDB in Termux), there's
a full guide in `server/README.md`. Short version:
```
cd server
npm install
cp .env.example .env   # set DATABASE_URL, MYSQL_URL, or MONGODB_URI — pick one
npm run setup            # generates the right Prisma client + creates tables
npm run dev                # starts the API on http://localhost:4000
```
Then in the main app's `.env`, add:
```
VITE_BACKEND_MODE=api
VITE_API_URL=http://localhost:4000
```
Restart the frontend (`npm run dev`) after changing this. To switch back to
Supabase, remove those two lines (or set `VITE_BACKEND_MODE=supabase`) and
restart again.

## 12. Company switcher, voucher numbers, printing, audit log
- The company name in the sidebar is now a dropdown — tap it to jump between
  companies without going back to the Dashboard.
- Vouchers get an automatic number (e.g. `PAY-2627-0001`) if you don't set
  one — same scheme in both Supabase mode and the self-hosted API.
- Each voucher has a "Print" link — it opens your browser's print dialog
  with just that voucher formatted cleanly; every phone/desktop browser's
  print dialog offers "Save as PDF" right there, so this doubles as PDF
  export without a heavy PDF library in the app itself.
- "Audit Log" in the sidebar shows every ledger/voucher create, edit, and
  delete for the current company.
