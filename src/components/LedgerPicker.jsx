import { useEffect, useRef, useState } from "react";

/**
 * Type-ahead ledger picker — replaces a plain <select>, which gets slow to
 * scroll through on a phone once a company has 100+ ledgers. Type to filter,
 * arrow keys to move, Enter to pick, click outside to close.
 */
export default function LedgerPicker({ ledgers, value, onChange, placeholder = "Select ledger…" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);

  const selected = ledgers.find((l) => l.id === value);

  useEffect(() => {
    setQuery(selected ? selected.name : "");
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery(selected ? selected.name : "");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
    };
  }, [selected]);

  const filtered = query.trim()
    ? ledgers.filter((l) => l.name.toLowerCase().includes(query.trim().toLowerCase()))
    : ledgers;

  function pick(ledger) {
    onChange(ledger.id);
    setQuery(ledger.name);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { setOpen(true); return; }
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[highlight]) pick(filtered[highlight]); }
    else if (e.key === "Escape") { e.stopPropagation(); setOpen(false); setQuery(selected ? selected.name : ""); }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        value={query}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setHighlight(0); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); if (!e.target.value) onChange(""); }}
        onKeyDown={onKeyDown}
        className="w-full rounded-sm border border-rule px-2 py-2 text-sm"
      />
      {open && (
        <ul className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto rounded-sm border border-rule bg-paper shadow-md">
          {filtered.map((l, i) => (
            <li
              key={l.id}
              onMouseDown={() => pick(l)}
              className={"px-2.5 py-2 text-sm cursor-pointer " + (i === highlight ? "bg-brass text-ink" : "hover:bg-paperdim")}
            >
              {l.name}
            </li>
          ))}
          {filtered.length === 0 && <li className="px-2.5 py-2 text-sm text-inkfade">No matching ledger.</li>}
        </ul>
      )}
    </div>
  );
}
