import { useEffect, useState } from "react";
import { buildDayBook, formatINR } from "../lib/accounting";
import { exportToCSV } from "../lib/csv";
import { exportToExcel } from "../lib/excel";
import { backend } from "../lib/backend";
import { requestSheetsToken } from "../lib/googleAuth";
import { pushRowsToSheet } from "../lib/googleSheets";
import { NoCompany } from "./Ledgers";

export default function DayBook({ company, data, user }) {
  const [profile, setProfile] = useState(null);
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    backend.data.getProfile().then(setProfile);
  }, [user?.id]);

  if (!company) return <NoCompany />;
  const { vouchers, entries, ledgers } = data;
  const ledgerById = new Map(ledgers.map((l) => [l.id, l]));
  const rows = buildDayBook(vouchers, entries, ledgerById);

  const flatForExport = rows.flatMap((v) =>
    v.entries.map((e) => ({ date: v.voucher_date, voucherNumber: v.voucher_number || "", type: v.voucher_type, ledger: e.ledgerName, debit: e.debit, credit: e.credit, narration: v.narration || "" }))
  );

  async function pushToSheet() {
    if (!profile?.google_sheet_id) { setPushMsg("Connect a Google Sheet first, in Settings."); return; }
    if (!flatForExport.length) { setPushMsg("Nothing to push yet."); return; }
    setPushing(true);
    setPushMsg("");
    try {
      let token = profile.google_access_token;
      try {
        await pushRowsToSheet(token, profile.google_sheet_id, flatForExport, { sheetName: "Day Book" });
      } catch (err) {
        if (err.status === 401) {
          const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
          token = await requestSheetsToken(clientId);
          await backend.data.updateProfile({ google_access_token: token });
          setProfile((p) => ({ ...p, google_access_token: token }));
          await pushRowsToSheet(token, profile.google_sheet_id, flatForExport, { sheetName: "Day Book" });
        } else {
          throw err;
        }
      }
      setPushMsg(`Pushed ${flatForExport.length} rows to your Sheet.`);
    } catch (e) {
      setPushMsg(e.message || "Could not push to Sheet.");
    } finally {
      setPushing(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Day Book</h1>
      <p className="text-inkfade text-sm mb-4">Every voucher, in date order.</p>

      <div className="flex flex-wrap gap-2 mb-2">
        <button onClick={() => exportToCSV(flatForExport, "day-book.csv")} className="text-xs px-3 py-1.5 rounded-sm border border-ink">Export CSV</button>
        <button onClick={() => exportToExcel(flatForExport, "day-book.xlsx")} className="text-xs px-3 py-1.5 rounded-sm border border-ink">Export Excel</button>
        <button onClick={pushToSheet} disabled={pushing} className="text-xs px-3 py-1.5 rounded-sm border border-brass text-brass">
          {pushing ? "Pushing…" : "Push to Google Sheet"}
        </button>
      </div>
      {pushMsg && <p className="text-xs text-inkfade mb-4">{pushMsg}</p>}

      <div className="flex flex-col gap-4">
        {rows.slice().reverse().map((v) => (
          <div key={v.id} className="rule-line pb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="capitalize font-medium">{v.voucher_type} <span className="text-inkfade font-tabular text-xs">{v.voucher_number}</span></span>
              <span className="font-tabular text-inkfade">{v.voucher_date}</span>
            </div>
            {v.entries.map((e) => (
              <div key={e.id} className="flex justify-between text-sm text-inkfade">
                <span>{e.ledgerName}</span>
                <span className="font-tabular">{e.debit ? `Dr ${formatINR(e.debit)}` : `Cr ${formatINR(e.credit)}`}</span>
              </div>
            ))}
            {v.narration && <p className="text-xs text-inkfade mt-1 italic">{v.narration}</p>}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-inkfade">No vouchers yet.</p>}
      </div>
    </div>
  );
}
