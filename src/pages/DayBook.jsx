import { useState } from "react";
import { buildDayBook, formatINR } from "../lib/accounting";
import { exportToCSV } from "../lib/csv";
import { exportToExcel } from "../lib/excel";
import { backend } from "../lib/backend";
import { requestSheetsToken } from "../lib/googleAuth";
import { pushRowsToSheet } from "../lib/googleSheets";
import { NoCompany } from "./Ledgers";
import { useEffect } from "react";

const TYPE_COLORS = {
  contra:  "bg-purple-100 text-purple-700",
  payment: "bg-red-100 text-red-700",
  receipt: "bg-green-100 text-green-700",
  journal: "bg-blue-100 text-blue-700",
  sales:   "bg-amber-100 text-amber-700",
  purchase:"bg-slate-100 text-slate-700",
};

export default function DayBook({ company, data, user }) {
  const [profile, setProfile]   = useState(null);
  const [pushing, setPushing]   = useState(false);
  const [pushMsg, setPushMsg]   = useState("");
  const [search,  setSearch]    = useState("");
  const [dateFrom,setDateFrom]  = useState("");
  const [dateTo,  setDateTo]    = useState("");
  const [expanded,setExpanded]  = useState({}); // voucher id → bool

  useEffect(() => {
    if (!user) return;
    backend.data.getProfile().then(setProfile);
  }, [user?.id]);

  if (!company) return <NoCompany />;

  const { vouchers, entries, ledgers } = data;
  const ledgerById = new Map(ledgers.map((l) => [l.id, l]));
  const rows       = buildDayBook(vouchers, entries, ledgerById);

  const flatForExport = rows.flatMap((v) =>
    v.entries.map((e) => ({
      date: v.voucher_date, voucherNumber: v.voucher_number || "",
      type: v.voucher_type, ledger: e.ledgerName,
      debit: e.debit, credit: e.credit, narration: v.narration || "",
    }))
  );

  // Filter
  const filtered = rows
    .slice()
    .reverse()
    .filter((v) => {
      const matchSearch = !search ||
        v.narration?.toLowerCase().includes(search.toLowerCase()) ||
        v.voucher_number?.toLowerCase().includes(search.toLowerCase()) ||
        v.entries.some((e) => e.ledgerName?.toLowerCase().includes(search.toLowerCase()));
      const matchFrom = !dateFrom || v.voucher_date >= dateFrom;
      const matchTo   = !dateTo   || v.voucher_date <= dateTo;
      return matchSearch && matchFrom && matchTo;
    });

  // Summary
  const totalDr = flatForExport.reduce((s, r) => s + Number(r.debit || 0), 0);
  const totalCr = flatForExport.reduce((s, r) => s + Number(r.credit || 0), 0);

  async function pushToSheet() {
    if (!profile?.google_sheet_id) { setPushMsg("Connect a Google Sheet first in Settings."); return; }
    if (!flatForExport.length)      { setPushMsg("Nothing to push yet."); return; }
    setPushing(true); setPushMsg("");
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
        } else { throw err; }
      }
      setPushMsg(`✓ Pushed ${flatForExport.length} rows to Google Sheet.`);
    } catch (e) {
      setPushMsg(e.message || "Could not push to Sheet.");
    } finally {
      setPushing(false);
    }
  }

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold">Day Book</h1>
          <p className="text-inkFade text-sm mt-0.5">Every voucher in date order</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(flatForExport, "day-book.csv")}    className="btn-secondary text-sm py-1.5">⬇ CSV</button>
          <button onClick={() => exportToExcel(flatForExport, "day-book.xlsx")} className="btn-secondary text-sm py-1.5">⬇ Excel</button>
          <button onClick={pushToSheet} disabled={pushing} className="btn-primary text-sm py-1.5">
            {pushing ? "Pushing…" : "📤 Google Sheet"}
          </button>
        </div>
      </div>

      {pushMsg && (
        <div className="tp-card p-3 mb-4 bg-tp-blue/5 border-tp-blue/20 text-sm text-tp-blue animate-fade-in">
          {pushMsg}
        </div>
      )}

      {/* ── Summary row ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <StatChip label="Total Vouchers"   value={rows.length}        color="bg-tp-blue/10 text-tp-blue" />
        <StatChip label="Total Dr"         value={formatINR(totalDr)} color="bg-sealBg text-seal"    mono />
        <StatChip label="Total Cr"         value={formatINR(totalCr)} color="bg-creditBg text-credit" mono />
      </div>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  Search ledger, narration, number…"
          className="tp-input flex-1 min-w-48 py-1.5 text-sm"
        />
        <label className="text-xs text-inkFade font-medium flex items-center gap-1">
          From
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="tp-input py-1 ml-1 text-sm font-tabular" style={{ width: "140px" }} />
        </label>
        <label className="text-xs text-inkFade font-medium flex items-center gap-1">
          To
          <input type="date" value={dateTo}   onChange={(e) => setDateTo(e.target.value)}   className="tp-input py-1 ml-1 text-sm font-tabular" style={{ width: "140px" }} />
        </label>
        {(search || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }} className="btn-ghost text-xs">
            Clear filters
          </button>
        )}
      </div>

      {/* ── Voucher cards ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {filtered.map((v) => {
          const open   = !!expanded[v.id];
          const typeColor = TYPE_COLORS[v.voucher_type] || "bg-gray-100 text-gray-700";
          const totalDrV  = v.entries.reduce((s, e) => s + Number(e.debit  || 0), 0);
          const totalCrV  = v.entries.reduce((s, e) => s + Number(e.credit || 0), 0);
          return (
            <div key={v.id} className="tp-card rounded-lg overflow-hidden">
              {/* Header row */}
              <button
                type="button"
                onClick={() => toggleExpand(v.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-tp-blue/3 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor} shrink-0`}>
                    {v.voucher_type.charAt(0).toUpperCase() + v.voucher_type.slice(1)}
                  </span>
                  <span className="text-xs font-tabular text-inkFade shrink-0">{v.voucher_number}</span>
                  {v.narration && (
                    <span className="text-xs text-inkFade truncate italic">{v.narration}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-tabular font-semibold text-ink">{formatINR(totalDrV)}</span>
                  <span className="text-xs font-tabular text-inkFade">{v.voucher_date}</span>
                  <span className="text-inkFade text-sm">{open ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Expanded entry lines */}
              {open && (
                <div className="border-t border-rule animate-slide-up">
                  <div className="grid grid-cols-[1fr_120px_120px] text-xs text-inkFade bg-tp-navy/5 px-4 py-1.5 font-medium">
                    <span>Ledger</span>
                    <span className="text-right">Debit</span>
                    <span className="text-right">Credit</span>
                  </div>
                  {v.entries.map((e) => (
                    <div key={e.id} className="grid grid-cols-[1fr_120px_120px] text-sm px-4 py-1.5 border-t border-rule/40">
                      <span className="text-ink">{e.ledgerName}</span>
                      <span className="text-right font-tabular text-seal">
                        {e.debit ? formatINR(e.debit) : ""}
                      </span>
                      <span className="text-right font-tabular text-credit">
                        {e.credit ? formatINR(e.credit) : ""}
                      </span>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_120px_120px] text-sm px-4 py-2 bg-tp-navy/5 font-semibold border-t border-rule">
                    <span className="text-inkFade text-xs">Total</span>
                    <span className="text-right font-tabular text-seal">{formatINR(totalDrV)}</span>
                    <span className="text-right font-tabular text-credit">{formatINR(totalCrV)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="tp-card p-10 text-center text-inkFade text-sm">
            {rows.length === 0 ? "No vouchers yet." : "No results for current filters."}
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value, color, mono }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-rule ${color}`}>
      <span className="text-xs opacity-70">{label}</span>
      <span className={`text-sm font-semibold ${mono ? "font-tabular" : ""}`}>{value}</span>
    </div>
  );
}
