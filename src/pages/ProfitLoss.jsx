import { buildProfitAndLoss, formatINR } from "../lib/accounting";
import { NoCompany } from "./Ledgers";

export default function ProfitLoss({ company, data }) {
  if (!company) return <NoCompany />;
  const { ledgers, entries, groups } = data;
  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const result = buildProfitAndLoss(ledgers, entries, groupsById);

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl mb-1">Profit & Loss</h1>
      <p className="text-inkfade text-sm mb-5">Income and expense ledgers only, netted to the period's result.</p>
      <Section title="Income" rows={result.income} total={result.totalIncome} />
      <Section title="Expense" rows={result.expense} total={result.totalExpense} />
      <div className="flex justify-between mt-5 pt-3 border-t-2 border-ink font-tabular font-medium">
        <span>{result.netProfit >= 0 ? "Net Profit" : "Net Loss"}</span>
        <span className={result.netProfit >= 0 ? "text-credit" : "text-seal"}>{formatINR(Math.abs(result.netProfit))}</span>
      </div>
    </div>
  );
}

function Section({ title, rows, total }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-lg mb-2">{title}</h2>
      {rows.map((r) => (
        <div key={r.name} className="flex justify-between text-sm rule-line py-1.5">
          <span>{r.name}</span><span className="font-tabular">{formatINR(r.amount)}</span>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-inkfade">None yet.</p>}
      <div className="flex justify-between text-sm font-medium pt-1"><span>Total</span><span className="font-tabular">{formatINR(total)}</span></div>
    </div>
  );
}
