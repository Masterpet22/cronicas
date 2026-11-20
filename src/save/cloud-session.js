import { listSaveSlots, SAVE_VERSION, saveSlotKey, saveStatus } from "../save.js?v=0.161.0";
import { cloudSaveSlots, createCloudSlotStorage } from "./cloud-slot-storage.js?v=1.0.0";
import { browserSaveStorage, useAccountSaveStorage } from "./save-storage.js?v=1.0.0";

const accountKey = "cronicas-cloud-account";
const listeners = new Set();
const browser = browserSaveStorage();
let account;
let adapter;
let client;
let api;
let loading = false;
let syncing = false;
let unavailable = false;
let blocked = false;
let timer;
let backoff = 1200;
let authUnsubscribe;

try { account = JSON.parse(browser?.getItem(accountKey)); } catch (_) { /* Sesión de invitado. */ }
if (!account || typeof account.uid !== "string" || !account.uid) account = null;

function notify() { listeners.forEach(listener => listener()); }

function playable(payload) {
  if (payload === null) return true;
  try {
    const save = JSON.parse(payload);
    return Number.isInteger(save?.version) && save.version > 0 && save.version <= SAVE_VERSION && !!save.character;
  } catch (_) { return false; }
}

function fallbackDeadline(task, time) {
  const controller = new AbortController();
  let timeout;
  const limit = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("No se pudo conectar con Firebase a tiempo."));
    }, time);
  });
  return Promise.race([task(controller.signal), limit]).finally(() => clearTimeout(timeout));
}

async function connect() {
  client ??= import("./firebase-cloud.js?v=1.0.0").catch(error => { client = null; throw error; });
  const service = await client;
  await service.ready();
  return service;
}

function currentService() {
  return {
    readCopy: (uid, slot) => api.readCopy(uid, slot),
    uploadCopy(uid, slot, payload, revision) {
      if (api.currentUser()?.uid !== uid) throw new Error("La sesión cambió.");
      return api.uploadCopy(uid, slot, payload, revision);
    }
  };
}

function planSync() {
  if (timer || syncing || !adapter?.hasWork()) return;
  timer = setTimeout(flush, backoff);
}

async function flush() {
  clearTimeout(timer);
  timer = undefined;
  if (!adapter?.pending() || syncing || loading || blocked || !adapter.hasWork()) return;
  syncing = true;
  notify();
  try {
    api ??= await fallbackDeadline(connect, 5000);
    if (api.currentUser()?.uid !== account.uid) throw new Error("Vuelve a iniciar sesión para sincronizar.");
    await adapter.flush(currentService());
    unavailable = false;
    backoff = 1200;
  } catch (_) {
    unavailable = true;
    backoff = Math.min(backoff * 2, 30000);
  } finally {
    syncing = false;
    planSync();
    notify();
  }
}

function reloadWithAccount(user) {
  if (user) browser.setItem(accountKey, JSON.stringify({ uid: user.uid, label: user.email || user.displayName || "" }));
  else browser.removeItem(accountKey);
  try { sessionStorage.removeItem("cronicas-save-slot-selected"); } catch (_) { /* La cuenta abre el selector. */ }
  window.location.reload();
}

async function claimAccount(uid) {
  if (!globalThis.navigator?.locks) return false;
  return new Promise(resolve => {
    navigator.locks.request(`cronicas-save:${uid}`, { ifAvailable: true }, lock => {
      resolve(!!lock);
      if (lock) return new Promise(() => {});
    }).catch(() => resolve(false));
  });
}

export async function startCloudSaveSession() {
  if (!account) return;
  if (!browser || !await claimAccount(account.uid)) { blocked = true; return; }
  adapter = createCloudSlotStorage({
    storage: browser, uid: account.uid, slotKey: saveSlotKey, isPlayable: playable,
    changed() { planSync(); notify(); }
  });
  useAccountSaveStorage(adapter);
  window.addEventListener("online", () => {
    backoff = 1200;
    void flush();
  });
  window.addEventListener("pagehide", () => { if (adapter.hasWork()) void flush(); });
  void refresh();
}

async function refresh() {
  if (!adapter || loading) return;
  loading = true;
  notify();
  try {
    api ??= await fallbackDeadline(connect, 5000);
    if (api.currentUser()?.uid !== account.uid) { reloadWithAccount(null); return; }
    authUnsubscribe ??= api.watchAccount(user => {
      if (user?.uid !== account.uid && saveStatus().ok) reloadWithAccount(null);
    });
    await fallbackDeadline(signal => adapter.pull(currentService(), signal), 4500);
    unavailable = false;
  } catch (_) { unavailable = true; }
  finally {
    loading = false;
    planSync();
    notify();
  }
}

export const cloudSession = {
  get account() { return account; },
  get loading() { return loading; },
  get blocked() { return blocked; },
  get unavailable() { return unavailable; },
  get syncing() { return syncing; },
  get pending() { return adapter?.pending() || false; },
  get conflicts() { return adapter?.conflicts() || []; },
  slotStatus(slot) { return account ? adapter?.slotStatus(slot) || "unknown" : "local"; },
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  refresh,
  async prepareLogin() { api ??= await fallbackDeadline(connect, 5000); },
  async signIn() {
    if (!browser) throw new Error("El navegador no permite guardar la sesión.");
    if (!saveStatus().ok) throw new Error("Reintenta el guardado local antes de conectar la cuenta.");
    api ??= await fallbackDeadline(connect, 5000);
    const user = api.currentUser() || (await api.logIn()).user;
    if (!saveStatus().ok) throw new Error("Reintenta el guardado local antes de conectar la cuenta.");
    reloadWithAccount(user);
  },
  async signOut() {
    if (!saveStatus().ok) throw new Error("Reintenta el guardado local antes de cerrar sesión.");
    api ??= await fallbackDeadline(connect, 5000);
    authUnsubscribe?.();
    authUnsubscribe = undefined;
    await api.logOut();
    reloadWithAccount(null);
  },
  async retry() {
    if (blocked) { window.location.reload(); return; }
    await refresh();
    if (!unavailable) await flush();
  },
  imports() {
    if (!adapter || loading) return [];
    const empty = cloudSaveSlots.filter(slot => adapter.slotStatus(slot) === "empty");
    if (!empty.length) return [];
    return listSaveSlots(browser).filter(({ slot, save }) => save?.character && !adapter.imported(slot, JSON.stringify(save)))
      .map(({ slot, save }) => ({ slot, save, targets: empty }));
  },
  importSave(source, target) {
    const entry = this.imports().find(item => item.slot === source && item.targets.includes(target));
    if (entry) adapter.importSave(target, source, JSON.stringify(entry.save));
  },
  resolve(slot, keepLocal) { adapter?.resolve(slot, keepLocal); }
};
