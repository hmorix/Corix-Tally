import { useEffect, useRef, useState } from "react";
import { formatINR } from "../lib/accounting";
import { importFromExcel } from "../lib/excel";
import { NoCompany } from "./Ledgers";
import LedgerPicker from "../components/LedgerPicker";
import PrintableVoucher from "../components/PrintableVoucher";

const TYPE_BY_ACTION = {
  "voucher-contra": "contra", "voucher-payment": "payment", "voucher-receipt": "receipt",
  "voucher-journal": "journal", "voucher-sales": "sales", "voucher-purchase": "purchase"
};
const TYPE_LABELS = {
  contra: "Contra (F4)", payment: "Payment (F5)", receipt: "Receipt (F6)",
  journal: "Journal (F7)", sales: "Sales (F8)", purchase: "Purchase (F9)"
};
const emptyLines = () => [{ ledger_id: "", debit: "", credit: "" }, { ledger_id: "", debit: "", credit: "" }];

export default function Vouchers({ company, data }) {
  const { ledgers, vouchers, entries, saveVoucher, deleteVoucher } = data;
  const [voucherType, setVoucherType] = useState("payment");
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyGstin, setPartyGstin] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [lines, setLines] = useState(emptyLines());
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const fileRef = useRef(null);
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
      if (action === "accept-form" || action === "accept-fast") document.getElementById("save-voucher-btn")?.click();
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
    const vLines = entries.filter((e) => e.voucher_id === v.id).map((e) => ({ id: e.id, ledger_id: e.ledger_id, debit: e.debit || "", credit: e.credit || "" }));
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
  }

  function updateLine(i, patch) { setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l))); }
  function addLine() { setLines((ls) => [...ls, { ledger_id: "", debit: "", credit: "" }]); }
  function removeLine(i) { setLines((ls) => ls.filter((_, idx) => idx !== i)); }

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;
  const showGstFields = voucherType === "sales" || voucherType === "purchase";

  async function submit(e) {
    e.preventDefault();
    if (!balanced) { setMessage("Debit and credit totals must match before saving."); return; }
    await saveVoucher(
      {
        id: editingId || undefined, voucher_type: voucherType, voucher_date: date, narration,
        party_name: showGstFields ? partyName || null : null,
        party_gstin: showGstFields ? partyGstin || null : null,
        place_of_supply: showGstFields ? placeOfSupply || null : null,
        invoice_number: showGstFields ? invoiceNumber || null : null
      },
      lines
    );
    setMessage(editingId ? "Updated." : "Saved.");
    resetForm();
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
          voucher_type: (first.voucher_type || "journal").toLowerCase(),
          voucher_date: first.date || new Date().toISOString().slice(0, 10),
          narration: first.narration || "",
          party_name: first.party_name || null,
          party_gstin: first.party_gstin || null,
          place_of_supply: first.place_of_supply || null,
          invoice_number: first.invoice_number || null
        }, vLines);
        ok++;
      }
      setImportReport({ ok, skipped });
    } finally {
      setImporting(false);
    }
  }

  if (!company) return <NoCompany />;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl mb-1">Vouchers</h1>
      <p className="text-inkfade text-sm mb-4">F4–F9 on the shortcut bar switch voucher type — same as Gateway of Tally.</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setVoucherType(key)} className={"text-xs px-3 py-1.5 rounded-sm border " + (voucherType === key ? "bg-ink text-paper border-ink" : "border-rule")}>{label}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => fileRef.current?.click()} disabled={importing} className="text-xs px-3 py-1.5 rounded-sm border border-ink">
          {importing ? "Importing…" : "Bulk import vouchers (Excel)"}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkImport} />
      </div>
      {importReport && (
        <p className="text-xs text-inkfade mb-4">
          Imported {importReport.ok} voucher(s){importReport.skipped ? `, skipped ${importReport.skipped} (unbalanced or ledger not found)` : ""}.
          Template columns: <code className="font-tabular">group_id, date, voucher_type, ledger, debit, credit, narration, party_name, party_gstin, place_of_supply, invoice_number</code> —
          one row per debit/credit line, same <code className="font-tabular">group_id</code> for lines that belong to the same voucher.
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="text-sm">
          <span className="block text-inkfade mb-1">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-sm border border-rule px-3 py-2 font-tabular" />
        </label>

        {showGstFields && (
          <div className="grid grid-cols-2 gap-2">
            <SmallInput label="Party name" value={partyName} onChange={setPartyName} />
            <SmallInput label="Party GSTIN" value={partyGstin} onChange={setPartyGstin} mono />
            <SmallInput label="Place of supply (state)" value={placeOfSupply} onChange={setPlaceOfSupply} />
            <SmallInput label="Invoice number" value={invoiceNumber} onChange={setInvoiceNumber} mono />
          </div>
        )}

        <div className="rule-line pb-2">
          <div className="grid grid-cols-[1fr_90px_90px_24px] gap-2 text-xs text-inkfade mb-1">
            <span>Ledger</span><span className="text-right">Debit</span><span className="text-right">Credit</span><span />
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_90px_24px] gap-2 mb-2">
              <LedgerPicker ledgers={ledgers} value={line.ledger_id} onChange={(id) => updateLine(i, { ledger_id: id })} />
              <input inputMode="decimal" value={line.debit} onChange={(e) => updateLine(i, { debit: e.target.value, credit: "" })} className="rounded-sm border border-rule px-2 py-2 text-right font-tabular" />
              <input inputMode="decimal" value={line.credit} onChange={(e) => updateLine(i, { credit: e.target.value, debit: "" })} className="rounded-sm border border-rule px-2 py-2 text-right font-tabular" />
              <button type="button" onClick={() => removeLine(i)} className="text-seal text-sm">×</button>
            </div>
          ))}
          <button type="button" onClick={addLine} className="text-xs text-brass underline">+ Add line</button>
        </div>

        <div className="flex justify-between text-sm font-tabular">
          <span>Total</span>
          <span className={balanced ? "text-credit" : "text-seal"}>Dr {formatINR(totalDebit)} · Cr {formatINR(totalCredit)}</span>
        </div>

        <textarea placeholder="Narration" value={narration} onChange={(e) => setNarration(e.target.value)} className="rounded-sm border border-rule px-3 py-2 text-sm" rows={2} />

        {message && <p className="text-sm text-seal">{message}</p>}

        <div className="flex gap-2">
          <button id="save-voucher-btn" disabled={!balanced} className="flex-1 bg-ink text-paper rounded-sm py-2.5 font-medium disabled:opacity-40">
            {editingId ? "Save changes (Ctrl+A)" : "Save voucher (Ctrl+A)"}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="px-4 rounded-sm border border-ink text-sm">Cancel</button>}
        </div>
      </form>

      <div className="mt-8 rule-line pt-4">
        <h2 className="font-display text-lg mb-2">All vouchers</h2>
        <ul className="text-sm flex flex-col gap-1">
          {vouchers.slice().sort((a, b) => b.voucher_date.localeCompare(a.voucher_date)).map((v) => (
            <li key={v.id} className="flex justify-between items-center rule-line py-1.5">
              <span className="capitalize">
                {v.voucher_type}{v.party_name ? ` — ${v.party_name}` : ""}
                <span className="block text-xs text-inkfade font-tabular normal-case">{v.voucher_number}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-tabular text-inkfade">{v.voucher_date}</span>
                <button onClick={() => printVoucher(v)} className="text-xs text-brass underline">Print</button>
                <button onClick={() => loadForEdit(v)} className="text-xs text-brass underline">Edit</button>
                <button onClick={() => { if (confirm("Delete this voucher?")) deleteVoucher(v.id); }} className="text-xs text-seal underline">Delete</button>
              </span>
            </li>
          ))}
          {vouchers.length === 0 && <li className="text-inkfade py-2">No vouchers yet.</li>}
        </ul>
      </div>

      {printTarget && (
        <PrintableVoucher voucher={printTarget.voucher} lines={printTarget.lines} ledgerById={ledgerById} company={company} />
      )}
    </div>
  );
}

function SmallInput({ label, value, onChange, mono }) {
  return (
    <label className="text-xs text-inkfade">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className={"block w-full rounded-sm border border-rule px-2 py-2 mt-1 " + (mono ? "font-tabular" : "")} />
    </label>
  );
}
