import { useEffect, useRef, useState } from "react";
import { formatINR } from "../lib/accounting";
import { importFromExcel } from "../lib/excel";
import { NoCompany } from "./Ledgers";
import LedgerPicker from "../components/LedgerPicker";
import PrintableVoucher from "../components/PrintableVoucher";

const TYPE_BY_ACTION = {
  "voucher-contra":  "contra",
  "voucher-payment": "payment",
  "voucher-receipt": "receipt",
  "voucher-journal": "journal",
  "voucher-sales":   "sales",
  "voucher-purchase":"purchase",
};

const TYPE_META = {
  contra:  { label: "Contra",  key: "F4", color: "bg-purple-100 text-purple-700 border-purple-200",  activeColor: "bg-purple-600 text-white border-purple-600"  },
  payment: { label: "Payment", key: "F5", color: "bg-red-50    text-red-700    border-red-200",       activeColor: "bg-red-600    text-white border-red-600"     },
  receipt: { label: "Receipt", key: "F6", color: "bg-green-50  text-green-700  border-green-200",     activeColor: "bg-green-600  text-white border-green-600"   },
  journal: { label: "Journal", key: "F7", color: "bg-blue-50   text-blue-700   border-blue-200",      activeColor: "bg-blue-600   text-white border-blue-600"    },
  sales:   { label: "Sales",   key: "F8", color: "bg-amber-50  text-amber-700  border-amber-200",     activeColor: "bg-amber-600  text-white border-amber-600"   },
  purchase:{ label: "Purchase","key": "F9", color: "bg-slate-50  text-slate-700  border-slate-200",   activeColor: "bg-slate-600  text-white border-slate-600"   },
};

const emptyLines = () => [
  { ledger_id: "", debit: "", credit: "" },
  { ledger_id: "", debit: "", credit: "" },
];

