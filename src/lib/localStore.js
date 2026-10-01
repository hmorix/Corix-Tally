// Local-first data layer, built on IndexedDB.
//
// The rule this file exists to enforce: every write goes to IndexedDB FIRST
// (so the UI updates instantly, offline-safe), THEN to Supabase in the
// background. Reads come from IndexedDB / in-memory state — Supabase is
// only queried once per company per session (see useCompanyData.js), never
// re-queried after every click. If a Supabase write fails (offline, or a
// dropped connection on a slow mobile network), the change stays queued in
// the `sync_queue` store and is retried automatically when the browser
// fires its `online` event.
//
// This keeps the app fast on a phone with patchy data, and cuts down on
// Supabase requests, which is what "don't fetch data again and again" means
// in practice.

const DB_NAME = "corix-tally";
const DB_VERSION = 1;
const STORES = ["companies", "ledger_groups", "ledgers", "vouchers", "voucher_entries", "sync_queue"];

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

export async function getAll(storeName) {
  const store = await tx(storeName, "readonly");
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put(storeName, value) {
  const store = await tx(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.put(value);
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}

export async function putMany(storeName, values) {
  const store = await tx(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    for (const v of values) store.put(v);
    store.transaction.oncomplete = () => resolve();
    store.transaction.onerror = () => reject(store.transaction.error);
  });
}

export async function remove(storeName, id) {
  const store = await tx(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(storeName) {
  const store = await tx(storeName, "readwrite");
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// --- sync queue -------------------------------------------------------
// Each queued item: { id, type, payload, createdAt }
// type is one of: ledger_upsert, ledger_delete, voucher_upsert, voucher_delete

export async function enqueue(type, payload) {
  const item = { id: uuid(), type, payload, createdAt: Date.now() };
  await put("sync_queue", item);
  return item;
}

export async function dequeue(id) {
  await remove("sync_queue", id);
}

// Called on sign-out so a different account signing in on the same device
// never sees a previous user's cached rows before their own Supabase fetch
// completes. Supabase's RLS already prevents any real data leak either way
// — this is purely for a clean, un-confusing UI on shared devices.
export async function clearAll() {
  await Promise.all(STORES.map((s) => clearStore(s)));
}

export function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2) + Date.now();
}
