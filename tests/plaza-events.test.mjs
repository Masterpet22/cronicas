import assert from "node:assert/strict";
import { worldDate, dateNumber, addDays, monthLength, shiftMonth, calendarMonth, eventsBetween, plazaSchedule, eventByKey, eventProgress, actOnPlazaEvent, eventQuizQuestion, normalizeEventState } from "../src/plaza-events.js";
import { createCharacter, createDefaultSave, normalizeSave, writeSave, loadSave, selectSaveSlot } from "../src/save.js";

assert.equal(worldDate(new Date("2026-11-06T03:59:59Z")), "2026-11-05");
assert.equal(worldDate(new Date("2026-11-06T04:00:00Z")), "2026-11-06");
assert.equal(monthLength("2028-02"), 29);
assert.equal(monthLength("2100-02"), 28);
assert.ok(Number.isNaN(dateNumber("2026-02-29")));
assert.ok(Number.isNaN(dateNumber("2026-13-01")));
assert.equal(addDays("2028-02-28", 1), "2028-02-29");
assert.equal(shiftMonth("2026-12", 1), "2027-01");
assert.equal(shiftMonth("2027-01", -1), "2026-12");
for (const [month, count] of [["2028-02", 29], ["2100-02", 28], ["2026-11", 30], ["2026-12", 31]]) {
  const cells = calendarMonth(month);
  assert.equal(cells.length, 42);
  assert.equal(cells.filter(Boolean).length, count);
  assert.equal(new Set(cells.filter(Boolean)).size, count);
  assert.ok(cells.filter(Boolean).every(day => day.startsWith(month)));
}
assert.equal(calendarMonth("2026-11")[6], "2026-11-01", "La semana comienza en lunes");
let schedule = plazaSchedule("2026-10-30");
assert.equal(schedule.next.start, "2026-11-06");
assert.equal(schedule.daysUntil, 7);
assert.equal(schedule.active.length, 0);
assert.equal(plazaSchedule("2026-12-31").next.start, "2027-01-06");
assert.equal(plazaSchedule("2026-12-31").daysUntil, 6);
for (const day of ["2026-11-06", "2026-11-07", "2026-11-08"]) assert.equal(plazaSchedule(day).active[0].id, "lantern-festival");
assert.equal(plazaSchedule("2026-11-09").active.length, 0);
assert.equal(plazaSchedule("2026-11-06").daysUntil, 9, "El próximo evento excluye el que ya está en curso");
assert.deepEqual(plazaSchedule("2026-11-06", []), { active: [], next: null, daysUntil: null });
assert.equal(plazaSchedule("2026-11-06", [{ id: "future", schedule: { start: "2030-05-01" } }]).next.start, "2030-05-01", "Las fechas únicas no tienen un límite artificial de anticipación");
assert.equal(plazaSchedule("2028-03-01", [{ id: "leap", schedule: { monthly: { from: 29, to: 29, months: [2] } } }]).next.start, "2032-02-29");
assert.equal(plazaSchedule("2096-03-01", [{ id: "leap", schedule: { monthly: { from: 29, to: 29, months: [2] } } }]).next.start, "2104-02-29");
const special = [{ id: "winter", type: "festival", schedule: { start: "2026-12-30", end: "2027-01-02" } },
  { id: "monthly", type: "visit", schedule: { monthly: { from: 29, to: 2 } } }];
const crossing = eventsBetween("2027-01-01", "2027-01-31", special);
assert.equal(crossing.length, 3, "Se incluyen los eventos que comenzaron el mes anterior");
assert.equal(crossing.find(event => event.id === "winter").end, "2027-01-02");
assert.equal(plazaSchedule("2027-01-01", special).active.length, 2, "Puede haber eventos simultáneos");
assert.equal(eventByKey("lantern-festival@2026-11-07"), null, "La edición debe comenzar en una fecha válida");
assert.equal(eventByKey("unknown@2026-11-06"), null);
let save = createCharacter(createDefaultSave(), { name: "Calendario", affinity: "fuego", bodyType: "male" });
const before = structuredClone(save), key = "lantern-festival@2026-11-06";
assert.equal(actOnPlazaEvent(save, key, "light", 0, "2026-11-05").ok, false);
for (const index of [2, 0, 1]) {
  const result = actOnPlazaEvent(save, key, "light", index, "2026-11-06");
  assert.equal(result.ok, true); save = result.save;
}
assert.equal(eventProgress(save, eventByKey(key)).completed, true);
assert.equal(actOnPlazaEvent(save, key, "light", 0, "2026-11-06").ok, false);
assert.equal(actOnPlazaEvent(save, key, "light", 0, "2026-11-09").ok, false);
assert.equal(eventProgress(save, eventByKey("lantern-festival@2026-12-06")).count, 0);
const guestKey = "mei-visit@2026-11-15";
save = actOnPlazaEvent(save, guestKey, "talk", null, "2026-11-15").save;
assert.equal(eventProgress(save, eventByKey(guestKey)).completed, true);
const quizKey = "elemental-trial@2026-11-24";
const wrong = actOnPlazaEvent(save, quizKey, "answer", "fuego", "2026-11-24");
assert.equal(wrong.ok, false);
assert.equal(wrong.save, save);
for (let question = 0; question < 3; question++) {
  const result = actOnPlazaEvent(save, quizKey, "answer", eventQuizQuestion(question).answer, "2026-11-24");
  assert.equal(result.ok, true); save = result.save;
}
assert.equal(eventProgress(save, eventByKey(quizKey)).completed, true);
const { events: oldEvents, ...oldOther } = before, { events: newEvents, ...newOther } = save;
assert.deepEqual(newOther, oldOther, "Participar no gasta objetos ni cambia economía, equipo, maestro o campaña");
assert.deepEqual(normalizeSave(save).events, save.events);
const legacy = { ...before, version: 22 }; delete legacy.events;
assert.deepEqual(normalizeSave(legacy).events, { participation: {} });
assert.deepEqual(normalizeEventState({ participation: { bad: { steps: [1] }, [key]: { steps: [2, 2, -1, 9, "1"] }, [quizKey]: { steps: [0, 2] } } }), { participation: { [key]: { steps: [2] }, [quizKey]: { steps: [0] } } });
const memory = new Map(), storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
selectSaveSlot(1, storage); writeSave(save, storage);
selectSaveSlot(2, storage); writeSave(createCharacter(createDefaultSave(), { name: "Otro", affinity: "agua" }), storage);
assert.deepEqual(loadSave(storage).events, { participation: {} });
selectSaveSlot(1, storage); assert.deepEqual(loadSave(storage).events, save.events);
assert.deepEqual(createCharacter(save, { name: "Nuevo", affinity: "tierra" }).events, { participation: {} });
console.log("Plaza: calendario completo, Bolivia, bisiestos, cambio de año, solapamientos y participación por edición verificados.");