export default function Vouchers({ company, data }) {
  const { ledgers, vouchers, entries, saveVoucher, deleteVoucher } = data;
  const [voucherType, setVoucherType] = useState("payment");
  const [editingId,   setEditingId]   = useState(null);
  const [date,        setDate]        = useState(() => new Date().toISOString().slice(0, 10));
  const [narration,   setNarration]   = useState("");
  const [partyName,   setPartyName]   = useState("");
  const [partyGstin,  setPartyGstin]  = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [lines,       setLines]       = useState(emptyLines());
  const [message,     setMessage]     = useState("");
  const [msgType,     setMsgType]     = useState("success"); // "success" | "error"
  const [importing,   setImporting]   = useState(false);
  const [importReport,setImportReport]= useState(null);
  const [search,      setSearch]      = useState("");
  const [filterType,  setFilterType]  = useState("all");
  const fileRef   = useRef(null);
  const [printTarget, setPrintTarget] = useState(null);
  const ledgerById = new Map(ledgers.map((l) => [l.id, l]));

  useEffect(() => {
    if (!printTarget) return;
    const timer = setTimeout(() => window.print(), 50);
    const onAfterPrint = () => setPrintTarget(null);
    window.addEventListener("afterprint", onAfterPrint);
    return () => { clearTimeout(timer); window.removeEventListener("afterprint", onAfterPrint); };
  }, [printTarget]);

  function printVoucher(v) {
    const vLines = entries.filter((e) => e.voucher_id === v.id);
    setPrintTarget({ voucher: v, lines: vLines });
  }

  useEffect(() => {
    function onShortcut(e) {
      const { action } = e.detail;
      if (TYPE_BY_ACTION[action]) setVoucherType(TYPE_BY_ACTION[action]);
      if (action === "cancel") resetForm();
      if (action === "accept-form" || action === "accept-fast")
        document.getElementById("save-voucher-btn")?.click();
    }
    window.addEventListener("corix:shortcut", onShortcut);
    return () => window.removeEventListener("corix:shortcut", onShortcut);
  }, []);

  function resetForm() {
    setEditingId(null);
    setLines(emptyLines());
    setNarration(""); setPartyName(""); setPartyGstin(""); setPlaceOfSupply(""); setInvoiceNumber("");
    setMessage("");
  }

  function loadForEdit(v) {
    const vLines = entries
      .filter((e) => e.voucher_id === v.id)
      .map((e) => ({ id: e.id, ledger_id: e.ledger_id, debit: e.debit || "", credit: e.credit || "" }));
    setEditingId(v.id);
    setVoucherType(v.voucher_type);
    setDate(v.voucher_date);
    setNarration(v.narration || "");
    setPartyName(v.party_name || "");
    setPartyGstin(v.party_gstin || "");
    setPlaceOfSupply(v.place_of_supply || "");
    setInvoiceNumber(v.invoice_number || "");
    setLines(vLines.length ? vLines : emptyLines());
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateLine(i, patch) { setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l))); }
  function addLine()             { setLines((ls) => [...ls, { ledger_id: "", debit: "", credit: "" }]); }
  function removeLine(i)         { setLines((ls) => ls.filter((_, idx) => idx !== i)); }

  const totalDebit  = lines.reduce((s, l) => s + Number(l.debit  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced    = totalDebit === totalCredit && totalDebit > 0;
  const showGstFields = voucherType === "sales" || voucherType === "purchase";

  async function submit(e) {
    e.preventDefault();
    if (!balanced) { setMessage("Debit and credit totals must match."); setMsgType("error"); return; }
    await saveVoucher(
      {
        id: editingId || undefined,
        voucher_type: voucherType, voucher_date: date, narration,
        party_name:       showGstFields ? partyName       || null : null,
        party_gstin:      showGstFields ? partyGstin      || null : null,
        place_of_supply:  showGstFields ? placeOfSupply   || null : null,
        invoice_number:   showGstFields ? invoiceNumber   || null : null,
      },
      lines,
    );
    setMessage(editingId ? "✓ Voucher updated." : "✓ Voucher saved.");
    setMsgType("success");
    resetForm();
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleBulkImport(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportReport(null);
    try {
      const rows = await importFromExcel(file);
      const ledgerByName = new Map(ledgers.map((l) => [l.name.trim().toLowerCase(), l.id]));
      const groups = new Map();
      for (const r of rows) {
        const key = String(r.group_id || r.voucher_number || `${r.date}-${r.voucher_type}`);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
      }
      let ok = 0, skipped = 0;
      for (const [, rowsForVoucher] of groups) {
        const first = rowsForVoucher[0];
        const vLines = rowsForVoucher
          .map((r) => ({ ledger_id: ledgerByName.get(String(r.ledger || "").trim().toLowerCase()), debit: r.debit || "", credit: r.credit || "" }))
          .filter((l) => l.ledger_id);
        const dr = vLines.reduce((s, l) => s + Number(l.debit || 0), 0);
        const cr = vLines.reduce((s, l) => s + Number(l.credit || 0), 0);
        if (!vLines.length || dr !== cr || dr === 0) { skipped++; continue; }
        await saveVoucher({
          voucher_type:    (first.voucher_type || "journal").toLowerCase(),
          voucher_date:    first.date || new Date().toISOString().slice(0, 10),
          narration:       first.narration || "",
          party_name:      first.party_name || null,
          party_gstin:     first.party_gstin || null,
          place_of_supply: first.place_of_supply || null,
          invoice_number:  first.invoice_number || null,
        }, vLines);
        ok++;
      }
      setImportReport({ ok, skipped });
    } finally {
      setImporting(false);
    }
  }

  if (!company) return <NoCompany />;

  // Filtered voucher list
  const filtered = vouchers
    .slice()
    .sort((a, b) => b.voucher_date.localeCompare(a.voucher_date))
    .filter((v) =>
      (filterType === "all" || v.voucher_type === filterType) &&
      (!search || v.party_name?.toLowerCase().includes(search.toLowerCase()) ||
       v.voucher_number?.toLowerCase().includes(search.toLowerCase()) ||
       v.narration?.toLowerCase().includes(search.toLowerCase()))
    );

  const meta = TYPE_META[voucherType];

  return (
    <div className="animate-fade-in">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold">Voucher Entry</h1>
          <p className="text-inkFade text-sm mt-0.5">
            F4–F9 to switch type · Ctrl+A to save · Esc to cancel
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="btn-secondary text-sm"
        >
          {importing ? "Importing…" : "⬆ Bulk Import"}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkImport} />
      </div>

      {importReport && (
        <div className="tp-card p-3 mb-4 bg-credit/5 border-credit/20 text-sm animate-slide-up">
          ✓ Imported {importReport.ok} voucher(s)
          {importReport.skipped ? `, skipped ${importReport.skipped} (unbalanced or ledger not found)` : ""}.
          <span className="text-inkFade ml-2 text-xs">
            Columns: group_id · date · voucher_type · ledger · debit · credit · narration · party_name · party_gstin
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Entry form ──────────────────────────────────────────────── */}
        <div className="xl:col-span-3">
          <div className="tp-card p-5">
            {/* Voucher type tabs (Tally-style F-key buttons) */}
            <div className="flex flex-wrap gap-2 mb-5">
              {Object.entries(TYPE_META).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => setVoucherType(key)}
                  className={
                    "flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border font-medium " +
                    "transition-all duration-150 " +
                    (voucherType === key ? m.activeColor : m.color)
                  }
                >
                  <span className="font-tabular opacity-70">{m.key}</span>
                  {m.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4">
              {/* Date row */}
              <div className="flex gap-3 flex-wrap">
                <label className="text-xs text-inkFade font-medium">
                  Voucher Date
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="tp-input font-tabular mt-1"
                    style={{ width: "170px" }}
                  />
                </label>
                {editingId && (
                  <div className="flex items-end">
                    <span className="badge-voucher">Editing voucher</span>
                  </div>
                )}
              </div>

              {/* GST fields for Sales/Purchase */}
              {showGstFields && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200 animate-slide-up">
                  <p className="col-span-2 text-xs text-amber-700 font-medium -mb-1">GST / Party Details</p>
                  <SmallInput label="Party Name"           value={partyName}      onChange={setPartyName}      />
                  <SmallInput label="Party GSTIN"          value={partyGstin}     onChange={setPartyGstin}     mono />
                  <SmallInput label="Place of Supply"      value={placeOfSupply}  onChange={setPlaceOfSupply}  />
                  <SmallInput label="Invoice / Ref Number" value={invoiceNumber}  onChange={setInvoiceNumber}  mono />
                </div>
              )}

              {/* Ledger lines table */}
              <div className="tp-card p-0 overflow-hidden">
                <div className="grid grid-cols-[1fr_100px_100px_32px] gap-0 bg-tp-navy/5 px-3 py-2 text-xs text-inkFade font-medium border-b border-rule">
                  <span>Ledger Account</span>
                  <span className="text-right">Dr Amount</span>
                  <span className="text-right">Cr Amount</span>
                  <span />
                </div>
                <div className="px-2 py-2 flex flex-col gap-1.5">
                  {lines.map((line, i) => (
                    <div key={i} className="grid grid-cols-[1fr_100px_100px_32px] gap-1.5 items-center">
                      <LedgerPicker
                        ledgers={ledgers}
                        value={line.ledger_id}
                        onChange={(id) => updateLine(i, { ledger_id: id })}
                      />
                      <input
                        inputMode="decimal"
                        value={line.debit}
                        onChange={(e) => updateLine(i, { debit: e.target.value, credit: "" })}
                        placeholder="0.00"
                        className="tp-input text-right font-tabular text-amount-debit py-1.5 px-2"
                      />
                      <input
                        inputMode="decimal"
                        value={line.credit}
                        onChange={(e) => updateLine(i, { credit: e.target.value, debit: "" })}
                        placeholder="0.00"
                        className="tp-input text-right font-tabular py-1.5 px-2"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-inkLight hover:text-seal hover:bg-sealBg transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 border-t border-rule flex items-center justify-between">
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs text-tp-blue hover:text-tp-sky transition-colors font-medium flex items-center gap-1"
                  >
                    <span className="text-lg leading-none">+</span> Add line (Alt+C)
                  </button>
                  <div className={`flex items-center gap-3 text-sm font-tabular font-medium ${balanced ? "text-credit" : "text-seal"}`}>
                    <span>Dr {formatINR(totalDebit)}</span>
                    <span className="text-inkFade">·</span>
                    <span>Cr {formatINR(totalCredit)}</span>
                    {balanced
                      ? <span className="badge-credit">✓ Balanced</span>
                      : <span className="badge-debit">Unbalanced</span>}
                  </div>
                </div>
              </div>

              {/* Narration */}
              <label className="text-xs text-inkFade font-medium">
                Narration / Description
                <textarea
                  placeholder="Being payment for / Being receipt from…"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="tp-input mt-1 resize-none"
                  rows={2}
                />
              </label>

              {/* Message */}
              {message && (
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md animate-fade-in ${
                  msgType === "success" ? "bg-creditBg text-credit" : "bg-sealBg text-seal"
                }`}>
                  {message}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  id="save-voucher-btn"
                  disabled={!balanced}
                  className="flex-1 btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingId ? "Save Changes (Ctrl+A)" : "Save Voucher (Ctrl+A)"}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="btn-secondary px-4">
                    Cancel (Esc)
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ── Voucher list ────────────────────────────────────────────── */}
        <div className="xl:col-span-2">
          <div className="tp-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold">All Vouchers</h2>
              <span className="badge-voucher">{filtered.length}</span>
            </div>

            {/* Search & filter */}
            <div className="flex gap-2 mb-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search party, number…"
                className="tp-input flex-1 text-xs py-1.5"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="tp-select text-xs py-1.5"
              >
                <option value="all">All types</option>
                {Object.entries(TYPE_META).map(([k, m]) => (
                  <option key={k} value={k}>{m.label}</option>
                ))}
              </select>
            </div>

            <ul className="flex flex-col gap-1.5 max-h-[560px] overflow-y-auto">
              {filtered.map((v) => {
                const m = TYPE_META[v.voucher_type] || {};
                const vEntries = entries.filter((e) => e.voucher_id === v.id);
                const total = vEntries.reduce((s, e) => s + Number(e.debit || 0), 0);
                return (
                  <li
                    key={v.id}
                    className="tp-card p-3 rounded-md hover:border-tp-blue/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${m.color}`}>
                            {m.label} {m.key}
                          </span>
                          <span className="text-xs font-tabular text-inkFade">{v.voucher_number}</span>
                        </div>
                        {v.party_name && (
                          <div className="text-xs font-medium text-ink mt-0.5 truncate">{v.party_name}</div>
                        )}
                        {v.narration && (
                          <div className="text-[11px] text-inkLight truncate italic">{v.narration}</div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-tabular font-semibold text-ink">{formatINR(total)}</div>
                        <div className="text-[10px] text-inkLight font-tabular">{v.voucher_date}</div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 pt-2 border-t border-rule/60">
                      <button onClick={() => printVoucher(v)}  className="btn-ghost text-xs">🖨 Print</button>
                      <button onClick={() => loadForEdit(v)}   className="btn-ghost text-xs">✏ Edit</button>
                      <button
                        onClick={() => { if (confirm("Delete this voucher?")) deleteVoucher(v.id); }}
                        className="btn-danger text-xs ml-auto"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="text-center py-8 text-inkFade text-sm">
                  {vouchers.length === 0 ? "No vouchers yet. Create one above." : "No results match your search."}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {printTarget && (
        <PrintableVoucher voucher={printTarget.voucher} lines={printTarget.lines} ledgerById={ledgerById} company={company} />
      )}
    </div>
  );
}

function SmallInput({ label, value, onChange, mono }) {
  return (
    <label className="text-xs text-inkFade font-medium">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`tp-input mt-1 ${mono ? "font-tabular uppercase" : ""}`}
      />
    </label>
  );
}
