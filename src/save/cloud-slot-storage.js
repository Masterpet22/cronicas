export const cloudSaveSlots = [1, 2, 3];

export function createCloudSlotStorage({ storage, uid, slotKey, isPlayable, changed }) {
  const prefix = `cronicas-account:${uid}:`;
  const keys = new Map(cloudSaveSlots.map(slot => [slotKey(slot), slot]));
  const records = new Map();
  const conflicts = new Map();
  let sending = false;
  let pulling = false;

  for (const slot of cloudSaveSlots) {
    try {
      const record = JSON.parse(storage.getItem(prefix + slot));
      if (record && (record.revision === null || Number.isInteger(record.revision))
        && (record.payload === null || typeof record.payload === "string")) records.set(slot, record);
    } catch (_) { /* Se consultará la ranura en Firebase. */ }
  }

  function persist(slot, record) {
    storage.setItem(prefix + slot, JSON.stringify(record));
    records.set(slot, record);
  }

  function update(slot, payload, imported) {
    const record = records.get(slot);
    if (!record || !isPlayable(record.payload)) throw new Error("Ranura sin cargar o incompatible.");
    if (record.payload === payload && !imported) return;
    persist(slot, { ...record, payload, pending: true, imported: imported || record.imported });
    changed();
  }

  function reconcile(slot, remote) {
    const revision = remote?.revision ?? null;
    const payload = remote?.payload === "null" ? null : remote?.payload ?? null;
    const local = records.get(slot);
    if (local?.pending && revision !== local.revision && payload !== local.payload) {
      conflicts.set(slot, { revision, payload });
      return;
    }
    conflicts.delete(slot);
    if (local?.pending && payload !== local.payload) return;
    if (local?.revision === revision && local.payload === payload && !local.pending) return;
    persist(slot, { revision, payload, pending: false, imported: local?.imported });
  }

  return {
    getItem(key) {
      const slot = keys.get(key);
      if (!slot) return storage.getItem(prefix + key);
      const payload = records.get(slot)?.payload ?? null;
      return isPlayable(payload) ? payload : null;
    },
    setItem(key, value) {
      const slot = keys.get(key);
      if (slot) update(slot, value);
      else storage.setItem(prefix + key, value);
    },
    removeItem(key) {
      const slot = keys.get(key);
      if (slot) update(slot, null);
      else storage.removeItem(prefix + key);
    },
    slotStatus(slot) {
      if (conflicts.has(slot)) return "conflict";
      const record = records.get(slot);
      if (!record) return "unknown";
      if (!isPlayable(record.payload)) return "incompatible";
      return record.payload === null ? "empty" : "ready";
    },
    pending() { return [...records.values()].some(record => record.pending); },
    hasWork() { return cloudSaveSlots.some(slot => records.get(slot)?.pending && !conflicts.has(slot)); },
    conflicts() { return [...conflicts].map(([slot, remote]) => ({ slot, local: records.get(slot).payload, ...remote })); },
    imported(slot, payload) {
      return [...records.values()].some(record => record.payload === payload || (record.payload !== null && record.imported === slot));
    },
    importSave(slot, source, payload) {
      if (this.slotStatus(slot) !== "empty" || !isPlayable(payload)) throw new Error("Elige una ranura libre.");
      update(slot, payload, source);
    },
    resolve(slot, keepLocal) {
      const remote = conflicts.get(slot);
      if (!remote) return;
      const local = records.get(slot);
      persist(slot, keepLocal
        ? { ...local, revision: remote.revision, pending: true }
        : { ...remote, pending: false, imported: local.imported });
      conflicts.delete(slot);
      changed();
    },
    async pull(api, signal) {
      if (pulling) return;
      pulling = true;
      try {
        const before = new Map(records);
        const pendingWrites = sending;
        const request = Promise.all(cloudSaveSlots.map(slot => api.readCopy(uid, slot)));
        const snapshots = signal ? await Promise.race([request, new Promise(resolve => {
          signal.addEventListener("abort", () => resolve(null), { once: true });
        })]) : await request;
        if (!snapshots || signal?.aborted) return;
        for (const [index, slot] of cloudSaveSlots.entries()) {
          const record = records.get(slot);
          if (record === before.get(slot) && !(pendingWrites && record?.pending)) reconcile(slot, snapshots[index]);
        }
      } finally { pulling = false; }
    },
    async flush(api) {
      if (sending || pulling) return;
      sending = true;
      try {
        let failure;
        for (const slot of cloudSaveSlots) {
          const record = records.get(slot);
          if (!record?.pending || conflicts.has(slot)) continue;
          try {
            await api.uploadCopy(uid, slot, record.payload ?? "null", record.revision);
            const latest = records.get(slot);
            persist(slot, { ...latest, revision: (record.revision ?? 0) + 1, pending: latest.payload !== record.payload });
          } catch (error) {
            if (error?.code !== "save/conflict") { failure ??= error; continue; }
            try { reconcile(slot, await api.readCopy(uid, slot)); }
            catch (readError) { failure ??= readError; }
          }
        }
        if (failure) throw failure;
      } finally { sending = false; }
    }
  };
}
