import { useRef, useState } from "react";
import { exportToCSV, importFromCSV } from "../lib/csv";
import { exportToExcel, importFromExcel } from "../lib/excel";

/**
 * Generic ledger-style table with CSV/Excel import & export built in.
 * `columns`: [{ key, label, numeric? }]
 * `onImportRows(rows)`: called with parsed rows for the caller to persist.
 */
export default function DataTable({ columns, rows, filenameBase, onImportRows }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const isExcel = /\.xlsx?$/i.test(file.name);
      const parsed = isExcel ? await importFromExcel(file) : await importFromCSV(file);
      onImportRows?.(parsed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-sm border border-ink"
        >
          {busy ? "Importing…" : "Import CSV / Excel"}
        </button>
        <button
          onClick={() => exportToCSV(rows, `${filenameBase}.csv`)}
          className="text-xs px-3 py-1.5 rounded-sm border border-ink"
        >
          Export CSV
        </button>
        <button
          onClick={() => exportToExcel(rows, `${filenameBase}.xlsx`)}
          className="text-xs px-3 py-1.5 rounded-sm border border-ink"
        >
          Export Excel
        </button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
      </div>

      <div className="overflow-x-auto rule-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink">
              {columns.map((c) => (
                <th key={c.key} className={"text-left py-2 pr-4 font-medium " + (c.numeric ? "text-right" : "")}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id || i} className="rule-line">
                {columns.map((c) => (
                  <td key={c.key} className={"py-2 pr-4 " + (c.numeric ? "text-right font-tabular" : "")}>
                    {row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center text-inkfade text-sm">
                  Nothing here yet — add an entry or import a file above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
