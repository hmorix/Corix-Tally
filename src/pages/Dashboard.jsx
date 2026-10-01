import { useEffect, useRef, useState } from "react";
import { useCompanies } from "../hooks/useCompanies";

export default function Dashboard({ company, onSelectCompany }) {
  const { companies, loading, createCompany } = useCompanies();
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    function onShortcut(e) {
      const { action } = e.detail;
      if (action === "cancel") { setName(""); setGstin(""); }
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
      setName(""); setGstin("");
      onSelectCompany(created);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl mb-1">Dashboard</h1>
      <p className="text-inkfade text-sm mb-6">
        Pick a company to work in, or create a new one to practice with — like Tally's own
        Gateway of Tally, you can keep more than one "company" (a separate practice book) at once.
      </p>

      {loading ? (
        <p className="text-sm text-inkfade">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2 mb-8">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCompany(c)}
              className={"text-left rounded-sm border px-4 py-3 " + (company?.id === c.id ? "border-brass bg-paperdim" : "border-rule")}
            >
              <div className="font-medium">{c.name}</div>
              {c.gstin && <div className="text-xs text-inkfade font-tabular">{c.gstin}</div>}
            </button>
          ))}
          {companies.length === 0 && <p className="text-sm text-inkfade">No companies yet — create your first one below.</p>}
        </div>
      )}

      <div className="rule-line pt-6">
        <h2 className="font-display text-lg mb-3">Create a company</h2>
        <form ref={formRef} onSubmit={handleCreate} className="flex flex-col gap-3 max-w-sm">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" required className="rounded-sm border border-rule px-3 py-2.5" />
          <input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="GSTIN (optional)" className="rounded-sm border border-rule px-3 py-2.5 font-tabular" />
          <button disabled={busy} className="bg-ink text-paper rounded-sm py-2.5 font-medium w-fit px-5">
            {busy ? "Creating…" : "Create company"}
          </button>
        </form>
      </div>
    </div>
  );
}
