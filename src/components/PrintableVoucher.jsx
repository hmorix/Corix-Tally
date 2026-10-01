import { formatINR } from "../lib/accounting";

/**
 * Renders off-screen (see the @media print rules in index.css) and is only
 * shown to the browser's print pipeline — clicking "Print / Save as PDF"
 * calls window.print(), and every OS/browser offers "Save as PDF" right in
 * that same dialog. This avoids pulling in a PDF-generation library (they
 * run 100–300KB+) for something the browser already does for free.
 */
export default function PrintableVoucher({ voucher, lines, ledgerById, company }) {
  if (!voucher) return null;
  const total = lines.reduce((s, l) => s + Number(l.debit || 0), 0);

  return (
    <div id="printable-voucher">
      <div className="p-8 font-body text-ink">
        <div className="flex justify-between items-start mb-6 border-b-2 border-ink pb-3">
          <div>
            <h1 className="font-display text-xl">{company?.name}</h1>
            {company?.gstin && <p className="text-xs font-tabular">GSTIN: {company.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="font-display text-lg capitalize">{voucher.voucher_type} Voucher</p>
            <p className="text-xs font-tabular">{voucher.voucher_number}</p>
            <p className="text-xs font-tabular">{voucher.voucher_date}</p>
          </div>
        </div>

        {(voucher.party_name || voucher.party_gstin) && (
          <div className="mb-4 text-sm">
            {voucher.party_name && <p><strong>Party:</strong> {voucher.party_name}</p>}
            {voucher.party_gstin && <p className="font-tabular"><strong>GSTIN:</strong> {voucher.party_gstin}</p>}
            {voucher.place_of_supply && <p><strong>Place of supply:</strong> {voucher.place_of_supply}</p>}
            {voucher.invoice_number && <p className="font-tabular"><strong>Invoice #:</strong> {voucher.invoice_number}</p>}
          </div>
        )}

        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b border-ink"><th className="text-left py-1.5">Ledger</th><th className="text-right py-1.5">Debit</th><th className="text-right py-1.5">Credit</th></tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-rule">
                <td className="py-1.5">{ledgerById.get(l.ledger_id)?.name || "—"}</td>
                <td className="py-1.5 text-right font-tabular">{l.debit ? formatINR(l.debit) : ""}</td>
                <td className="py-1.5 text-right font-tabular">{l.credit ? formatINR(l.credit) : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-medium border-t-2 border-ink"><td className="py-1.5">Total</td><td className="py-1.5 text-right font-tabular">{formatINR(total)}</td><td className="py-1.5 text-right font-tabular">{formatINR(total)}</td></tr>
          </tfoot>
        </table>

        {voucher.narration && <p className="text-sm italic">{voucher.narration}</p>}

        <div className="flex justify-between mt-16 text-sm">
          <div>Prepared by: ______________</div>
          <div>Authorised signatory: ______________</div>
        </div>
      </div>
    </div>
  );
}
