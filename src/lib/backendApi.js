// Adapter implementing the shared backend interface (see backend.js) against
// our own Express server (server/), for MySQL/MariaDB/Postgres/MongoDB mode.
import { apiFetch, setToken, clearToken, getToken } from "./apiClient";
import { requestGoogleIdToken } from "./googleAuth";

const listeners = new Set();
function notify(user) { listeners.forEach((cb) => cb(user)); }

export const apiBackend = {
  auth: {
    async getSession() {
      if (!getToken()) return null;
      try {
        const { user } = await apiFetch("/api/auth/me");
        return user;
      } catch {
        clearToken();
        return null;
      }
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signIn({ email, password }) {
      const { token, user } = await apiFetch("/api/auth/login", { method: "POST", body: { email, password } });
      setToken(token);
      notify(user);
      return { error: null };
    },
    async signUp({ email, password, fullName }) {
      const { token, user } = await apiFetch("/api/auth/signup", { method: "POST", body: { email, password, fullName } });
      setToken(token);
      notify(user);
      return { error: null };
    },
    async signInWithGoogle() {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const idToken = await requestGoogleIdToken(clientId);
      const { token, user } = await apiFetch("/api/auth/google", { method: "POST", body: { idToken } });
      setToken(token);
      notify(user);
    },
    async resetPassword(email) {
      await apiFetch("/api/auth/forgot-password", { method: "POST", body: { email } });
      return { error: null };
    },
    async signOut() {
      clearToken();
      notify(null);
    }
  },
  data: {
    async listCompanies() {
      const { companies } = await apiFetch("/api/companies");
      return companies;
    },
    async createCompany({ name, gstin, state }) {
      const { company } = await apiFetch("/api/companies", { method: "POST", body: { name, gstin, state } });
      return company;
    },
    async listLedgers(companyId) {
      return apiFetch(`/api/ledgers?companyId=${companyId}`);
    },
    async saveLedger(record) {
      const { ledger } = await apiFetch("/api/ledgers", {
        method: "POST",
        body: { id: record.id, companyId: record.company_id, name: record.name, group_id: record.group_id, opening_balance: record.opening_balance, opening_balance_type: record.opening_balance_type, gst_rate: record.gst_rate }
      });
      return ledger;
    },
    async deleteLedger(id) {
      await apiFetch(`/api/ledgers/${id}`, { method: "DELETE" });
    },
    async listVouchers(companyId) {
      return apiFetch(`/api/vouchers?companyId=${companyId}`);
    },
    async saveVoucher(voucher, entryRows) {
      const { voucher: saved, entries } = await apiFetch("/api/vouchers", {
        method: "POST",
        body: {
          id: voucher.id, companyId: voucher.company_id, voucher_type: voucher.voucher_type, voucher_date: voucher.voucher_date,
          voucher_number: voucher.voucher_number, narration: voucher.narration, party_name: voucher.party_name,
          party_gstin: voucher.party_gstin, place_of_supply: voucher.place_of_supply, invoice_number: voucher.invoice_number,
          lines: entryRows.map((e) => ({ ledger_id: e.ledger_id, debit: e.debit, credit: e.credit }))
        }
      });
      return { voucher: saved, entries };
    },
    async deleteVoucher(id) {
      await apiFetch(`/api/vouchers/${id}`, { method: "DELETE" });
    },
    async getProfile() {
      const { user } = await apiFetch("/api/auth/me");
      return user;
    },
    async updateProfile(fields) {
      await apiFetch("/api/auth/me", { method: "PATCH", body: fields });
    },
    async listAudit(companyId) {
      const { logs } = await apiFetch(`/api/audit?companyId=${companyId}`);
      return logs;
    },
    async logAudit() {
      // no-op: the API server writes its own audit rows inside
      // routes/vouchers.js, so the frontend doesn't need to log separately
      // in API mode (unlike Supabase mode, where useCompanyData.js does it).
    }
  }
};
