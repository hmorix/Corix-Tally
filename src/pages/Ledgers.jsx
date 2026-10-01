import { useEffect, useRef, useState } from "react";
import { formatINR } from "../lib/accounting";
import { exportToCSV, importFromCSV } from "../lib/csv";
import { exportToExcel, importFromExcel } from "../lib/excel";

const emptyForm = { id: null, name: "", group_id: "", opening_balance: "", opening_balance_type: "debit", gst_rate: "" };

export default function Ledgers({ company, data }) {
  const { groups, ledgers, saveLedger, deleteLedger, loading } = data;
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const formRef = useRef(null);

  // Esc clears/cancels the form, Ctrl+A submits it — same as every other
  // screen, wired through the shared ShortcutBar/keyboard event bus.
  useEffect(() => {
    function onShortcut(e) {
      const { action } = e.detail;
      if (action === "cancel") setForm(emptyForm);
      if (action === "accept-form" || action === "accept-fast") formRef.current?.requestSubmit();
    }
    window.addEventListener("corix:shortcut", onShortcut);
    return () => window.removeEventListener("corix:shortcut", onShortcut);
  }, []);

  if (!company) return <NoCompany />;

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await saveLedger({
      id: form.id || undefined,
      name: form.name,
      group_id: form.group_id || null,
      opening_balance: Number(form.opening_balance || 0),
      opening_balance_type: form.opening_balance_type,
      gst_rate: form.gst_rate ? Number(form.gst_rate) : null
    });
    setForm(emptyForm);
  }

  function edit(ledger) {
    setForm({
      id: ledger.id,
      name: ledger.name,
      group_id: ledger.group_id || "",
      opening_balance: ledger.opening_balance,
      opening_balance_type: ledger.opening_balance_type,
      gst_rate: ledger.gst_rate ?? ""
    });
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const isExcel = /\.xlsx?$/i.test(file.name);
      const rows = isExcel ? await importFromExcel(file) : await importFromCSV(file);
      for (const r of rows) {
        if (!r.name) continue;
        await saveLedger({
          name: r.name,
          group_id: null,
          opening_balance: Number(r.opening_balance || 0),
          opening_balance_type: (r.opening_balance_type || "debit").toLowerCase(),
          gst_rate: r.gst_rate ? Number(r.gst_rate) : null
        });
      }
    } finally {
      setImporting(false);
    }
  }

  const exportRows = ledgers.map((l) => ({
    name: l.name,
    group: groups.find((g) => g.id === l.group_id)?.name || "",
    opening_balance: l.opening_balance,
    opening_balance_type: l.opening_balance_type,
    gst_rate: l.gst_rate || ""
  }));

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Ledgers</h1>
      <p className="text-inkfade text-sm mb-5">
        Individual accounts, grouped the way Tally groups them. Changes save instantly on this
        device and sync to your account in the background{loading ? " — loading…" : ""}.
      </p>

      <form ref={formRef} onSubmit={submit} className="flex flex-wrap gap-2 mb-3 items-end">
        <LabeledInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <label className="text-xs text-inkfade">
          Group
          <select value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })} className="block rounded-sm border border-rule px-2 py-2 mt-1">
            <option value="">— none —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <LabeledInput label="Opening balance" value={form.opening_balance} onChange={(v) => setForm({ ...form, opening_balance: v })} numeric />
        <label className="text-xs text-inkfade">
          Side
          <select value={form.opening_balance_type} onChange={(e) => setForm({ ...form, opening_balance_type: e.target.value })} className="block rounded-sm border border-rule px-2 py-2 mt-1">
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
        </label>
        <LabeledInput label="GST %" value={form.gst_rate} onChange={(v) => setForm({ ...form, gst_rate: v })} numeric />
        <button className="bg-ink text-paper rounded-sm px-4 py-2 text-sm">{form.id ? "Save changes" : "Add ledger"}</button>
        {form.id && <button type="button" onClick={() => setForm(emptyForm)} className="text-xs underline text-inkfade">Cancel edit</button>}
      </form>

      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => fileRef.current?.click()} disabled={importing} className="text-xs px-3 py-1.5 rounded-sm border border-ink">
          {importing ? "Importing…" : "Import CSV / Excel"}
        </button>
        <button onClick={() => exportToCSV(exportRows, "ledgers.csv")} className="text-xs px-3 py-1.5 rounded-sm border border-ink">Export CSV</button>
        <button onClick={() => exportToExcel(exportRows, "ledgers.xlsx")} className="text-xs px-3 py-1.5 rounded-sm border border-ink">Export Excel</button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
      </div>

      <div className="overflow-x-auto rule-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink">
              <th className="text-left py-2 pr-4">Ledger</th>
              <th className="text-left py-2 pr-4">Group</th>
              <th className="text-right py-2 pr-4">Opening</th>
              <th className="text-right py-2 pr-4">GST</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {ledgers.map((l) => (
              <tr key={l.id} className="rule-line">
                <td className="py-2 pr-4">{l.name}</td>
                <td className="py-2 pr-4">{groups.find((g) => g.id === l.group_id)?.name || "—"}</td>
                <td className="py-2 pr-4 text-right font-tabular">{formatINR(l.opening_balance)} {l.opening_balance_type === "debit" ? "Dr" : "Cr"}</td>
                <td className="py-2 pr-4 text-right font-tabular">{l.gst_rate ? `${l.gst_rate}%` : "—"}</td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button onClick={() => edit(l)} className="text-xs text-brass underline mr-3">Edit</button>
                  <button
                    onClick={() => { if (confirm(`Delete "${l.name}"? This can't be undone.`)) deleteLedger(l.id); }}
                    className="text-xs text-seal underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {ledgers.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-inkfade text-sm">No ledgers yet — add one above or import a file.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, numeric }) {
  return (
    <label className="text-xs text-inkfade">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode={numeric ? "decimal" : "text"} className={"block rounded-sm border border-rule px-2 py-2 mt-1 w-32 " + (numeric ? "font-tabular" : "")} />
    </label>
  );
}

export function NoCompany() {
  return <p className="text-sm text-inkfade">Select or create a company from the Dashboard first.</p>;
}
