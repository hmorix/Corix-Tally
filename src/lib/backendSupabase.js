// Adapter implementing the shared backend interface (see backend.js) using
// Supabase directly — this is exactly the logic that used to live inline in
// useAuth.js / useCompanyData.js / Dashboard.jsx, moved here unchanged so
// the default, already-working path behaves identically to before.
import { supabase } from "./supabaseClient";

export const supabaseBackend = {
  auth: {
    async getSession() {
      const { data } = await supabase.auth.getSession();
      return data.session?.user || null;
    },
    onAuthChange(cb) {
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => cb(session?.user || null));
      return () => sub.subscription.unsubscribe();
    },
    signIn: ({ email, password }) => supabase.auth.signInWithPassword({ email, password }),
    signUp: ({ email, password, fullName }) => supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } }),
    signInWithGoogle: () => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } }),
    resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/login" }),
    signOut: () => supabase.auth.signOut()
  },
  data: {
    async listCompanies() {
      const { data } = await supabase.from("companies").select("*").order("created_at");
      return data || [];
    },
    async createCompany({ name, gstin, state }) {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("companies").insert({ name, gstin, state, user_id: userData.user.id }).select().single();
      if (error) throw error;
      await supabase.rpc("seed_default_groups", { target_company: data.id });
      return data;
    },
    async listLedgers(companyId) {
      const [{ data: groups }, { data: ledgers }] = await Promise.all([
        supabase.from("ledger_groups").select("*").eq("company_id", companyId),
        supabase.from("ledgers").select("*").eq("company_id", companyId).order("name")
      ]);
      return { groups: groups || [], ledgers: ledgers || [] };
    },
    async saveLedger(record) {
      const { error } = await supabase.from("ledgers").upsert(record);
      if (error) throw error;
      return record;
    },
    async deleteLedger(id) {
      const { error } = await supabase.from("ledgers").delete().eq("id", id);
      if (error) throw error;
    },
    async listVouchers(companyId) {
      const [{ data: vouchers }, { data: entries }] = await Promise.all([
        supabase.from("vouchers").select("*").eq("company_id", companyId),
        supabase.from("voucher_entries").select("*, vouchers!inner(company_id)").eq("vouchers.company_id", companyId)
      ]);
      return { vouchers: vouchers || [], entries: entries || [] };
    },
    async saveVoucher(voucher, entryRows) {
      const { error: vErr } = await supabase.from("vouchers").upsert(voucher);
      if (vErr) throw vErr;
      const { error: dErr } = await supabase.from("voucher_entries").delete().eq("voucher_id", voucher.id);
      if (dErr) throw dErr;
      if (entryRows.length) {
        const { error: eErr } = await supabase.from("voucher_entries").insert(entryRows);
        if (eErr) throw eErr;
      }
      return { voucher, entries: entryRows };
    },
    async deleteVoucher(id) {
      const { error } = await supabase.from("vouchers").delete().eq("id", id);
      if (error) throw error;
    },
    async getProfile() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single();
      return data;
    },
    async updateProfile(fields) {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("profiles").update(fields).eq("id", userData.user.id);
      if (error) throw error;
    },
    async listAudit(companyId) {
      const { data } = await supabase.from("audit_log").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
    async logAudit(entry) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await supabase.from("audit_log").insert({ ...entry, user_id: userData.user.id });
    }
  }
};
