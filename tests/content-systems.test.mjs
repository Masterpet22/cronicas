import assert from "node:assert/strict";
import { ALL_MISSIONS, MISSIONS, SECONDARY_MISSIONS, STORY_SAGAS } from "../src/data.js";
import { getDialogue, getMissionSceneDialogue, validateDialogueReferences } from "../src/dialogues.js";
import { missionHasStep, missionState, missionsForBoard, validateMissionCatalog } from "../src/mission-system.js";
import { secondaryMissionCardModel } from "../src/secondary-missions.js";
import { completeSecondaryMission, createDefaultSave } from "../src/save.js";
import { createViewRuntime } from "../src/view-runtime.js";

assert.deepEqual(MISSIONS.map((mission) => mission.id), ["m01", "m02", "m03", "m04", "m05"], "Las misiones principales deben tener IDs continuos");
assert.ok(MISSIONS.every((mission) => mission.category === "main" && mission.board === "headquarters"), "Las principales deben pertenecer exclusivamente al Cuartel");
assert.ok(SECONDARY_MISSIONS.every((mission) => mission.category === "secondary" && mission.board === "missions"), "Las secundarias deben pertenecer exclusivamente al Tablón");
assert.deepEqual(validateMissionCatalog(ALL_MISSIONS, STORY_SAGAS), [], "El catálogo no debe tener IDs, requisitos o mecánicas inválidas");
assert.deepEqual(validateDialogueReferences(ALL_MISSIONS), [], "Cada misión debe apuntar a un diálogo traducible existente");
assert.ok(ALL_MISSIONS.every((mission) => !Object.hasOwn(mission, "briefing")), "El texto no debe quedar incrustado en las definiciones de misión");
assert.ok(missionHasStep(MISSIONS[2], "choice", "hideout-entry"), "Una misión debe poder declarar decisiones sin cambiar el renderizador del Tablón");
assert.ok(missionHasStep(MISSIONS[3], "resource", "hideout-supplies"), "El flujo debe admitir mecánicas de recursos además de combate");
assert.ok(missionHasStep(MISSIONS[4], "consequence", "prisoner-intelligence"), "Una misión futura debe poder reaccionar a decisiones anteriores sin depender de su ID");

const initial = { progression: { level: 1 }, campaign: { completedMissions: [], completedSecondaryMissions: [] } };
assert.equal(missionState(MISSIONS[0], initial).unlocked, true, "La primera misión debe estar disponible");
assert.equal(missionState(MISSIONS[1], initial).unlocked, false, "La segunda principal debe esperar la secundaria requerida");
const afterFirst = { progression: { level: 1 }, campaign: { completedMissions: ["m01"], completedSecondaryMissions: [], secondaryBoardUnlocked: true } };
assert.equal(missionState(SECONDARY_MISSIONS[0], afterFirst).unlocked, true, "La principal debe poder desbloquear una secundaria en otro tablero");
const afterInvestigation = { progression: { level: 1 }, campaign: { ...afterFirst.campaign, completedSecondaryMissions: ["s01"], banditBossMissionUnlocked: true } };
assert.equal(missionState(MISSIONS[1], afterInvestigation).unlocked, true, "La secundaria completada debe desbloquear la siguiente principal");
const flagRequirements = ALL_MISSIONS.flatMap((mission) => (mission.requirements || []).filter((requirement) => requirement.type === "flag"));
assert.deepEqual(flagRequirements.map((requirement) => requirement.id), ["secondaryBoardUnlocked"], "Solo el evento narrativo del Tablón puede seguir siendo un requisito guardado; los demás desbloqueos se derivan del historial");

const fakeInvestigation = {
  id: "s99", number: 99, category: "secondary", board: "missions", type: "investigation",
  title: "Investigación de prueba", location: "Zona aislada", duration: "1 min", rank: "D",
  requirements: [], reward: { xp: 0, coins: 0 }, flow: [{ type: "investigation", id: "test-clues" }]
};
const extensibleSave = createDefaultSave();
const extensibleBoard = missionsForBoard([...SECONDARY_MISSIONS, fakeInvestigation], "missions", extensibleSave);
assert.ok(extensibleBoard.some(({ mission }) => mission.id === fakeInvestigation.id), "Una investigación nueva debe aparecer en el Tablón a partir del catálogo recibido");
assert.equal(secondaryMissionCardModel(fakeInvestigation, extensibleSave).actionLabel, "INVESTIGAR", "El Tablón debe presentar una investigación nueva por tipo, sin conocer su ID");
const fakeCompletion = completeSecondaryMission(extensibleSave, fakeInvestigation);
assert.equal(fakeCompletion.firstClear, true, "Una investigación nueva debe usar el completador registrado para su tipo");
assert.ok(fakeCompletion.save.campaign.completedSecondaryMissions.includes(fakeInvestigation.id), "Completar una investigación nueva debe registrar su ID sin modificar save.js");

const localized = getDialogue("mission.m02.briefing", { variables: { master: "Mei Hayate" }, placement: { surface: "mission-briefing", owner: "m02" } });
assert.equal(localized.length, 3, "El briefing traducible debe conservar todas sus líneas");
assert.match(localized[1].text, /Mei Hayate/, "Las traducciones deben admitir variables de contexto");
assert.deepEqual(getDialogue("mission.m02.briefing", { placement: { surface: "location-intro", owner: "ren" } }), [], "Un diálogo no debe renderizarse fuera de la vista y propietario declarados");
assert.match(getMissionSceneDialogue("m01", "combat-tutorial", { variables: { master: "Daichi Kazan" } })[0].text, /Daichi Kazan/, "Las escenas internas deben usar el mismo catálogo traducible");
assert.deepEqual(getDialogue("mission.m01.combat-tutorial", { placement: { surface: "mission-scene", owner: "m02.combat-tutorial" } }), [], "Una escena de misión no debe reutilizarse en otra misión");

class FakeRoot {
  constructor() { this.dataset = {}; this.html = ""; this.overlays = []; }
  replaceChildren() { this.html = ""; this.overlays.forEach((overlay) => { overlay.isConnected = false; }); this.overlays = []; }
  insertAdjacentHTML(_position, html) { this.html = html; }
  querySelectorAll(selector) { return selector === "[data-transient-overlay]" ? this.overlays : []; }
  append(overlay) { overlay.isConnected = true; this.overlays.push(overlay); }
}
const root = new FakeRoot();
const runtime = createViewRuntime(root);
const firstView = runtime.replace("first", "<p>Primera</p>");
const events = new EventTarget();
let calls = 0;
firstView.listen(events, "ping", () => { calls += 1; });
events.dispatchEvent(new Event("ping"));
const overlay = { dataset: {}, isConnected: false, remove() { this.isConnected = false; } };
runtime.mountOverlay(overlay);
runtime.replace("second", "<p>Segunda</p>");
events.dispatchEvent(new Event("ping"));
assert.equal(calls, 1, "Cambiar de vista debe abortar los listeners de la anterior");
assert.equal(overlay.isConnected, false, "Cambiar de vista debe desmontar overlays transitorios");
assert.equal(root.dataset.activeView, "second", "Solo una vista debe quedar marcada como activa");

console.log("Pruebas de catálogos, diálogos y ciclo de vistas superadas.");
