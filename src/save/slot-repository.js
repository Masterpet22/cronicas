export function createSlotRepository({ saveKey, activeSlotKey, maxSlots, normalize, createDefault }) {
  const states = new WeakMap();
  const unavailable = {};
  const listeners = new Set();
  const defaultStorage = () => { try { return globalThis.localStorage || unavailable; } catch (_) { return unavailable; } };
  const stateFor = storage => {
    const key = storage && typeof storage === "object" ? storage : unavailable;
    if (!states.has(key)) states.set(key, { pending: new Map(), selected: null });
    return states.get(key);
  };
  const saveStatus = (storage = defaultStorage()) => {
    const state = stateFor(storage);
    return { ok: !state.pending.size && state.selected === null, pendingSlots: [...state.pending.keys()] };
  };
  const notify = storage => { const status = saveStatus(storage); listeners.forEach(listener => listener(status)); };
  const subscribeSaveStatus = listener => { listeners.add(listener); return () => listeners.delete(listener); };
  const validSlot = (slot) => {
    const parsed = Math.floor(Number(slot));
    return parsed >= 1 && parsed <= maxSlots ? parsed : 1;
  };
  const keyForSlot = (slot) => `${saveKey}-slot-${validSlot(slot)}`;
  const activeSaveSlot = (storage = defaultStorage()) => {
    if (stateFor(storage).selected !== null) return stateFor(storage).selected;
    try { return validSlot(storage?.getItem(activeSlotKey)); } catch (_) { return 1; }
  };
  const listSaveSlots = (storage = defaultStorage()) => Array.from({ length: maxSlots }, (_, index) => {
    const slot = index + 1;
    if (stateFor(storage).pending.has(slot)) return { slot, save: stateFor(storage).pending.get(slot) };
    try {
      const raw = storage?.getItem(keyForSlot(slot));
      return { slot, save: raw ? normalize(JSON.parse(raw)) : null };
    } catch (_) { return { slot, save: null }; }
  });
  const selectSaveSlot = (slot, storage = defaultStorage()) => {
    const selected = validSlot(slot);
    const state = stateFor(storage);
    try { storage.setItem(activeSlotKey, String(selected)); state.selected = null; }
    catch (_) { state.selected = selected; }
    notify(storage);
    return loadSave(storage, selected);
  };
  const deleteSaveSlot = (slot, storage = defaultStorage()) => {
    const selected = validSlot(slot);
    try { storage.removeItem(keyForSlot(selected)); stateFor(storage).pending.delete(selected); }
    catch (_) { stateFor(storage).pending.set(selected, null); }
    notify(storage);
    return createDefault();
  };
  const loadSave = (storage = defaultStorage(), slot = activeSaveSlot(storage)) => {
    if (stateFor(storage).pending.has(validSlot(slot))) return stateFor(storage).pending.get(validSlot(slot)) || createDefault();
    try {
      const raw = storage?.getItem(keyForSlot(slot));
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (_) { return createDefault(); }
  };
  const writeSave = (save, storage = defaultStorage()) => {
    const normalized = normalize(save);
    const slot = activeSaveSlot(storage);
    try { storage.setItem(keyForSlot(slot), JSON.stringify(normalized)); stateFor(storage).pending.delete(slot); }
    catch (_) { stateFor(storage).pending.set(slot, normalized); }
    notify(storage);
    return normalized;
  };
  const retryPendingSaves = (storage = defaultStorage()) => {
    const state = stateFor(storage);
    for (const [slot, save] of [...state.pending]) {
      try {
        if (save === null) storage.removeItem(keyForSlot(slot));
        else storage.setItem(keyForSlot(slot), JSON.stringify(save));
        state.pending.delete(slot);
      } catch (_) { /* La copia en memoria se conserva para otro intento. */ }
    }
    if (state.selected !== null) {
      try { storage.setItem(activeSlotKey, String(state.selected)); state.selected = null; } catch (_) { /* Conserva la selección en memoria. */ }
    }
    notify(storage);
    return saveStatus(storage);
  };
  const pendingSaveCopies = (storage = defaultStorage()) => [...stateFor(storage).pending]
    .filter(([, save]) => save !== null).map(([slot, save]) => ({ slot, save }));
  return { saveSlotKey: keyForSlot, activeSaveSlot, listSaveSlots, selectSaveSlot, deleteSaveSlot, loadSave, writeSave,
    saveStatus, subscribeSaveStatus, retryPendingSaves, pendingSaveCopies };
}
