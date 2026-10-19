export function createSlotRepository({ saveKey, activeSlotKey, maxSlots, normalize, createDefault }) {
  const validSlot = (slot) => {
    const parsed = Math.floor(Number(slot));
    return parsed >= 1 && parsed <= maxSlots ? parsed : 1;
  };
  const keyForSlot = (slot) => `${saveKey}-slot-${validSlot(slot)}`;
  const activeSaveSlot = (storage = globalThis.localStorage) => {
    try { return validSlot(storage?.getItem(activeSlotKey)); } catch (_) { return 1; }
  };
  const listSaveSlots = (storage = globalThis.localStorage) => Array.from({ length: maxSlots }, (_, index) => {
    const slot = index + 1;
    try {
      const raw = storage?.getItem(keyForSlot(slot));
      return { slot, save: raw ? normalize(JSON.parse(raw)) : null };
    } catch (_) { return { slot, save: null }; }
  });
  const selectSaveSlot = (slot, storage = globalThis.localStorage) => {
    const selected = validSlot(slot);
    try { storage?.setItem(activeSlotKey, String(selected)); } catch (_) { /* El juego continúa en memoria. */ }
    return loadSave(storage, selected);
  };
  const deleteSaveSlot = (slot, storage = globalThis.localStorage) => {
    const selected = validSlot(slot);
    try { storage?.removeItem(keyForSlot(selected)); } catch (_) { /* El selector seguirá disponible. */ }
    return createDefault();
  };
  const loadSave = (storage = globalThis.localStorage, slot = activeSaveSlot(storage)) => {
    try {
      const raw = storage?.getItem(keyForSlot(slot));
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (_) { return createDefault(); }
  };
  const writeSave = (save, storage = globalThis.localStorage) => {
    const normalized = normalize(save);
    try { storage?.setItem(keyForSlot(activeSaveSlot(storage)), JSON.stringify(normalized)); } catch (_) { /* El juego continúa sin persistencia. */ }
    return normalized;
  };
  return { saveSlotKey: keyForSlot, activeSaveSlot, listSaveSlots, selectSaveSlot, deleteSaveSlot, loadSave, writeSave };
}
