# Corix Tally API server

An optional, self-hosted backend that lets Corix Tally run on **Postgres,
MySQL, MariaDB, or MongoDB** instead of Supabase — useful for practicing
fully offline on your own device, or self-hosting on any server you control.

**You do not need this to use Corix Tally normally.** The main app (the
`corix-tally` folder one level up) talks to Supabase directly by default —
that's simpler and is what you should deploy for other people. Only set
this server up if you specifically want a different database.

## How database selection works
The server looks at your `.env` file and picks a database based on which
ONE of these three variables is set:

| Set this | Server uses |
|---|---|
| `DATABASE_URL` | PostgreSQL — a local Postgres install, **or Supabase's own Postgres connection string** (Supabase dashboard → Project Settings → Database → Connection string → URI). Either way it's genuinely the same database engine underneath. |
| `MYSQL_URL` | MySQL or MariaDB (same driver — MariaDB is wire-protocol compatible with MySQL) |
| `MONGODB_URI` | MongoDB (local, or a free Atlas cluster) |

Only set ONE. If you set more than one, Mongo wins, then MySQL, then
Postgres (see `src/lib/detectProvider.js`).

## Setting up MariaDB locally on Termux (the "mobile, no laptop" path)
```
pkg install mariadb -y
mariadbd-safe &              # start the database server in the background
mariadb -u root              # opens a SQL prompt
```
Inside that prompt:
```sql
CREATE DATABASE corix_tally;
CREATE USER 'corix'@'localhost' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON corix_tally.* TO 'corix'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
Then in `server/.env`:
```
MYSQL_URL="mysql://corix:choose-a-password@localhost:3306/corix_tally"
```

## Setting up PostgreSQL locally on Termux
```
pkg install postgresql -y
initdb $PREFIX/var/lib/postgresql
pg_ctl -D $PREFIX/var/lib/postgresql start
createdb corix_tally
```
Then in `.env`: `DATABASE_URL="postgresql://localhost:5432/corix_tally"`

## Using Supabase's Postgres directly (no Supabase Auth/PostgREST involved)
Supabase → Project Settings → Database → Connection string → URI. Paste
that as `DATABASE_URL`. This server will create its own tables there (via
`npm run setup`) — separate from the `public.*` tables the main Supabase
app uses, so this doesn't touch or conflict with your existing Supabase
setup. This is really only useful if you want ONE Postgres database shared
between both backends' worth of tables; most people should just pick one
approach and stick with it.

## MongoDB Atlas (free tier)
Create a free cluster at mongodb.com/cloud/atlas, get its connection string,
set `MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/corix_tally"`.

## First-time setup (after choosing a database above)
```
cd server
npm install          # the one heavy step — let it finish
cp .env.example .env # then edit .env with your chosen DB + JWT_SECRET
npm run setup         # generates the right Prisma client + creates tables
npm run dev            # starts the API on http://localhost:4000
```

## Pointing the frontend at this server
In the main app's `.env` (the `corix-tally` folder, not this one):
```
VITE_BACKEND_MODE=api
VITE_API_URL=http://localhost:4000
```
Restart `npm run dev` in the main app after changing this — Vite env vars
are read at build/start time, not live. Leave `VITE_BACKEND_MODE` unset (or
set to `supabase`) to go back to the default Supabase-backed mode.

## What this server does NOT do (yet)
- No email sending for password resets — see the comment in
  `src/routes/auth.js`. It logs a reset token to the console instead.
- No Google Sheets push endpoint — that feature currently only works in
  Supabase mode (see PROJECT_TASKS.md in the main app).
- No rate limiting / brute-force protection on login — fine for personal/
  practice use, not something to expose publicly as-is.
