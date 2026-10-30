import { cipherComplete, cipherHint } from "../src/puzzles/seal-cipher.js";
import assert from "node:assert/strict";
import { DEBUG_CHECKPOINTS, actOnDoctorCipher, affinityXpForElement, advanceMissionProgress, applyDebugCheckpoint, awardEncounter, chooseDoctorMissionRoute, chooseHideoutEntrance, completeDoctorMission, completeMission, createCharacter, createDefaultSave, deleteSaveSlot, deliverBestiaryBook, derivedStats, failMissionProgress, learnAffinity, listSaveSlots, loadSave, loadoutSlotsForLevel, normalizeSave, recordBestiaryObservation, resetAttributes, resolveDoctorMissionCombat, resolveDoctorRiverPassage, SAVE_VERSION, selectMaster, selectNextAffinity, selectSaveSlot, spendAttribute, startDoctorMission, startMissionProgress, writeSave } from "../src/save.js";
import { MISSIONS, STORY_SAGAS } from "../src/content/index.js";
import { campaignFlag } from "../src/mission-system.js";

let save = createCharacter(createDefaultSave(), { name: "  Kira  ", affinity: "viento", appearance: "#34bbaa", bodyType: "female", hair: "4" });
assert.equal(SAVE_VERSION, 22, "La versión debe incluir el espacio personal persistente");
assert.deepEqual(MISSIONS.map((mission) => mission.id), ["m01", "s01", "m02", "s02", "m03", "m04", "m05"], "El catálogo principal debe utilizar una numeración continua");
assert.deepEqual(STORY_SAGAS[0].missionIds, MISSIONS.map((mission) => mission.id), "La saga y el catálogo principal deben compartir una sola lista de misiones");
assert.equal(save.character.name, "Kira", "El nombre debe limpiarse");
assert.equal(save.character.affinity, "viento", "La afinidad seleccionada debe guardarse");
assert.deepEqual(save.character.affinities, ["viento"], "El rango elemental 1 debe comenzar con una afinidad");
assert.equal(save.character.bodyType, "female", "El cuerpo elegido debe guardarse");
assert.equal(save.character.masterId, "daichi", "El avatar femenino debe comenzar con Daichi");
assert.equal(save.character.hair, 4, "El peinado elegido debe guardarse");
assert.equal(save.loadout.length, 2, "El personaje debe comenzar con dos técnicas");
assert.equal(new Set(save.loadout).size, 2, "La selección inicial no debe duplicar técnicas");
assert.equal(save.character.affinityXp.viento, 50, "La afinidad inicial debe comenzar con experiencia básica");
assert.equal(loadoutSlotsForLevel(1), 2, "El nivel 1 debe habilitar dos ranuras");
assert.equal(loadoutSlotsForLevel(5), 3, "El nivel 5 debe habilitar la tercera ranura");
assert.equal(loadoutSlotsForLevel(8), 4, "El nivel 8 debe habilitar la cuarta ranura");

