import { useState } from "react";
import Logo from "./Logo";
import Sidebar from "./Sidebar";
import ShortcutBar from "./ShortcutBar";
import CompanySwitcher from "./CompanySwitcher";

export default function Layout({ children, company, onSelectCompany, onSignOut, syncing }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper text-ink font-body">
      <header className="md:hidden flex items-center justify-between px-4 py-3 rule-line bg-paper sticky top-0 z-40">
        <button onClick={() => setNavOpen(true)} aria-label="Open menu" className="p-1">
          <span className="block w-6 h-0.5 bg-ink mb-1.5" />
          <span className="block w-6 h-0.5 bg-ink mb-1.5" />
          <span className="block w-6 h-0.5 bg-ink" />
        </button>
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="font-display text-lg">Corix Tally</span>
        </div>
        <SyncDot syncing={syncing} />
      </header>

      <aside className={"md:w-60 md:shrink-0 md:border-r md:border-rule bg-paperdim md:bg-paper " +
        (navOpen ? "fixed inset-0 z-50 flex" : "hidden md:block")}>
        {navOpen && <div className="absolute inset-0 bg-ink/40" onClick={() => setNavOpen(false)} />}
        <div className="relative w-64 bg-paper h-full md:h-auto md:w-full">
          <div className="hidden md:flex items-center justify-between gap-2 px-4 py-4 rule-line">
            <div className="flex items-center gap-2">
              <Logo size={26} />
              <span className="font-display text-xl">Corix Tally</span>
            </div>
            <SyncDot syncing={syncing} />
          </div>
          {company && (
            <div className="px-3 py-2 rule-line">
              <CompanySwitcher current={company} onSelect={onSelectCompany} />
            </div>
          )}
          <Sidebar onNavigate={() => setNavOpen(false)} />
          <button onClick={onSignOut} className="mt-4 mx-3 text-sm text-seal underline underline-offset-2">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-5 md:px-8 md:py-8 pb-24">{children}</main>
      <ShortcutBar />
    </div>
  );
}

function SyncDot({ syncing }) {
  return (
    <span
      title={syncing ? "Syncing to your account…" : "All changes saved"}
      className={"inline-block w-2 h-2 rounded-full " + (syncing ? "bg-brass animate-pulse" : "bg-credit")}
    />
  );
}
