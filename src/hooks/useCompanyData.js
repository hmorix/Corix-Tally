import { useCallback, useEffect, useRef, useState } from "react";
import { backend } from "../lib/backend";
import * as db from "../lib/localStore";
import { nextVoucherNumber } from "../lib/voucherNumber";

/**
 * The single place every screen gets its data from. Loaded ONCE per company
 * (not once per page), cached in React state + IndexedDB, and updated in
 * place by CRUD calls. All network access goes through `backend.data.*`
 * (see src/lib/backend.js) — this hook itself has no idea whether that's
 * Supabase or the self-hosted API, which is exactly the point: the local-
 * first caching/sync-queue logic below works identically either way.
 *
 * Write path for every mutation: update React state (instant UI) -> write
 * to IndexedDB (survives refresh/offline) -> push to the backend in the
 * background -> on failure, leave it in the sync queue and retry on the
 * next `online` event or the next app load.
 */
export function useCompanyData(company) {
  const [groups, setGroups] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const loadedCompanyId = useRef(null);

  useEffect(() => {
    if (!company) return;
    if (loadedCompanyId.current === company.id) return; // already loaded this session
    loadedCompanyId.current = company.id;
    loadForCompany(company.id);
  }, [company?.id]);

  useEffect(() => {
    function onOnline() { flushQueue(); }
    window.addEventListener("online", onOnline);
    flushQueue(); // try once on mount too, in case items were queued last session
    return () => window.removeEventListener("online", onOnline);
  }, []);

  async function loadForCompany(companyId) {
    setLoading(true);
    const [g, l, v, e] = await Promise.all([
      db.getAll("ledger_groups"), db.getAll("ledgers"), db.getAll("vouchers"), db.getAll("voucher_entries")
    ]);
    setGroups(g.filter((r) => r.company_id === companyId));
    setLedgers(l.filter((r) => r.company_id === companyId));
    setVouchers(v.filter((r) => r.company_id === companyId));
    setEntries(e.filter((r) => r._companyId === companyId));
    setLoading(false);

    if (!navigator.onLine) return;
    try {
      const [{ groups: rg, ledgers: rl }, { vouchers: rv, entries: re }, auditRows] = await Promise.all([
        backend.data.listLedgers(companyId),
        backend.data.listVouchers(companyId),
        backend.data.listAudit(companyId).catch(() => [])
      ]);
      setGroups(rg); db.putMany("ledger_groups", rg);
      setLedgers(rl); db.putMany("ledgers", rl);
      setVouchers(rv); db.putMany("vouchers", rv);
      const tagged = re.map((r) => ({ ...r, _companyId: companyId }));
      setEntries(tagged); db.putMany("voucher_entries", tagged);
      setAuditLog(auditRows);
    } catch (e) {
      console.warn("Could not refresh from backend, using local cache:", e.message);
    }
  }

  async function flushQueue() {
    if (!navigator.onLine) return;
    setSyncing(true);
    const items = await db.getAll("sync_queue");
    for (const item of items.sort((a, b) => a.createdAt - b.createdAt)) {
      try {
        await applyMutation(item);
        await db.dequeue(item.id);
      } catch (e) {
        console.warn("Sync retry pending for", item.type, e.message);
      }
    }
    setSyncing(false);
  }

  async function applyMutation(item) {
    if (item.type === "ledger_upsert") await backend.data.saveLedger(item.payload);
    else if (item.type === "ledger_delete") await backend.data.deleteLedger(item.payload.id);
    else if (item.type === "voucher_upsert") await backend.data.saveVoucher(item.payload.voucher, item.payload.entryRows);
    else if (item.type === "voucher_delete") await backend.data.deleteVoucher(item.payload.id);
  }

  // --- ledgers -----------------------------------------------------
  const saveLedger = useCallback(async (ledger) => {
    const isNew = !ledger.id;
    const record = { ...ledger, id: ledger.id || db.uuid(), company_id: company.id };
    setLedgers((prev) => {
      const exists = prev.some((l) => l.id === record.id);
      return exists ? prev.map((l) => (l.id === record.id ? record : l)) : [...prev, record];
    });
    await db.put("ledgers", record);
    await db.enqueue("ledger_upsert", record);
    await backend.data.logAudit?.({ company_id: company.id, entity_type: "ledger", entity_id: record.id, action: isNew ? "create" : "update", detail: record.name }).catch(() => {});
    flushQueue();
    return record;
  }, [company?.id]);

  const deleteLedger = useCallback(async (id) => {
    setLedgers((prev) => prev.filter((l) => l.id !== id));
    await db.remove("ledgers", id);
    await db.enqueue("ledger_delete", { id });
    flushQueue();
  }, []);

  // --- vouchers (+ their entries, saved together) -------------------
  const saveVoucher = useCallback(async (voucherFields, lineItems) => {
    const isNew = !voucherFields.id;
    const voucherId = voucherFields.id || db.uuid();
    const voucherNumber = voucherFields.voucher_number || nextVoucherNumber(
      voucherFields.voucher_type,
      vouchers.filter((v) => v.voucher_type === voucherFields.voucher_type && v.id !== voucherId),
      voucherFields.voucher_date
    );
    const voucher = { ...voucherFields, id: voucherId, voucher_number: voucherNumber, company_id: company.id };
    const entryRows = lineItems
      .filter((l) => l.ledger_id && (Number(l.debit) || Number(l.credit)))
      .map((l) => ({ id: l.id || db.uuid(), voucher_id: voucherId, ledger_id: l.ledger_id, debit: Number(l.debit || 0), credit: Number(l.credit || 0) }));
    const taggedEntries = entryRows.map((e) => ({ ...e, _companyId: company.id }));

    setVouchers((prev) => {
      const exists = prev.some((v) => v.id === voucherId);
      return exists ? prev.map((v) => (v.id === voucherId ? voucher : v)) : [voucher, ...prev];
    });
    setEntries((prev) => [...prev.filter((e) => e.voucher_id !== voucherId), ...taggedEntries]);

    await db.put("vouchers", voucher);
    for (const e of taggedEntries) await db.put("voucher_entries", e);
    await db.enqueue("voucher_upsert", { voucher, entryRows });
    await backend.data.logAudit?.({ company_id: company.id, entity_type: "voucher", entity_id: voucherId, action: isNew ? "create" : "update", detail: `${voucher.voucher_type} ${voucherNumber}` }).catch(() => {});
    flushQueue();
    return voucher;
  }, [company?.id, vouchers]);

  const deleteVoucher = useCallback(async (id) => {
    setVouchers((prev) => prev.filter((v) => v.id !== id));
    setEntries((prev) => prev.filter((e) => e.voucher_id !== id));
    await db.remove("vouchers", id);
    await db.enqueue("voucher_delete", { id });
    flushQueue();
  }, []);

  return {
    groups, ledgers, vouchers, entries, auditLog, loading, syncing,
    saveLedger, deleteLedger, saveVoucher, deleteVoucher,
    refresh: () => company && loadForCompany(company.id)
  };
}