class MemoryStorage {
  constructor(entries = []) { this.values = new Map(entries); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
const slotStorage = new MemoryStorage();
selectSaveSlot(1, slotStorage);
writeSave(save, slotStorage);
assert.equal(loadSave(slotStorage).character.name, "Kira", "La primera ranura debe recuperar su personaje");
assert.equal(listSaveSlots(slotStorage).filter((entry) => entry.save?.character).length, 1, "Las ranuras deben conservar solamente las partidas creadas");
selectSaveSlot(2, slotStorage);
const secondCharacter = createCharacter(createDefaultSave(), { name: "Renji", affinity: "fuego", bodyType: "male", hair: 2 });
assert.equal(secondCharacter.character.hair, 1, "Un peinado no compatible debe migrar a Corto al crear la partida");
const baldCharacter = createCharacter(createDefaultSave(), { name: "Sora", affinity: "agua", bodyType: "male", hair: 0 });
assert.equal(baldCharacter.character.hair, 0, "TIPO 01 debe persistirse como personaje sin cabello");
writeSave(secondCharacter, slotStorage);
assert.deepEqual(listSaveSlots(slotStorage).map((entry) => entry.save?.character?.name || null), ["Kira", "Renji", null], "Las tres ranuras deben conservar progresos independientes");
selectSaveSlot(1, slotStorage);
assert.equal(loadSave(slotStorage).character.name, "Kira", "Cambiar de ranura debe recuperar la partida seleccionada");
deleteSaveSlot(2, slotStorage);
assert.equal(listSaveSlots(slotStorage)[1].save, null, "Una ranura borrada debe quedar disponible para una partida nueva");

const initialStats = derivedStats(save);
assert.equal(initialStats.damageBonus, 15, "La fuerza base, Daichi y el kunai inicial deben acumularse");
assert.equal(initialStats.damageReduction, 0, "Daichi no debe conceder la ventaja defensiva de Mei");
assert.equal(initialStats.maxHp, 88, "Viento principal debe penalizar 12 % la vida");
assert.equal(initialStats.maxChakra, 144, "Viento principal debe potenciar 20 % el chakra base equipado");

save.progression.attributePoints = 5;
for (const attribute of ["health", "strength", "speed", "chakra", "luck"]) save = spendAttribute(save, attribute);
assert.deepEqual(save.progression.attributes, { health: 1, strength: 1, speed: 1, chakra: 1, luck: 1 }, "Debe poder invertirse un punto en cada estadística");
assert.equal(save.progression.attributePoints, 0, "Invertir los cinco puntos debe consumirlos");
const trainedStats = derivedStats(save);
assert.equal(trainedStats.maxHp, 97, "Vida debe aumentar los PV antes de aplicar la penalización de Viento");
assert.equal(trainedStats.damageBonus, 16, "Fuerza debe aumentar el daño, además de la base, el equipo y Daichi");
assert.equal(trainedStats.speed, 11, "Velocidad debe acelerar el avance desde la base fija");
assert.equal(trainedStats.maxChakra, 150, "Chakra debe aumentar la reserva antes del bono de Viento");
assert.equal(trainedStats.evasion, 18, "Suerte base, entrenamiento y chaleco deben modificar la evasión");
assert.equal(trainedStats.criticalChance, 13, "Suerte debe mejorar el crítico sin volverlo demasiado frecuente");
const resetTraining = resetAttributes(save);
assert.deepEqual(resetTraining.progression.attributes, { health: 0, strength: 0, speed: 0, chakra: 0, luck: 0 }, "Reiniciar atributos debe devolver la distribución a cero");
assert.equal(resetTraining.progression.attributePoints, 5, "Reiniciar atributos debe reembolsar todos los puntos invertidos");

const reward = awardEncounter(save, "boss_raizen");
assert.equal(reward.coins, 75, "El jefe final debe entregar una recompensa propia");
assert.equal(reward.save.progression.level, 1, "Una sola recompensa del jefe no debe saltar el umbral inicial");
assert.ok(reward.save.character.affinityXp.viento > save.character.affinityXp.viento, "Combatir debe entrenar las afinidades activas");

let routeSave = save;
for (const enemyId of MISSIONS[0].encounters) routeSave = awardEncounter(routeSave, enemyId).save;
routeSave = completeMission(routeSave, "m01").save;
assert.equal(routeSave.progression.level, 2, "Completar la ruta debe subir al personaje de nivel");
assert.equal(routeSave.progression.attributePoints, 2, "Subir de nivel debe entregar dos puntos de atributo");
assert.equal(awardEncounter(routeSave, "boss_varek", { firstClear: false }).xp, 0, "Repetir una misión no debe otorgar experiencia ilimitada");
const levelTwoStats = derivedStats(routeSave);
assert.ok(levelTwoStats.maxHp > trainedStats.maxHp, "Subir de nivel debe fortalecer al personaje aun sin repartir puntos");

let campaignSave = save;
const startedMission = startMissionProgress(campaignSave, "m01");
assert.equal(startedMission.campaign.missionProgress.m01.status, "in-progress", "Iniciar una misión debe crear su estado recuperable");
const missionCursor = startedMission.campaign.missionProgress.m01.currentStepId;
const resumedMission = startMissionProgress(startedMission, "m01");
assert.equal(resumedMission.campaign.missionProgress.m01.currentStepId, missionCursor, "Reanudar debe conservar el primer paso pendiente");
assert.equal(resumedMission.campaign.missionProgress.m01.attempts, 2, "Reanudar debe contar el intento sin borrar contexto ni cursor");
const failedMission = failMissionProgress(resumedMission, "m01");
assert.equal(failedMission.campaign.missionProgress.m01.status, "failed", "Fallar debe dejar la misión disponible para reintentar");
assert.equal(normalizeSave(failedMission).campaign.missionProgress.m01.status, "failed", "El estado fallido debe sobrevivir una recarga");
const retriedMission = startMissionProgress(failedMission, "m01");
assert.equal(retriedMission.campaign.missionProgress.m01.status, "in-progress", "Reintentar debe abrir un nuevo intento activo");
assert.equal(retriedMission.campaign.missionProgress.m01.attempts, 3, "Reintentar debe incrementar el contador de intentos");
let secondMissionProgress = startMissionProgress(applyDebugCheckpoint(save, "mission-2-ready"), "m02");
secondMissionProgress = advanceMissionProgress(secondMissionProgress, "m02", "canyon-assault", { encountersDefeated: 1 });
assert.equal(secondMissionProgress.campaign.missionProgress.m02.currentStepId, "lieutenant-fate", "Tras el asalto, el próximo paso debe ser la decisión del teniente sin investigación intermedia");
assert.equal(startMissionProgress(secondMissionProgress, "m02").campaign.missionProgress.m02.currentStepId, "lieutenant-fate", "Reanudar debe recuperar el paso pendiente guardado");
const retiredInvestigation = structuredClone(secondMissionProgress);
retiredInvestigation.campaign.missionProgress.m02.currentStepId = "canyon-traces";
const resumedWithoutInvestigation = normalizeSave(retiredInvestigation).campaign.missionProgress.m02;
assert.equal(resumedWithoutInvestigation.currentStepId, "lieutenant-fate", "Una partida detenida en la investigación retirada debe continuar al próximo paso válido");
assert.equal(resumedWithoutInvestigation.context.encountersDefeated, 1, "Retirar la investigación no debe borrar el contexto del progreso guardado");
const beforeCombat = startMissionProgress(applyDebugCheckpoint(save, "mission-3-ready"), "m03");
assert.equal(beforeCombat.campaign.missionProgress.m03.currentStepId, "hideout-entry", "La decisión previa al combate debe ser el primer paso de m03");
const knownHideout = normalizeSave({ ...beforeCombat, campaign: { ...beforeCombat.campaign, hideoutEntryChoice: "main" } });
assert.equal(startMissionProgress(knownHideout, "m03").campaign.missionProgress.m03.currentStepId, "hideout-threshold", "Una decisión persistida debe ceder el cursor al combate de m03");
const finalMissionStart = startMissionProgress(applyDebugCheckpoint(save, "mission-5-ready"), "m05");
assert.equal(finalMissionStart.campaign.missionProgress.m05.currentStepId, "raizen-duel", "La consecuencia ya decidida debe reanudar en el duelo de m05");
assert.equal(secondMissionProgress.campaign.missionProgress.m02.context.encountersDefeated, 1, "El contexto de misión debe persistir al avanzar");
campaignSave = completeMission(campaignSave, "m01").save;
const repeated = completeMission(campaignSave, "m01");
assert.equal(repeated.firstClear, false, "Repetir una misión no debe duplicar su recompensa principal");
const unknownMission = completeMission(campaignSave, "missing-mission");
assert.equal(unknownMission.firstClear, false, "Una misión inexistente no debe poder completarse ni otorgar recompensas");
assert.deepEqual(unknownMission.save.campaign.completedMissions, ["m01"], "Una misión inexistente no debe entrar al historial");

let fullCampaign = completeMission(applyDebugCheckpoint(save, "mission-5-ready"), "m05").save;
assert.deepEqual([...fullCampaign.campaign.completedMissions].sort(), ["m01", "m02", "m03", "m04", "m05", "s01", "s02"], "La campaña completa debe registrar exactamente las siete misiones vigentes");
assert.equal(campaignFlag(fullCampaign, "firstSagaCompleted"), true, "La última misión vigente debe cerrar la primera saga");
assert.equal(fullCampaign.campaign.missionProgress.m05.status, "completed", "El progreso debe cerrar la misión en el historial por pasos");

const corrupt = normalizeSave({ character: { name: "", affinity: "water" }, progression: { level: -4 }, equipment: {}, loadout: ["invalid"] });
assert.equal(corrupt.progression.level, 1, "Los niveles inválidos deben repararse");
assert.equal(corrupt.character.affinity, "fuego", "Las afinidades inválidas deben repararse");
assert.equal(corrupt.loadout.length, 2, "Una selección corrupta debe restaurar las dos técnicas iniciales");
assert.deepEqual(
  { bodyType: corrupt.character.bodyType, face: corrupt.character.face, hair: corrupt.character.hair, top: corrupt.character.top, bottom: corrupt.character.bottom, shoes: corrupt.character.shoes },
  { bodyType: "male", face: 1, hair: 0, top: 1, bottom: 1, shoes: 1 },
  "Los valores inválidos deben normalizarse a una apariencia modular válida"
);

const migrated = normalizeSave({ version: 15, character: { name: "Prueba", affinity: "viento", affinities: ["viento"] }, progression: { level: 2 }, equipment: {}, campaign: { completedMissions: ["m01", "m11", "m12", "m07"], elementRank: 2, kagemoriInvestigated: true, doctorMissionCompleted: true } });
assert.deepEqual(migrated.campaign.completedMissions, ["m01", "m02", "m03", "s01", "s02"], "La migración debe conservar el progreso usando la numeración nueva");
assert.deepEqual(migrated.campaign.completedSecondaryMissions, [], "La migración debe separar el progreso de encargos secundarios");
assert.equal(migrated.campaign.missionProgress.m01.status, "completed", "La migración debe reconstruir el progreso completo por misión");
assert.equal(Object.hasOwn(migrated.campaign, "doctorMissionUnlocked"), false, "El v17 elimina indicadores reconstruibles");
assert.equal(Object.hasOwn(migrated.campaign, "companion"), false, "La migración debe retirar el estado de acompañante de la campaña anterior");
const normalized = normalizeSave({ version: 16, character: { name: "Prueba", affinity: "viento", affinities: ["viento"] }, progression: { level: 2 }, equipment: {}, campaign: { completedMissions: ["m01"], elementRank: 2 } });
assert.deepEqual(normalized.character.affinities, ["viento"], "La afinidad principal válida debe conservarse");
assert.equal(normalized.campaign.elementRank, 2, "El rango elemental actual debe conservarse");
assert.equal(normalized.campaign.secondaryBoardUnlocked, false, "Un estado parcial debe mantener el Tablón cerrado");
assert.deepEqual(normalized.campaign.seenMissionNotices, [], "Un estado parcial debe iniciar sin avisos vistos");
const noticesSeen = normalizeSave({ ...normalized, campaign: { ...normalized.campaign, seenMissionNotices: ["story:m01", "valor no válido", "story:m01"] } });
assert.deepEqual(noticesSeen.campaign.seenMissionNotices, ["story:m01"], "Los avisos vistos deben persistir sin duplicados ni claves inválidas");
const storyState = normalizeSave({ ...normalized, campaign: { ...normalized.campaign, sayoEncounterSeen: true, secondaryBoardUnlocked: true, completedSecondaryMissions: ["s01"] } });
assert.equal(campaignFlag(storyState, "banditBossMissionUnlocked"), true, "El hallazgo de la guarida se reconstruye desde la misión secundaria completada");
const interrogated = normalizeSave({ ...storyState, campaign: { ...storyState.campaign, banditPrisonerChoice: "interrogate" } });
const canyonComplete = completeMission(interrogated, "m02").save;
assert.equal(canyonComplete.campaign.archiveUnlocked, false, "Vencer a Akumori todavía no debe desbloquear la Biblioteca");
assert.equal(campaignFlag(canyonComplete, "cipherMapObtained"), true, "Akumori debe dejar el mapa cifrado");
assert.equal(campaignFlag(canyonComplete, "doctorMissionUnlocked"), true, "El mapa debe activar la misión del doctor");
assert.equal(campaignFlag(canyonComplete, "masterSelectionUnlocked"), false, "La misión 2 todavía no debe liberar la elección de maestro");

let doctorRoute = startDoctorMission(canyonComplete);
doctorRoute = chooseDoctorMissionRoute(doctorRoute, "elevated");
assert.equal(doctorRoute.campaign.doctorRoute.phase, 1, "El camino elevado debe resolver una fase segura");
doctorRoute = chooseDoctorMissionRoute(doctorRoute, "river");
assert.equal(doctorRoute.campaign.doctorRoute.pendingEvent.type, "river", "El río debe exigir encontrar el paso correcto");
doctorRoute = resolveDoctorRiverPassage(doctorRoute, "stones");
assert.equal(doctorRoute.campaign.doctorRoute.phase, 1, "Una respuesta incorrecta no debe saltar la investigación");
doctorRoute = resolveDoctorRiverPassage(doctorRoute, "reeds");
assert.equal(doctorRoute.campaign.doctorRoute.phase, 2, "El paso correcto debe completar la fase del río");
doctorRoute = chooseDoctorMissionRoute(doctorRoute, "forest");
assert.equal(doctorRoute.campaign.doctorRoute.phase, 3, "El bosque de la tercera fase debe converger directamente en Haru");
let combatRoute = chooseDoctorMissionRoute(startDoctorMission(canyonComplete), "forest");
combatRoute = chooseDoctorMissionRoute(combatRoute, "forest");
assert.equal(combatRoute.campaign.doctorRoute.pendingEvent.type, "combat", "El bosque de la segunda fase debe activar un duelo individual");
const combatRouteCoins = combatRoute.progression.coins;
combatRoute = resolveDoctorMissionCombat(combatRoute);
assert.equal(combatRoute.campaign.doctorRoute.phase, 2, "Vencer el duelo debe reanudar la búsqueda sin conceder una fase adicional");
assert.equal(combatRoute.progression.coins, combatRouteCoins, "El duelo de ruta no debe otorgar monedas repetibles");
assert.equal(completeDoctorMission(doctorRoute).blocked, true, "Encontrar a Haru no permite cobrar antes de descifrar el mapa");
doctorRoute = actOnDoctorCipher(doctorRoute, "start").save;
for (let turn = 0; turn < 200 && !cipherComplete(doctorRoute.campaign.doctorRoute.cipher); turn += 1) {
  const hint = cipherHint(doctorRoute.campaign.doctorRoute.cipher);
  doctorRoute = actOnDoctorCipher(doctorRoute, "swap", hint).save;
}
assert.equal(cipherComplete(doctorRoute.campaign.doctorRoute.cipher), true);
const doctorCompletion = completeDoctorMission(doctorRoute);
assert.equal(doctorCompletion.save.campaign.doctorBookDeliveryPending, true, "Haru debe entregar el libro para llevarlo obligatoriamente a la Biblioteca");
assert.equal(doctorCompletion.coins, 60, "La información del teniente debe duplicar las monedas de este encargo");
assert.equal(doctorCompletion.supplyBonus, 1, "Los recursos reunidos durante las rutas deben convertirse en un suministro utilizable");
assert.equal(completeDoctorMission(doctorCompletion.save).firstClear, false, "El encargo no debe poder cobrarse dos veces");
const deliveredBook = deliverBestiaryBook(doctorCompletion.save);
assert.equal(deliveredBook.campaign.archiveUnlocked, true, "Sayo debe abrir la Biblioteca al recibir el libro");
assert.equal(campaignFlag(deliveredBook, "secretEntranceKnown"), true, "Interrogar y perdonar al teniente debe marcar la entrada secreta");
assert.equal(deliveredBook.bestiary.entries.bandit_pathfinder.encounters, 1, "Sayo debe transcribir al libro los informes de los enemigos ya enfrentados");
assert.deepEqual(deliveredBook.bestiary.entries.bandit_pathfinder.techniques, [], "El informe previo no debe inventar técnicas que el libro no observó");
const secretEntry = chooseHideoutEntrance(deliveredBook, "secret");
const thresholdComplete = completeMission(secretEntry, "m03");
assert.equal(thresholdComplete.coins, 175, "El almacén secreto debe sumar 90 monedas a la recompensa de la misión 3");
assert.equal(thresholdComplete.save.campaign.secretWarehouseLooted, true, "La partida debe recordar que se saqueó el almacén");
assert.equal(campaignFlag(thresholdComplete.save, "heartMissionUnlocked"), true, "Superar el umbral debe desbloquear el corazón de la guarida");
assert.equal(thresholdComplete.save.campaign.hideoutSupplies, 2, "La misión 4 debe recibir el suministro base y el recuperado durante la búsqueda de Haru");
const heartComplete = completeMission(thresholdComplete.save, "m04");
assert.equal(campaignFlag(heartComplete.save, "organizationRevealed"), true, "La misión 4 debe revelar la organización superior");
assert.equal(campaignFlag(heartComplete.save, "banditLeaderMissionUnlocked"), true, "La misión 4 debe desbloquear el duelo con Raizen");
const sagaComplete = completeMission(heartComplete.save, "m05");
assert.equal(campaignFlag(sagaComplete.save, "firstSagaCompleted"), true, "Derrotar a Raizen debe completar la primera saga");
assert.equal(campaignFlag(sagaComplete.save, "masterSelectionUnlocked"), true, "Completar toda la saga debe liberar la elección de maestro");
let fieldGuide = recordBestiaryObservation(deliveredBook, "reed_bandit", { encounter: true });
fieldGuide = recordBestiaryObservation(fieldGuide, "reed_bandit", { technique: "quick", vulnerability: "fuego", defeated: true });
assert.equal(fieldGuide.bestiary.entries.reed_bandit.encounters, 1, "El primer encuentro debe abrir una ficha del bestiario");
assert.deepEqual(fieldGuide.bestiary.entries.reed_bandit.techniques, ["quick"], "Presenciar una técnica debe registrarla");
assert.deepEqual(fieldGuide.bestiary.entries.reed_bandit.vulnerabilities, ["fuego"], "Descubrir una debilidad debe conservarla");
const eliminatedRoute = normalizeSave({ ...doctorCompletion.save, campaign: { ...doctorCompletion.save.campaign, banditPrisonerChoice: "eliminate", doctorBookDeliveryPending: true, archiveUnlocked: false, secretEntranceKnown: false } });
const eliminatedBook = deliverBestiaryBook(eliminatedRoute);
assert.equal(campaignFlag(eliminatedBook, "secretEntranceKnown"), false, "Eliminar al teniente debe mantener oculta la entrada secreta");
assert.equal(chooseHideoutEntrance(eliminatedBook, "secret").campaign.hideoutEntryChoice, "main", "Sin la pista del teniente no debe poder forzarse la entrada secreta");
assert.equal(completeMission(chooseHideoutEntrance(eliminatedBook, "main"), "m03").coins, 85, "La entrada principal no debe conceder el oro del almacén");
const meiStudent = selectMaster(sagaComplete.save, "mei");
assert.equal(meiStudent.character.masterId, "mei", "La elección libre debe persistir después de la saga");
assert.equal(derivedStats(meiStudent).damageReduction, 2, "Mei debe reducir el daño recibido");

assert.equal(DEBUG_CHECKPOINTS.length, 8, "El depurador debe ofrecer puntos de control para todo el flujo tutorial disponible");
const debugCoins = canyonComplete.progression.coins;
const missionTwoReady = applyDebugCheckpoint(canyonComplete, "mission-2-ready");
assert.deepEqual(missionTwoReady.campaign.completedMissions, ["m01", "s01"], "El punto de control de misión 2 debe dejar solamente la misión 1 completada");
assert.equal(campaignFlag(missionTwoReady, "banditBossMissionUnlocked"), true, "El punto de control debe desbloquear el Desfiladero");
assert.equal(missionTwoReady.progression.coins, debugCoins, "Los puntos de control no deben entregar ni retirar monedas");
const libraryReady = applyDebugCheckpoint(save, "library-ready");
assert.equal(campaignFlag(libraryReady, "doctorMissionCompleted"), true, "El último punto de control debe completar la búsqueda del doctor");
assert.equal(libraryReady.campaign.archiveUnlocked, true, "El último punto de control debe abrir la Biblioteca");
assert.equal(campaignFlag(applyDebugCheckpoint(save, "mission-4-ready"), "heartMissionUnlocked"), true, "El depurador debe poder saltar directamente a la misión 4");
assert.equal(campaignFlag(applyDebugCheckpoint(save, "mission-5-ready"), "banditLeaderMissionUnlocked"), true, "El depurador debe poder saltar directamente a la misión 5");

const dualAffinity = normalizeSave({ ...campaignSave, progression: { ...campaignSave.progression, level: 15 }, character: { ...campaignSave.character, affinities: ["viento", "fuego"], affinityXp: { ...campaignSave.character.affinityXp, viento: 100, fuego: 100 } }, campaign: { ...campaignSave.campaign, elementRank: 2 }, loadout: ["lightning_spark"] });
assert.deepEqual(dualAffinity.character.affinities, ["viento", "fuego"], "El rango 2 debe conservar dos afinidades básicas");
assert.ok(dualAffinity.loadout.includes("lightning_spark"), "Combinar Viento y Fuego debe habilitar técnicas de Rayo");
assert.equal(affinityXpForElement(dualAffinity.character, "rayo"), 100, "Las combinaciones deben usar la afinidad básica menos entrenada");
let affinityChoice = normalizeSave({ ...campaignSave, progression: { ...campaignSave.progression, level: 15 }, campaign: { ...campaignSave.campaign, elementRank: 2 } });
affinityChoice = learnAffinity(affinityChoice, "agua");
affinityChoice = selectNextAffinity(affinityChoice, "agua");
assert.deepEqual(affinityChoice.character.affinities, ["viento", "agua"], "Una afinidad conocida debe poder elegirse cuando nivel e historia abren la ranura");
assert.deepEqual(selectNextAffinity(affinityChoice, "agua").character.affinities, ["viento", "agua"], "No debe poder elegirse dos veces la misma afinidad");

const tripleAffinity = normalizeSave({ ...fullCampaign, inventory: { ...fullCampaign.inventory, extraAffinityUnlocked: true }, progression: { ...fullCampaign.progression, level: 35 }, character: { ...fullCampaign.character, affinities: ["viento", "fuego", "agua"], affinityXp: { viento: 300, fuego: 300, agua: 300, tierra: 0 } }, campaign: { ...fullCampaign.campaign, elementRank: 3 }, loadout: ["storm_domain"] });
assert.equal(tripleAffinity.character.affinities.length, 3, "El rango 3 debe conservar tres afinidades básicas");
assert.ok(tripleAffinity.loadout.includes("storm_domain"), "Combinar Viento, Fuego y Agua debe habilitar técnicas de Tormenta");

const emptyBuild = normalizeSave({ ...save, equipment: { weapon: null, seal: null, accessory: null, companion: null }, loadout: [] });
assert.deepEqual(emptyBuild.loadout, [], "Debe ser posible desequipar todas las técnicas");
assert.equal(emptyBuild.equipment.weapon, null, "Debe ser posible dejar una ranura de equipo vacía");

const repairedAppearance = normalizeSave({ ...save, character: { ...save.character, face: 99, hair: -3, top: "3", bottom: 0, shoes: 8 } });
assert.deepEqual(
  { face: repairedAppearance.character.face, hair: repairedAppearance.character.hair, top: repairedAppearance.character.top, bottom: repairedAppearance.character.bottom, shoes: repairedAppearance.character.shoes },
  { face: 1, hair: 0, top: 1, bottom: 1, shoes: 1 },
  "Las piezas modulares fuera de rango deben repararse"
);

console.log("Pruebas de progreso superadas.");
