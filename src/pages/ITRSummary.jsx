import { buildProfitAndLoss, buildTrialBalance, formatINR } from "../lib/accounting";
import { buildScheduleBP, buildScheduleBS, flattenForExport } from "../lib/itr";
import { exportToCSV } from "../lib/csv";
import { exportToExcel } from "../lib/excel";
import { NoCompany } from "./Ledgers";

export default function ITRSummary({ company, data }) {
  if (!company) return <NoCompany />;
  const { ledgers, entries, groups } = data;
  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const ledgerById = new Map(ledgers.map((l) => [l.id, l]));

  const pnl = buildProfitAndLoss(ledgers, entries, groupsById);
  const tb = buildTrialBalance(ledgers, entries);
  const bp = buildScheduleBP(pnl);
  const bs = buildScheduleBS(tb, ledgerById, groupsById);
  const exportRows = flattenForExport(bp, bs);

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl mb-1">ITR computation summary</h1>
      <p className="text-inkfade text-sm mb-2">
        Schedule BP (Business &amp; Profession) and a Balance Sheet extract, built from this
        company's books — laid out the way those schedules read on the return.
      </p>
      <p className="text-xs text-seal mb-5">
        Important: the income-tax portal doesn't accept a bulk CSV upload the way GST's offline
        utility does — ITRs are filed through the portal's own utility/JSON, usually with a CA.
        This export is a computation sheet to transcribe from, not a filing itself.
      </p>

      <div className="flex gap-2 mb-6">
        <button onClick={() => exportToCSV(exportRows, "itr-computation.csv")} className="text-xs px-3 py-1.5 rounded-sm border border-ink">Export CSV</button>
        <button onClick={() => exportToExcel(exportRows, "itr-computation.xlsx")} className="text-xs px-3 py-1.5 rounded-sm border border-ink">Export Excel</button>
      </div>

      <h2 className="font-display text-lg mb-2">Schedule BP</h2>
      <div className="rule-line mb-6">
        {bp.rows.map((r, i) => (
          <div key={i} className={"flex justify-between text-sm py-1.5 " + (r.particulars.startsWith("Net") ? "font-medium border-t border-ink" : "")}>
            <span>{r.particulars}</span><span className="font-tabular">{formatINR(r.amount)}</span>
          </div>
        ))}
      </div>

      <h2 className="font-display text-lg mb-2">Schedule BS — Assets</h2>
      <div className="rule-line mb-2">
        {bs.assets.map((r) => (
          <div key={r.name} className="flex justify-between text-sm py-1.5"><span>{r.name}</span><span className="font-tabular">{formatINR(r.amount)}</span></div>
        ))}
        <div className="flex justify-between text-sm font-medium py-1.5"><span>Total assets</span><span className="font-tabular">{formatINR(bs.totalAssets)}</span></div>
      </div>

      <h2 className="font-display text-lg mb-2 mt-4">Schedule BS — Liabilities</h2>
      <div className="rule-line">
        {bs.liabilities.map((r) => (
          <div key={r.name} className="flex justify-between text-sm py-1.5"><span>{r.name}</span><span className="font-tabular">{formatINR(r.amount)}</span></div>
        ))}
        <div className="flex justify-between text-sm font-medium py-1.5"><span>Total liabilities</span><span className="font-tabular">{formatINR(bs.totalLiabilities)}</span></div>
      </div>
    </div>
  );
}
