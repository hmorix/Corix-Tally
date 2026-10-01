import { buildTrialBalance, formatINR } from "../lib/accounting";
import { exportToCSV } from "../lib/csv";
import { exportToExcel } from "../lib/excel";
import { NoCompany } from "./Ledgers";

export default function TrialBalance({ company, data }) {
  if (!company) return <NoCompany />;
  const { ledgers, entries } = data;
  const rows = buildTrialBalance(ledgers, entries);
  const totals = { debit: rows.reduce((s, r) => s + r.debit, 0), credit: rows.reduce((s, r) => s + r.credit, 0) };
  const exportRows = rows.map((r) => ({ ledger: r.name, debit: r.debit, credit: r.credit }));

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Trial Balance</h1>
      <p className="text-inkfade text-sm mb-4">Closing balance of every ledger. The two totals should always match.</p>

      <div className="flex gap-2 mb-4">
        <button onClick={() => exportToCSV(exportRows, "trial-balance.csv")} className="text-xs px-3 py-1.5 rounded-sm border border-ink">Export CSV</button>
        <button onClick={() => exportToExcel(exportRows, "trial-balance.xlsx")} className="text-xs px-3 py-1.5 rounded-sm border border-ink">Export Excel</button>
      </div>

      <div className="overflow-x-auto rule-line">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ink"><th className="text-left py-2 pr-4">Ledger</th><th className="text-right py-2 pr-4">Debit</th><th className="text-right py-2 pr-4">Credit</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ledgerId} className="rule-line">
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 pr-4 text-right font-tabular">{r.debit ? formatINR(r.debit) : ""}</td>
                <td className="py-2 pr-4 text-right font-tabular">{r.credit ? formatINR(r.credit) : ""}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-inkfade text-sm">No ledgers yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between mt-3 pt-3 border-t-2 border-ink font-tabular font-medium">
        <span>Total</span>
        <span className={totals.debit === totals.credit ? "text-credit" : "text-seal"}>Dr {formatINR(totals.debit)} · Cr {formatINR(totals.credit)}</span>
      </div>
    </div>
  );
}
