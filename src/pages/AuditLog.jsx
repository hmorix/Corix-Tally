import { NoCompany } from "./Ledgers";

export default function AuditLog({ company, data }) {
  if (!company) return <NoCompany />;
  const { auditLog } = data;

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Audit Log</h1>
      <p className="text-inkfade text-sm mb-5">Every ledger and voucher change in this company — who, what, and when.</p>

      <div className="overflow-x-auto rule-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink">
              <th className="text-left py-2 pr-4">When</th>
              <th className="text-left py-2 pr-4">Entity</th>
              <th className="text-left py-2 pr-4">Action</th>
              <th className="text-left py-2 pr-4">Detail</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.map((row) => (
              <tr key={row.id} className="rule-line">
                <td className="py-2 pr-4 font-tabular text-inkfade whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                <td className="py-2 pr-4 capitalize">{row.entity_type}</td>
                <td className="py-2 pr-4 capitalize">
                  <span className={row.action === "delete" ? "text-seal" : row.action === "create" ? "text-credit" : "text-brass"}>{row.action}</span>
                </td>
                <td className="py-2 pr-4">{row.detail}</td>
              </tr>
            ))}
            {auditLog.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-inkfade text-sm">No changes logged yet — this fills in as you add or edit ledgers and vouchers.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-inkfade mt-3">Only loads when online, from your account. Not cached locally for offline viewing.</p>
    </div>
  );
}
