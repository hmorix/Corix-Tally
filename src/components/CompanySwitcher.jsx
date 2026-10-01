import { useState } from "react";
import { Link } from "react-router-dom";
import { useCompanies } from "../hooks/useCompanies";

/** Header dropdown to jump between companies without going back to the
 * Dashboard first — the one thing the old flow made annoying once you had
 * more than one practice book. */
export default function CompanySwitcher({ current, onSelect }) {
  const { companies } = useCompanies();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-xs text-inkfade uppercase tracking-wide py-1"
      >
        <span className="truncate">{current.name}</span>
        <span className="ml-2">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 z-20 bg-paper border border-rule rounded-sm shadow-md">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setOpen(false); }}
              className={"block w-full text-left px-3 py-2 text-sm " + (c.id === current.id ? "bg-paperdim font-medium" : "hover:bg-paperdim")}
            >
              {c.name}
            </button>
          ))}
          <Link to="/" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-brass border-t border-rule">
            + New / manage companies
          </Link>
        </div>
      )}
    </div>
  );
}
