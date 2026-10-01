// Mirrors src/lib/voucherNumber.js on the frontend (Supabase/local-first
// path) so a voucher gets the same numbering scheme — TYPE-FYFY-0001 —
// regardless of which backend created it. Indian financial year: Apr–Mar.
const PREFIX = { payment: "PAY", receipt: "REC", contra: "CON", journal: "JRN", sales: "SAL", purchase: "PUR" };

export function nextVoucherNumber(voucherType, existingVouchersOfSameType, voucherDate) {
  const d = new Date(voucherDate);
  const fyStartYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const fyLabel = `${String(fyStartYear).slice(2)}${String(fyStartYear + 1).slice(2)}`;
  const prefix = PREFIX[voucherType] || "VCH";
  const seq = String(existingVouchersOfSameType.length + 1).padStart(4, "0");
  return `${prefix}-${fyLabel}-${seq}`;
}
