import { NavLink, useLocation } from "react-router-dom";

const SECTIONS = [
  {
    label: "Main",
    links: [
      { to: "/",            label: "Dashboard",      end: true, icon: "⊞", shortcut: "Alt+H" },
    ],
  },
  {
    label: "Accounting",
    links: [
      { to: "/ledgers",     label: "Ledgers",                  icon: "📒", shortcut: "Alt+G" },
      { to: "/vouchers",    label: "Vouchers",                 icon: "🧾", shortcut: "Alt+V" },
      { to: "/day-book",    label: "Day Book",                 icon: "📅", shortcut: "Alt+D" },
    ],
  },
  {
    label: "Reports",
    links: [
      { to: "/trial-balance", label: "Trial Balance",          icon: "⚖",  shortcut: "Alt+T" },
      { to: "/profit-loss",   label: "Profit & Loss",          icon: "📈", shortcut: "Alt+P" },
    ],
  },
  {
    label: "Tax",
    links: [
      { to: "/gst",         label: "GST (GSTR-1/3B)",          icon: "🏛", shortcut: "Alt+X" },
      { to: "/itr",         label: "ITR Summary",              icon: "📋", shortcut: "" },
    ],
  },
  {
    label: "Admin",
    links: [
      { to: "/audit-log",   label: "Audit Log",                icon: "🔍", shortcut: "" },
      { to: "/settings",    label: "Settings",                 icon: "⚙",  shortcut: "Alt+F12" },
    ],
  },
];

export default function Sidebar({ onNavigate }) {
  const location = useLocation();

  return (
    <nav className="px-2 py-1">
      {SECTIONS.map((section) => (
        <div key={section.label} className="mb-1">
          <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 pt-3 pb-1 font-medium">
            {section.label}
          </p>
          {section.links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                "group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm " +
                "transition-all duration-150 " +
                (isActive
                  ? "bg-white/15 text-white nav-active-glow shadow-sm"
                  : "text-white/60 hover:bg-white/8 hover:text-white/90")
              }
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base leading-none w-5 text-center opacity-80">{l.icon}</span>
                <span className="leading-none">{l.label}</span>
              </span>
              {l.shortcut && (
                <span className="text-[10px] text-white/25 font-tabular opacity-0 group-hover:opacity-100 transition-opacity hidden xl:block">
                  {l.shortcut}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
