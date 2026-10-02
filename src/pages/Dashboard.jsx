import { useEffect, useRef, useState } from "react";
import { useCompanies } from "../hooks/useCompanies";
import { formatINR } from "../lib/accounting";

export default function Dashboard({ company, onSelectCompany }) {
  const { companies, loading, createCompany } = useCompanies();
  const [name, setName]   = useState("");
  const [gstin, setGstin] = useState("");
  const [busy, setBusy]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    function onShortcut(e) {
      const { action } = e.detail;
      if (action === "cancel")                              { setName(""); setGstin(""); setShowForm(false); }
      if (action === "accept-form" || action === "accept-fast") formRef.current?.requestSubmit();
    }
    window.addEventListener("corix:shortcut", onShortcut);
    return () => window.removeEventListener("corix:shortcut", onShortcut);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const created = await createCompany({ name, gstin });
      setName(""); setGstin(""); setShowForm(false);
      onSelectCompany(created);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* ── Page header ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Gateway of Tally</h1>
          <p className="text-inkFade text-sm mt-0.5">
            Select or create a company to begin — like Tally Prime's own startup screen.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <span className="text-lg leading-none">+</span>
          New Company
        </button>
      </div>

      {/* ── Create company form (collapsible) ────────────── */}
      {showForm && (
        <div className="tp-card p-5 mb-6 animate-slide-up">
          <h2 className="font-display text-base font-semibold mb-4 text-ink flex items-center gap-2">
            <span className="w-7 h-7 rounded bg-tp-blue/15 text-tp-blue flex items-center justify-center text-sm">+</span>
            Create a new company
          </h2>
          <form ref={formRef} onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <label className="text-xs text-inkFade font-medium flex-1 min-w-48">
              Company Name *
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sharma & Sons Pvt. Ltd."
                required
                className="tp-input mt-1"
              />
            </label>
            <label className="text-xs text-inkFade font-medium flex-1 min-w-48">
              GSTIN (optional)
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="e.g. 29AABCU9603R1ZX"
                className="tp-input font-tabular mt-1 uppercase"
              />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? "Creating…" : "Create"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel (Esc)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Company list ────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg skeleton" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="tp-card p-10 text-center animate-fade-in">
          <div className="text-5xl mb-3">📂</div>
          <p className="font-display text-lg text-ink mb-1">No companies yet</p>
          <p className="text-inkFade text-sm mb-4">
            Create your first company to start recording transactions.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Create Company
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCompany(c)}
              className={
                "tp-card text-left p-4 rounded-lg transition-all duration-200 group " +
                (company?.id === c.id
                  ? "border-tp-blue/60 bg-tp-blue/5 shadow-elevated"
                  : "hover:border-tp-blue/30 hover:shadow-md hover:-translate-y-0.5")
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={
                    "w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 " +
                    (company?.id === c.id ? "bg-tp-blue text-white" : "bg-tp-blue/10 text-tp-blue")
                  }>
                    🏢
                  </div>
                  <div>
                    <div className="font-semibold text-ink text-sm">{c.name}</div>
                    {c.gstin && (
                      <div className="text-xs text-inkFade font-tabular mt-0.5 tracking-wide">
                        GSTIN: {c.gstin}
                      </div>
                    )}
                  </div>
                </div>
                {company?.id === c.id && (
                  <span className="badge-voucher shrink-0">Active</span>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-rule flex justify-between text-xs text-inkFade">
                <span>Click to select</span>
                <span className="text-tp-blue group-hover:underline">Open →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Quick guide cards ──────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
        <GuideCard
          icon="🧾"
          title="Enter a Voucher"
          steps={["Go to Vouchers", "Press F5 (Payment), F6 (Receipt)…", "Add ledger lines (Dr/Cr)", "Press Ctrl+A to save"]}
          color="bg-tp-blue/8"
        />
        <GuideCard
          icon="📒"
          title="Manage Ledgers"
          steps={["Go to Ledgers", "Fill Name + Group", "Set opening balance", "Import CSV/Excel in bulk"]}
          color="bg-credit/8"
        />
        <GuideCard
          icon="📊"
          title="View Reports"
          steps={["Trial Balance → all ledger balances", "Profit & Loss → income vs expense", "Day Book → every voucher in order", "GST → GSTR-1, GSTR-3B"]}
          color="bg-brass/8"
        />
      </div>
    </div>
  );
}

function GuideCard({ icon, title, steps, color }) {
  return (
    <div className={`tp-card p-4 rounded-lg ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-semibold text-sm text-ink">{title}</h3>
      </div>
      <ol className="flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-inkFade">
            <span className="w-4 h-4 rounded-full bg-white/80 border border-rule flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
