import { buildGSTR1_B2B, buildGSTR1_B2C } from "../lib/gst";
import { formatINR } from "../lib/accounting";
import { exportToCSV } from "../lib/csv";
import { exportToExcel } from "../lib/excel";
import { NoCompany } from "./Ledgers";

export default function GSTR1({ company, data }) {
  if (!company) return <NoCompany />;
  const { vouchers, entries, ledgers } = data;
  const ledgerById = new Map(ledgers.map((l) => [l.id, l]));
  const b2b = buildGSTR1_B2B(vouchers, entries, ledgerById, company);
  const b2c = buildGSTR1_B2C(vouchers, entries, ledgerById);

  const b2bExport = b2b.map((r) => ({
    "GSTIN/UIN of Recipient": r.gstin, "Invoice Number": r.invoiceNumber, "Invoice Date": r.invoiceDate,
    "Invoice Value": r.invoiceValue.toFixed(2), "Place of Supply": r.placeOfSupply, "Rate": r.rate,
    "Taxable Value": r.taxableValue.toFixed(2), "Integrated Tax": r.igst.toFixed(2),
    "Central Tax": r.cgst.toFixed(2), "State/UT Tax": r.sgst.toFixed(2)
  }));
  const b2cExport = b2c.map((r) => ({
    "Place of Supply": company.state || "—", "Rate": r.rate,
    "Taxable Value": r.taxableValue.toFixed(2), "Cess Amount": "0.00"
  }));

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">GSTR-1</h1>
      <p className="text-inkfade text-sm mb-5">Outward supplies for the period, laid out the way the GST offline utility's own tables do.</p>

      <SectionHeader title="Table 4 — B2B Invoices" onCSV={() => exportToCSV(b2bExport, "gstr1-b2b.csv")} onExcel={() => exportToExcel(b2bExport, "gstr1-b2b.xlsx")} />
      <div className="overflow-x-auto rule-line mb-8">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ink">
              <th className="text-left py-2 pr-3">GSTIN</th><th className="text-left py-2 pr-3">Invoice #</th><th className="text-left py-2 pr-3">Date</th>
              <th className="text-right py-2 pr-3">Value</th><th className="text-left py-2 pr-3">POS</th><th className="text-right py-2 pr-3">Rate</th>
              <th className="text-right py-2 pr-3">Taxable</th><th className="text-right py-2 pr-3">IGST</th><th className="text-right py-2 pr-3">CGST</th><th className="text-right py-2 pr-3">SGST</th>
            </tr>
          </thead>
          <tbody>
            {b2b.map((r, i) => (
              <tr key={i} className="rule-line font-tabular">
                <td className="py-2 pr-3">{r.gstin}</td><td className="py-2 pr-3">{r.invoiceNumber}</td><td className="py-2 pr-3">{r.invoiceDate}</td>
                <td className="py-2 pr-3 text-right">{formatINR(r.invoiceValue)}</td><td className="py-2 pr-3">{r.placeOfSupply}</td><td className="py-2 pr-3 text-right">{r.rate}%</td>
                <td className="py-2 pr-3 text-right">{formatINR(r.taxableValue)}</td><td className="py-2 pr-3 text-right">{formatINR(r.igst)}</td>
                <td className="py-2 pr-3 text-right">{formatINR(r.cgst)}</td><td className="py-2 pr-3 text-right">{formatINR(r.sgst)}</td>
              </tr>
            ))}
            {b2b.length === 0 && <tr><td colSpan={10} className="py-6 text-center text-inkfade">No B2B sales yet — add a GSTIN on a sales voucher.</td></tr>}
          </tbody>
        </table>
      </div>

      <SectionHeader title="Table 7 — B2C (Others)" onCSV={() => exportToCSV(b2cExport, "gstr1-b2c.csv")} onExcel={() => exportToExcel(b2cExport, "gstr1-b2c.xlsx")} />
      <div className="overflow-x-auto rule-line">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ink"><th className="text-left py-2 pr-3">Place of Supply</th><th className="text-right py-2 pr-3">Rate</th><th className="text-right py-2 pr-3">Taxable Value</th></tr></thead>
          <tbody>
            {b2c.map((r, i) => (
              <tr key={i} className="rule-line font-tabular">
                <td className="py-2 pr-3">{company.state || "—"}</td><td className="py-2 pr-3 text-right">{r.rate}%</td><td className="py-2 pr-3 text-right">{formatINR(r.taxableValue)}</td>
              </tr>
            ))}
            {b2c.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-inkfade text-sm">No B2C sales yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionHeader({ title, onCSV, onExcel }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
      <h2 className="font-display text-lg">{title}</h2>
      <div className="flex gap-2">
        <button onClick={onCSV} className="text-xs px-2.5 py-1 rounded-sm border border-ink">CSV</button>
        <button onClick={onExcel} className="text-xs px-2.5 py-1 rounded-sm border border-ink">Excel</button>
      </div>
    </div>
  );
}
