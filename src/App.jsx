import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useCompanyData } from "./hooks/useCompanyData";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Ledgers from "./pages/Ledgers";
import Vouchers from "./pages/Vouchers";
import DayBook from "./pages/DayBook";
import TrialBalance from "./pages/TrialBalance";
import ProfitLoss from "./pages/ProfitLoss";
import GST from "./pages/GST";
import GSTR1 from "./pages/GSTR1";
import GSTR3B from "./pages/GSTR3B";
import ITRSummary from "./pages/ITRSummary";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [company, setCompany] = useState(() => {
    const saved = localStorage.getItem("corix:company");
    return saved ? JSON.parse(saved) : null;
  });

  // One data hook, instantiated once here, passed down to every page —
  // this is what makes "load once, never re-fetch on every click" possible.
  const data = useCompanyData(company);

  useEffect(() => {
    if (company) localStorage.setItem("corix:company", JSON.stringify(company));
  }, [company]);

  // Clear the in-memory selected company on sign-out so a different account
  // signing in on the same device/session doesn't start on someone else's
  // company selection (its data won't load either way — RLS — but this
  // keeps the UI from looking like it's showing a stale selection).
  useEffect(() => {
    if (!user && company) setCompany(null);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout company={company} onSelectCompany={setCompany} onSignOut={signOut} syncing={data.syncing}>
      <Routes>
        <Route path="/" element={<Dashboard company={company} onSelectCompany={setCompany} />} />
        <Route path="/ledgers" element={<Ledgers company={company} data={data} />} />
        <Route path="/vouchers" element={<Vouchers company={company} data={data} />} />
        <Route path="/day-book" element={<DayBook company={company} data={data} user={user} />} />
        <Route path="/trial-balance" element={<TrialBalance company={company} data={data} />} />
        <Route path="/profit-loss" element={<ProfitLoss company={company} data={data} />} />
        <Route path="/gst" element={<GST company={company} />} />
        <Route path="/gst/gstr1" element={<GSTR1 company={company} data={data} />} />
        <Route path="/gst/gstr3b" element={<GSTR3B company={company} data={data} />} />
        <Route path="/itr" element={<ITRSummary company={company} data={data} />} />
        <Route path="/audit-log" element={<AuditLog company={company} data={data} />} />
        <Route path="/settings" element={<Settings user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
