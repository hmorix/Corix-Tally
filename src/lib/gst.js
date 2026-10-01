// Real GSTR-1 / GSTR-3B table shapes, built from vouchers + ledgers.
// Column names match the GST offline utility's own CSV templates as closely
// as a practice app reasonably can — good for learning the actual return
// layout, not a substitute for the official offline tool when you file for
// real. Assumption: 'sales' vouchers = outward supply, 'purchase' vouchers
// = inward supply / ITC. GST rate is read from the ledger, not per-line.

const RATE_SLABS = [0, 0.25, 3, 5, 12, 18, 28];

function taxableAndTax(amount, ratePct) {
  const taxable = amount / (1 + ratePct / 100);
  return { taxable, tax: amount - taxable };
}

/**
 * GSTR-1 Table 4 (B2B invoices) — one row per sales voucher that has a
 * recipient GSTIN recorded. Splits IGST vs CGST+SGST by whether the voucher's
 * place_of_supply matches the company's own state (same state = intra-state
 * = CGST+SGST; different = inter-state = IGST). Falls back to CGST+SGST if
 * state info is missing (most common case for practice data).
 */
export function buildGSTR1_B2B(vouchers, entries, ledgerById, company) {
  const entriesByVoucher = groupBy(entries, "voucher_id");
  return vouchers
    .filter((v) => v.voucher_type === "sales" && v.party_gstin)
    .map((v) => {
      const rows = entriesByVoucher[v.id] || [];
      const amount = rows.reduce((s, r) => s + Number(r.debit || 0) + Number(r.credit || 0), 0) / 2;
      const ledgerWithRate = rows.map((r) => ledgerById.get(r.ledger_id)).find((l) => l?.gst_rate != null);
      const rate = ledgerWithRate?.gst_rate ?? 0;
      const { taxable, tax } = taxableAndTax(amount, rate);
      const interState = company?.state && v.place_of_supply && company.state !== v.place_of_supply;
      return {
        gstin: v.party_gstin,
        invoiceNumber: v.invoice_number || "—",
        invoiceDate: v.voucher_date,
        invoiceValue: amount,
        placeOfSupply: v.place_of_supply || company?.state || "—",
        rate,
        taxableValue: taxable,
        igst: interState ? tax : 0,
        cgst: interState ? 0 : tax / 2,
        sgst: interState ? 0 : tax / 2
      };
    });
}

/** GSTR-1 Table 7 (B2C small) — sales with no recipient GSTIN, grouped by rate. */
export function buildGSTR1_B2C(vouchers, entries, ledgerById) {
  const entriesByVoucher = groupBy(entries, "voucher_id");
  const byRate = new Map(RATE_SLABS.map((r) => [r, { rate: r, taxableValue: 0, tax: 0 }]));

  for (const v of vouchers) {
    if (v.voucher_type !== "sales" || v.party_gstin) continue;
    const rows = entriesByVoucher[v.id] || [];
    const amount = rows.reduce((s, r) => s + Number(r.debit || 0) + Number(r.credit || 0), 0) / 2;
    const ledgerWithRate = rows.map((r) => ledgerById.get(r.ledger_id)).find((l) => l?.gst_rate != null);
    const rate = ledgerWithRate?.gst_rate ?? 0;
    const { taxable, tax } = taxableAndTax(amount, rate);
    if (!byRate.has(rate)) byRate.set(rate, { rate, taxableValue: 0, tax: 0 });
    const bucket = byRate.get(rate);
    bucket.taxableValue += taxable;
    bucket.tax += tax;
  }
  return [...byRate.values()].filter((r) => r.taxableValue > 0);
}

/**
 * GSTR-3B — the monthly summary return. Returns the standard sections:
 * 3.1 outward supplies, 4 ITC, 6.1 net tax payable.
 */
export function buildGSTR3B(vouchers, entries, ledgerById) {
  const entriesByVoucher = groupBy(entries, "voucher_id");
  let outwardTaxable = 0, outwardIGST = 0, outwardCGST = 0, outwardSGST = 0;
  let itcIGST = 0, itcCGST = 0, itcSGST = 0;

  for (const v of vouchers) {
    const rows = entriesByVoucher[v.id] || [];
    const amount = rows.reduce((s, r) => s + Number(r.debit || 0) + Number(r.credit || 0), 0) / 2;
    if (!amount) continue;
    const ledgerWithRate = rows.map((r) => ledgerById.get(r.ledger_id)).find((l) => l?.gst_rate != null);
    if (!ledgerWithRate) continue;
    const { taxable, tax } = taxableAndTax(amount, ledgerWithRate.gst_rate);

    if (v.voucher_type === "sales") {
      outwardTaxable += taxable;
      outwardCGST += tax / 2;
      outwardSGST += tax / 2;
    } else if (v.voucher_type === "purchase") {
      itcCGST += tax / 2;
      itcSGST += tax / 2;
    }
  }

  const totalOutwardTax = outwardIGST + outwardCGST + outwardSGST;
  const totalITC = itcIGST + itcCGST + itcSGST;
  const netPayable = Math.max(totalOutwardTax - totalITC, 0);

  return {
    section3_1: {
      taxableValue: outwardTaxable,
      igst: outwardIGST,
      cgst: outwardCGST,
      sgst: outwardSGST
    },
    section4_itc: {
      igst: itcIGST,
      cgst: itcCGST,
      sgst: itcSGST,
      total: totalITC
    },
    section6_1: {
      taxPayable: totalOutwardTax,
      paidThroughITC: Math.min(totalOutwardTax, totalITC),
      paidInCash: netPayable
    }
  };
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    (acc[item[key]] = acc[item[key]] || []).push(item);
    return acc;
  }, {});
}
