// Which database this server talks to is decided entirely by which
// connection-string env var is set — nothing to configure in code, and
// nothing the frontend can silently change (a database choice is a
// deployment-time decision, not a per-request one). Priority when more
// than one happens to be set: Mongo > MySQL/MariaDB > Postgres.
export function detectProvider() {
  if (process.env.MONGODB_URI) return { family: "mongo", label: "MongoDB" };
  if (process.env.MYSQL_URL) return { family: "relational", engine: "mysql", label: "MySQL / MariaDB" };
  if (process.env.DATABASE_URL) return { family: "relational", engine: "postgresql", label: "PostgreSQL (or Supabase's Postgres)" };
  throw new Error(
    "No database configured. Set exactly one of DATABASE_URL, MYSQL_URL, or MONGODB_URI in server/.env — see server/.env.example."
  );
}
