// Single import point the rest of the app uses — everything else (useAuth,
// useCompanyData, Dashboard) calls `backend.auth.*` / `backend.data.*` and
// never imports supabaseClient.js or apiClient.js directly. Which real
// implementation answers those calls is decided once here, from
// VITE_BACKEND_MODE (see backendMode.js) — swap the whole database/backend
// stack without touching a single page component.
import { isApiMode } from "./backendMode";
import { supabaseBackend } from "./backendSupabase";
import { apiBackend } from "./backendApi";

export const backend = isApiMode ? apiBackend : supabaseBackend;
