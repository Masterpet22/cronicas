import assert from 'node:assert/strict';
import { createSlotRepository } from '../src/save/slot-repository.js';

const repo = createSlotRepository({saveKey:'save',activeSlotKey:'active',maxSlots:3,normalize:save=>save || {},createDefault:()=>({})});
const entries = new Map([['active','1']]);
let blocked = false;
const storage = {
  getItem:key=>entries.get(key) ?? null,
  setItem(key,value) { if (blocked) throw new Error('QuotaExceededError'); entries.set(key,value); },
  removeItem(key) { if (blocked) throw new Error('SecurityError'); entries.delete(key); }
};
const notifications=[];
repo.subscribeSaveStatus(status=>notifications.push(status));
repo.writeSave({character:{name:'Original'}},storage);
blocked=true;
repo.writeSave({character:{name:'En memoria'}},storage);
assert.equal(repo.saveStatus(storage).ok,false);
assert.equal(repo.loadSave(storage).character.name,'En memoria');
assert.equal(JSON.parse(entries.get('save-slot-1')).character.name,'Original');
repo.selectSaveSlot(2,storage);
repo.writeSave({character:{name:'Segunda'}},storage);
assert.equal(repo.activeSaveSlot(storage),2,'Una selección fallida no debe escribir en otra partida');
assert.deepEqual(repo.pendingSaveCopies(storage).map(copy=>copy.save.character.name),['En memoria','Segunda']);
assert.equal(repo.listSaveSlots(storage)[0].save.character.name,'En memoria');
assert.equal(repo.retryPendingSaves(storage).ok,false);
blocked=false;
assert.equal(repo.retryPendingSaves(storage).ok,true);
assert.equal(JSON.parse(entries.get('save-slot-1')).character.name,'En memoria');
assert.equal(JSON.parse(entries.get('save-slot-2')).character.name,'Segunda');
assert.equal(entries.get('active'),'2');
blocked=true;
repo.deleteSaveSlot(2,storage);
assert.equal(repo.listSaveSlots(storage)[1].save,null,'Una eliminación pendiente no debe reaparecer al cambiar de vista');
assert.deepEqual(repo.loadSave(storage),{});
blocked=false;
repo.retryPendingSaves(storage);
assert.equal(entries.has('save-slot-2'),false);
assert.ok(notifications.some(status=>!status.ok));
assert.equal(notifications.at(-1).ok,true);
const otherStorage={getItem:()=>null,setItem(){},removeItem(){}};
assert.equal(repo.saveStatus(otherStorage).ok,true,'El estado de recuperación está aislado por almacenamiento');
console.log('Guardado: fallo visible, copias por ranura, selección, borrado y reintento sin pérdida verificados.');
