// Shared Google Identity Services (GIS) loader + token request, used by
// both Settings.jsx (initial connect) and any screen that pushes data to
// Sheets later (Day Book) so a near-expired token can be silently refreshed
// without duplicating the script-loading logic in two places.

let gisLoadPromise = null;

export function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

/**
 * Opens Google's account picker / consent screen and resolves with a fresh
 * access token scoped to Sheets. This always prompts (GIS's implicit-token
 * flow doesn't silently refresh in the background) — call it lazily, only
 * when a request actually needs a token, not on every page load.
 */
export async function requestSheetsToken(clientId) {
  await loadGis();
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      callback: (resp) => (resp.error ? reject(new Error(resp.error)) : resolve(resp.access_token))
    });
    tokenClient.requestAccessToken();
  });
}

/**
 * Google Sign-In (ID token) flow — separate from requestSheetsToken above,
 * which gets an *access* token for the Sheets API. This gets an *ID* token
 * (a signed JWT proving who the user is), used only in API mode to log in
 * against our own backend (server/src/routes/auth.js verifies it). Supabase
 * mode doesn't need this — Supabase Auth handles Google sign-in itself.
 */
export async function requestGoogleIdToken(clientId) {
  await loadGis();
  return new Promise((resolve, reject) => {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp) => (resp.credential ? resolve(resp.credential) : reject(new Error("No credential returned")))
    });
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        reject(new Error("Google sign-in was closed or blocked. Try again, or check pop-up/third-party cookie settings."));
      }
    });
  });
}

export function extractSheetId(url) {
  const m = String(url || "").match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : (url || "").trim() || null; // allow a bare sheet ID too
}
