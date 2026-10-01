import { useEffect, useState } from "react";
import { backend } from "../lib/backend";
import { requestSheetsToken, extractSheetId } from "../lib/googleAuth";

export default function Settings({ user }) {
  const [profile, setProfile] = useState(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!user) return;
    backend.data.getProfile().then(setProfile);
  }, [user?.id]);

  async function connectGoogle() {
    setConnecting(true);
    setStatus("");
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setStatus("Add VITE_GOOGLE_CLIENT_ID to your .env first (see README).");
      setConnecting(false);
      return;
    }
    try {
      const token = await requestSheetsToken(clientId);
      const sheetId = extractSheetId(sheetUrl);
      if (!sheetId) {
        setStatus("Paste a valid Google Sheet link first.");
        setConnecting(false);
        return;
      }
      await backend.data.updateProfile({ google_access_token: token, google_sheet_id: sheetId });
      setProfile((p) => ({ ...p, google_access_token: token, google_sheet_id: sheetId }));
      setStatus("Connected. Use \"Push to Sheet\" on Day Book to send data there.");
    } catch (e) {
      setStatus(e.message || "Could not connect to Google.");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="font-display text-2xl mb-1">Settings</h1>
      <p className="text-inkfade text-sm mb-6">{user?.email}</p>

      <section className="rule-line pb-5 mb-5">
        <h2 className="font-display text-lg mb-2">Connect Google Sheets</h2>
        <p className="text-sm text-inkfade mb-3">
          Paste a Google Sheet link you can edit, then connect. Push data to it any time from Day Book.
        </p>
        <input
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          className="w-full rounded-sm border border-rule px-3 py-2 text-sm mb-2"
        />
        <button onClick={connectGoogle} disabled={connecting} className="bg-ink text-paper rounded-sm px-4 py-2 text-sm">
          {connecting ? "Connecting…" : profile?.google_sheet_id ? "Reconnect" : "Connect with Google"}
        </button>
        {profile?.google_sheet_id && <p className="text-xs text-credit mt-2">Currently connected.</p>}
        {status && <p className="text-xs text-inkfade mt-2">{status}</p>}
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Practice data limit</h2>
        <p className="text-sm text-inkfade">Free plan: up to {profile?.entry_limit ?? 50000} voucher entries across all your companies.</p>
      </section>
    </div>
  );
}
