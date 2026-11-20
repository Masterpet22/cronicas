import assert from "node:assert/strict";
import { createCloudSlotStorage } from "../src/save/cloud-slot-storage.js";
import { createSlotRepository } from "../src/save/slot-repository.js";

const memory = () => {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
};
const payload = name => JSON.stringify({ character: { name } });
const documents = new Map([[1, { revision: 4, payload: payload("Legacy") }]]);
const writes = [];
const api = {
  async readCopy(_uid, slot) { return documents.get(slot) || null; },
  async uploadCopy(_uid, slot, value, revision) {
    if ((documents.get(slot)?.revision ?? null) !== revision) throw Object.assign(new Error(), { code: "save/conflict" });
    writes.push({ slot, value });
    documents.set(slot, { revision: (revision ?? 0) + 1, payload: value });
  }
};
const repo = createSlotRepository({ saveKey: "game", activeSlotKey: "active", maxSlots: 3, normalize: value => value, createDefault: () => null });
const device = (storage = memory(), uid = "player") => createCloudSlotStorage({
  storage, uid, slotKey: repo.saveSlotKey, isPlayable: value => value === null || value.startsWith('{"character"'), changed() {}
});

const browser = memory();
let home = device(browser);
assert.equal(home.slotStatus(1), "unknown");
await home.pull(api);
assert.equal(repo.listSaveSlots(home)[0].save.character.name, "Legacy");
assert.equal(home.slotStatus(2), "empty");
home.importSave(2, 1, payload("Imported"));
assert.ok(home.imported(1, payload("Imported")));
assert.throws(() => home.importSave(2, 3, payload("Other")), /ranura libre/);
home = device(browser);
assert.equal(home.hasWork(), true, "Pending progress survives a reload");
await home.flush(api);
assert.equal(documents.get(2).payload, payload("Imported"));
assert.equal(device(browser, "another-account").slotStatus(2), "unknown");

repo.selectSaveSlot(1, home);
repo.writeSave(JSON.parse(payload("First edit")), home);
let finishUpload;
const waiting = home.flush({
  ...api,
  uploadCopy(...args) {
    return new Promise(resolve => { finishUpload = () => resolve(api.uploadCopy(...args)); });
  }
});
repo.writeSave(JSON.parse(payload("Second edit")), home);
finishUpload();
await waiting;
assert.equal(home.hasWork(), true);
await home.flush(api);
assert.equal(documents.get(1).payload, payload("Second edit"));

const tablet = device();
await tablet.pull(api);
repo.selectSaveSlot(1, tablet);
repo.writeSave(JSON.parse(payload("From tablet")), tablet);
await tablet.flush(api);
repo.writeSave(JSON.parse(payload("From home")), home);
await home.flush(api);
assert.equal(home.hasWork(), false, "An unresolved conflict must not keep retrying");
assert.equal(home.conflicts()[0].local, payload("From home"));
assert.equal(documents.get(1).payload, payload("From tablet"));
home.resolve(1, true);
await home.flush(api);
assert.equal(documents.get(1).payload, payload("From home"));

repo.deleteSaveSlot(1, tablet);
await tablet.flush(api);
assert.equal(tablet.slotStatus(1), "conflict", "A stale deletion must not remove newer progress");
tablet.resolve(1, false);
assert.equal(repo.listSaveSlots(tablet)[0].save.character.name, "From home");
repo.deleteSaveSlot(1, tablet);
await tablet.flush(api);
assert.equal(documents.get(1).payload, "null");
const newDevice = device();
await newDevice.pull(api);
assert.equal(newDevice.slotStatus(1), "empty");

let finishRead;
const pull = newDevice.pull({ ...api, readCopy(uid, slot) {
  if (slot !== 2) return api.readCopy(uid, slot);
  return new Promise(resolve => { finishRead = resolve; });
} });
repo.selectSaveSlot(2, newDevice);
repo.writeSave(JSON.parse(payload("Offline progress")), newDevice);
finishRead({ revision: 1, payload: payload("Imported") });
await pull;
assert.equal(repo.listSaveSlots(newDevice)[1].save.character.name, "Offline progress");
assert.ok(newDevice.pending());
assert.ok(writes.length > 0);
console.log("Guardado en Firebase: migración, cola local, aislamiento, conflictos y borrado verificados.");
