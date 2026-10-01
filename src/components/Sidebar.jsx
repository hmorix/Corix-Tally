import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/ledgers", label: "Ledgers" },
  { to: "/vouchers", label: "Vouchers" },
  { to: "/day-book", label: "Day Book" },
  { to: "/trial-balance", label: "Trial Balance" },
  { to: "/profit-loss", label: "Profit & Loss" },
  { to: "/gst", label: "GST (GSTR-1 / 3B)" },
  { to: "/itr", label: "ITR Summary" },
  { to: "/audit-log", label: "Audit Log" },
  { to: "/settings", label: "Settings" }
];

export default function Sidebar({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            "rounded-sm px-3 py-2 text-sm font-medium " +
            (isActive ? "bg-ink text-paper" : "text-ink hover:bg-paperdim")
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
