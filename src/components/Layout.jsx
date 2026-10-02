import { useState, useEffect } from "react";
import Logo from "./Logo";
import Sidebar from "./Sidebar";
import ShortcutBar from "./ShortcutBar";
import CompanySwitcher from "./CompanySwitcher";

export default function Layout({ children, company, onSelectCompany, onSignOut, syncing }) {
  const [navOpen, setNavOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  // Live clock (Tally Prime shows time in header)
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true, day: "2-digit", month: "short", year: "numeric"
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper text-ink font-body">

      {/* ── Mobile header ──────────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 py-2.5
                         bg-tp-navy text-white sticky top-0 z-40 shadow-md">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          className="p-1.5 rounded-md hover:bg-tp-navyLight transition-colors"
        >
          <span className="block w-5 h-0.5 bg-white mb-1.5 rounded" />
          <span className="block w-5 h-0.5 bg-white mb-1.5 rounded" />
          <span className="block w-5 h-0.5 bg-white rounded" />
        </button>
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="font-display text-lg tracking-wide">Corix Tally</span>
        </div>
        <SyncDot syncing={syncing} />
      </header>

      {/* ── Sidebar (desktop always visible, mobile overlay) ──────────── */}
      <aside
        className={
          "md:w-64 md:shrink-0 bg-tp-navy flex-col " +
          (navOpen
            ? "fixed inset-0 z-50 flex"
            : "hidden md:flex")
        }
      >
        {/* Mobile backdrop */}
        {navOpen && (
          <div
            className="absolute inset-0 bg-black/50 md:hidden animate-fade-in"
            onClick={() => setNavOpen(false)}
          />
        )}

        {/* Sidebar panel */}
        <div className="relative w-64 bg-tp-navy h-full flex flex-col">

          {/* Brand header */}
          <div className="flex items-center justify-between gap-2 px-4 py-4
                          border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-tp-blue/60 flex items-center justify-center shadow">
                <Logo size={20} />
              </div>
              <div>
                <span className="font-display text-white text-base leading-none block">Corix Tally</span>
                <span className="text-white/40 text-[10px] leading-none font-tabular">v2.0</span>
              </div>
            </div>
            <SyncDot syncing={syncing} />
          </div>

          {/* Date/time strip (Tally Prime style) */}
          <div className="px-4 py-2 border-b border-white/10">
            <p className="text-white/50 text-[11px] font-tabular leading-none">
              {fmt.format(time)}
            </p>
          </div>

          {/* Company switcher */}
          {company && (
            <div className="px-3 pt-3 pb-2 border-b border-white/10">
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1.5 px-1">
                Active Company
              </p>
              <CompanySwitcher current={company} onSelect={onSelectCompany} />
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-2">
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-4 py-3">
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-2 text-white/60 hover:text-white
                         text-sm transition-colors duration-150 group"
            >
              <span className="w-6 h-6 rounded-md bg-white/5 group-hover:bg-white/15
                               flex items-center justify-center transition-colors">
                ↩
              </span>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-between px-6 py-2
                        bg-tp-navy/95 backdrop-blur-sm border-b border-white/10">
          <div />
          <div className="flex items-center gap-4 text-white/50 text-xs font-tabular">
            {company && (
              <span className="text-tp-sky">
                📁 {company.name}
              </span>
            )}
            <span>{fmt.format(time)}</span>
            <SyncDot syncing={syncing} showLabel />
          </div>
        </div>

        <main className="flex-1 px-4 py-5 md:px-8 md:py-6 pb-28 overflow-x-hidden">
          <div className="page-enter">
            {children}
          </div>
        </main>
      </div>

      <ShortcutBar />
    </div>
  );
}

function SyncDot({ syncing, showLabel }) {
  return (
    <span
      title={syncing ? "Syncing to your account…" : "All changes saved"}
      className="flex items-center gap-1.5"
    >
      <span
        className={
          "inline-block w-2 h-2 rounded-full transition-colors " +
          (syncing ? "bg-warning animate-pulse-soft" : "bg-credit")
        }
      />
      {showLabel && (
        <span className={syncing ? "text-warning" : "text-credit"}>
          {syncing ? "Syncing…" : "Saved"}
        </span>
      )}
    </span>
  );
}
