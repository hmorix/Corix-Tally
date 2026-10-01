// Which backend the frontend talks to — decided once, at build/start time,
// via an env var. This is deliberately NOT a runtime-toggleable setting:
// switching your actual database is an operator decision (see server/README.md),
// not something to expose as a button in the UI that could be clicked by
// accident. Default is 'supabase' — that's what you deploy for other people.
export const BACKEND_MODE = (import.meta.env.VITE_BACKEND_MODE || "supabase").toLowerCase();
export const isApiMode = BACKEND_MODE === "api";
