import { useEffect, useRef, useState } from "react";
import { formatINR } from "../lib/accounting";
import { exportToCSV, importFromCSV } from "../lib/csv";
import { exportToExcel, importFromExcel } from "../lib/excel";

const emptyForm = {
  id: null, name: "", group_id: "", opening_balance: "", opening_balance_type: "debit", gst_rate: ""
};

export default function Ledgers({ company, data }) {
  const { groups, ledgers, saveLedger, deleteLedger, loading } = data;
  const [form,       setForm]       = useState(emptyForm);
  const [search,     setSearch]     = useState("");
  const [importing,  setImporting]  = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [groupFilter,setGroupFilter]= useState("all");
  const fileRef  = useRef(null);
  const formRef  = useRef(null);

  useEffect(() => {
    function onShortcut(e) {
      const { action } = e.detail;
      if (action === "cancel") { setForm(emptyForm); setShowForm(false); }
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
      id:                   form.id || undefined,
      name:                 form.name,
      group_id:             form.group_id || null,
      opening_balance:      Number(form.opening_balance || 0),
      opening_balance_type: form.opening_balance_type,
      gst_rate:             form.gst_rate ? Number(form.gst_rate) : null,
    });
    setForm(emptyForm);
    setShowForm(false);
  }

  function edit(ledger) {
    setForm({
      id:                   ledger.id,
      name:                 ledger.name,
      group_id:             ledger.group_id || "",
      opening_balance:      ledger.opening_balance,
      opening_balance_type: ledger.opening_balance_type,
      gst_rate:             ledger.gst_rate ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          name:                 r.name,
          group_id:             null,
          opening_balance:      Number(r.opening_balance || 0),
          opening_balance_type: (r.opening_balance_type || "debit").toLowerCase(),
          gst_rate:             r.gst_rate ? Number(r.gst_rate) : null,
        });
      }
    } finally {
      setImporting(false);
    }
  }

  const exportRows = ledgers.map((l) => ({
    name:                 l.name,
    group:                groups.find((g) => g.id === l.group_id)?.name || "",
    opening_balance:      l.opening_balance,
    opening_balance_type: l.opening_balance_type,
    gst_rate:             l.gst_rate || "",
  }));

  // Filtered + searched
  const filtered = ledgers.filter((l) =>
    (groupFilter === "all" || l.group_id === groupFilter) &&
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalDr = ledgers.filter((l) => l.opening_balance_type === "debit").reduce((s, l) => s + Number(l.opening_balance), 0);
  const totalCr = ledgers.filter((l) => l.opening_balance_type === "credit").reduce((s, l) => s + Number(l.opening_balance), 0);

  return (
    <div className="animate-fade-in">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold">Ledger Accounts</h1>
          <p className="text-inkFade text-sm mt-0.5">
            {loading ? "Loading…" : `${ledgers.length} ledgers`} · Changes sync instantly
          </p>
        </div>
        <button onClick={() => { setForm(emptyForm); setShowForm((v) => !v); }} className="btn-primary text-sm">
          + Add Ledger
        </button>
      </div>

      {/* ── Summary chips ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <StatChip label="Total Ledgers"  value={ledgers.length}       color="bg-tp-blue/10 text-tp-blue" />
        <StatChip label="Total Dr Opening" value={formatINR(totalDr)} color="bg-sealBg text-seal"    mono />
        <StatChip label="Total Cr Opening" value={formatINR(totalCr)} color="bg-creditBg text-credit" mono />
        <StatChip label="Groups"         value={groups.length}        color="bg-brass/10 text-brass" />
      </div>

      {/* ── Entry form ───────────────────────────────────────────────── */}
      {showForm && (
        <div className="tp-card p-5 mb-5 animate-slide-up">
          <h2 className="font-semibold text-sm text-ink mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-tp-blue/15 text-tp-blue rounded text-xs flex items-center justify-center">
              {form.id ? "✏" : "+"}
            </span>
            {form.id ? "Edit Ledger" : "Add New Ledger"}
          </h2>
          <form ref={formRef} onSubmit={submit} className="flex flex-wrap gap-3 items-end">
            <LabeledInput
              label="Ledger Name *"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              wide
            />
            <label className="text-xs text-inkFade font-medium">
              Group
              <select
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                className="tp-select block mt-1"
              >
                <option value="">— none —</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <LabeledInput
              label="Opening Balance"
              value={form.opening_balance}
              onChange={(v) => setForm({ ...form, opening_balance: v })}
              numeric
            />
            <label className="text-xs text-inkFade font-medium">
              Side
              <select
                value={form.opening_balance_type}
                onChange={(e) => setForm({ ...form, opening_balance_type: e.target.value })}
                className="tp-select block mt-1"
              >
                <option value="debit">Debit (Dr)</option>
                <option value="credit">Credit (Cr)</option>
              </select>
            </label>
            <LabeledInput
              label="GST Rate %"
              value={form.gst_rate}
              onChange={(v) => setForm({ ...form, gst_rate: v })}
              numeric
              style={{ width: "80px" }}
            />
            <div className="flex gap-2 ml-auto">
              <button className="btn-primary">{form.id ? "Save Changes" : "Add Ledger"}</button>
              {form.id && (
                <button type="button" onClick={() => { setForm(emptyForm); setShowForm(false); }} className="btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  Search ledgers…"
          className="tp-input flex-1 min-w-48 py-1.5 text-sm"
        />
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="tp-select text-sm py-1.5"
        >
          <option value="all">All Groups</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-secondary text-sm py-1.5">
          {importing ? "Importing…" : "⬆ Import"}
        </button>
        <button onClick={() => exportToCSV(exportRows, "ledgers.csv")} className="btn-secondary text-sm py-1.5">
          ⬇ CSV
        </button>
        <button onClick={() => exportToExcel(exportRows, "ledgers.xlsx")} className="btn-secondary text-sm py-1.5">
          ⬇ Excel
        </button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
      </div>

      {/* ── Ledger table ─────────────────────────────────────────────── */}
      <div className="tp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm tp-table">
            <thead>
              <tr className="bg-tp-navy/5 border-b border-rule">
                <th className="text-left py-2.5 px-4 text-xs text-inkFade font-semibold uppercase tracking-wider">Ledger</th>
                <th className="text-left py-2.5 px-4 text-xs text-inkFade font-semibold uppercase tracking-wider">Group</th>
                <th className="text-right py-2.5 px-4 text-xs text-inkFade font-semibold uppercase tracking-wider">Opening Bal.</th>
                <th className="text-right py-2.5 px-4 text-xs text-inkFade font-semibold uppercase tracking-wider">GST</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-rule/60 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-ink">{l.name}</td>
                  <td className="py-2.5 px-4 text-inkFade text-xs">
                    {groups.find((g) => g.id === l.group_id)?.name || (
                      <span className="text-inkLight">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-tabular">
                    <span className={l.opening_balance_type === "debit" ? "text-seal" : "text-credit"}>
                      {formatINR(l.opening_balance)}
                    </span>
                    <span className="ml-1 text-xs text-inkFade">
                      {l.opening_balance_type === "debit" ? "Dr" : "Cr"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-tabular text-inkFade">
                    {l.gst_rate ? `${l.gst_rate}%` : <span className="text-inkLight">—</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <button onClick={() => edit(l)} className="btn-ghost mr-3">Edit</button>
                    <button
                      onClick={() => { if (confirm(`Delete "${l.name}"? This cannot be undone.`)) deleteLedger(l.id); }}
                      className="btn-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-inkFade text-sm">
                    {ledgers.length === 0
                      ? "No ledgers yet — add one above or import a file."
                      : "No results match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value, color, mono }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-rule ${color}`}>
      <span className="text-xs opacity-70">{label}</span>
      <span className={`text-sm font-semibold ${mono ? "font-tabular" : ""}`}>{value}</span>
    </div>
  );
}

function LabeledInput({ label, value, onChange, numeric, wide, style }) {
  return (
    <label className="text-xs text-inkFade font-medium">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={numeric ? "decimal" : "text"}
        className={`tp-input mt-1 ${numeric ? "font-tabular text-right" : ""} ${wide ? "w-56" : "w-36"}`}
        style={style}
      />
    </label>
  );
}

export function NoCompany() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="text-5xl mb-4">📂</div>
      <p className="font-display text-lg text-ink mb-1">No Company Selected</p>
      <p className="text-inkFade text-sm">Go to Dashboard and select or create a company first.</p>
    </div>
  );
}
