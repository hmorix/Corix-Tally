import { Link } from "react-router-dom";
import { NoCompany } from "./Ledgers";

export default function GST({ company }) {
  if (!company) return <NoCompany />;
  return (
    <div className="max-w-md">
      <h1 className="font-display text-2xl mb-1">GST</h1>
      <p className="text-inkfade text-sm mb-6">
        Practice the real return layouts. Set a GST% on each ledger (Ledgers page) and record the
        recipient's GSTIN + invoice number on sales vouchers to see them appear here.
      </p>
      <div className="flex flex-col gap-3">
        <Link to="/gst/gstr1" className="rounded-sm border border-ink px-4 py-3">
          <div className="font-medium">GSTR-1</div>
          <div className="text-xs text-inkfade">Outward supplies — B2B (Table 4) and B2C (Table 7)</div>
        </Link>
        <Link to="/gst/gstr3b" className="rounded-sm border border-ink px-4 py-3">
          <div className="font-medium">GSTR-3B</div>
          <div className="text-xs text-inkfade">Monthly summary return — outward tax, ITC, net payable</div>
        </Link>
      </div>
    </div>
  );
}
