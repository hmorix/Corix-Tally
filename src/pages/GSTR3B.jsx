import { buildGSTR3B } from "../lib/gst";
import { formatINR } from "../lib/accounting";
import { exportToCSV } from "../lib/csv";
import { exportToExcel } from "../lib/excel";
import { NoCompany } from "./Ledgers";

export default function GSTR3B({ company, data }) {
  if (!company) return <NoCompany />;
  const { vouchers, entries, ledgers } = data;
  const ledgerById = new Map(ledgers.map((l) => [l.id, l]));
  const r = buildGSTR3B(vouchers, entries, ledgerById);

  const exportRows = [
    { section: "3.1(a) Outward taxable supplies", taxable: r.section3_1.taxableValue, igst: r.section3_1.igst, cgst: r.section3_1.cgst, sgst: r.section3_1.sgst },
    { section: "4. Eligible ITC", taxable: "", igst: r.section4_itc.igst, cgst: r.section4_itc.cgst, sgst: r.section4_itc.sgst },
    { section: "6.1 Tax payable", taxable: r.section6_1.taxPayable, igst: "", cgst: "", sgst: "" },
    { section: "6.1 Paid through ITC", taxable: r.section6_1.paidThroughITC, igst: "", cgst: "", sgst: "" },
    { section: "6.1 Paid in cash", taxable: r.section6_1.paidInCash, igst: "", cgst: "", sgst: "" }
  ];

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl mb-1">GSTR-3B</h1>
      <p className="text-inkfade text-sm mb-5">Monthly summary return — the standard sections, computed from this period's vouchers.</p>

      <div className="flex gap-2 mb-5">
        <button onClick={() => exportToCSV(exportRows, "gstr3b.csv")} className="text-xs px-3 py-1.5 rounded-sm border border-ink">Export CSV</button>
        <button onClick={() => exportToExcel(exportRows, "gstr3b.xlsx")} className="text-xs px-3 py-1.5 rounded-sm border border-ink">Export Excel</button>
      </div>

      <Block title="3.1 — Outward taxable supplies">
        <Row label="Taxable value" value={formatINR(r.section3_1.taxableValue)} />
        <Row label="Integrated Tax (IGST)" value={formatINR(r.section3_1.igst)} />
        <Row label="Central Tax (CGST)" value={formatINR(r.section3_1.cgst)} />
        <Row label="State/UT Tax (SGST)" value={formatINR(r.section3_1.sgst)} />
      </Block>

      <Block title="4 — Eligible ITC">
        <Row label="IGST" value={formatINR(r.section4_itc.igst)} />
        <Row label="CGST" value={formatINR(r.section4_itc.cgst)} />
        <Row label="SGST" value={formatINR(r.section4_itc.sgst)} />
        <Row label="Net ITC available" value={formatINR(r.section4_itc.total)} bold />
      </Block>

      <Block title="6.1 — Payment of tax">
        <Row label="Tax payable" value={formatINR(r.section6_1.taxPayable)} />
        <Row label="Paid through ITC" value={formatINR(r.section6_1.paidThroughITC)} />
        <Row label="Paid in cash" value={formatINR(r.section6_1.paidInCash)} bold />
      </Block>

      <p className="text-xs text-inkfade mt-4">
        Practice figures only — this doesn't include RCM, exempt/nil-rated supplies, or ITC reversal,
        which the real GSTR-3B also asks for.
      </p>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-lg mb-2">{title}</h2>
      <div className="rule-line">{children}</div>
    </div>
  );
}
function Row({ label, value, bold }) {
  return (
    <div className={"flex justify-between text-sm py-1.5 " + (bold ? "font-medium" : "")}>
      <span>{label}</span><span className="font-tabular">{value}</span>
    </div>
  );
}
