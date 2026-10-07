import assert from "node:assert/strict";
import { affinityXpForElement, awardEncounter, completeMission, createCharacter, createDefaultSave, derivedStats, loadoutSlotsForLevel, normalizeSave, SAVE_VERSION, spendAttribute } from "../src/save.js";

let save = createCharacter(createDefaultSave(), { name: "  Kira  ", affinity: "viento", appearance: "#34bbaa", bodyType: "female", hair: "4" });
assert.equal(SAVE_VERSION, 5, "La experiencia de afinidad debe usar la quinta versión del guardado");
assert.equal(save.character.name, "Kira", "El nombre debe limpiarse");
assert.equal(save.character.affinity, "viento", "La afinidad seleccionada debe guardarse");
assert.deepEqual(save.character.affinities, ["viento"], "El rango elemental 1 debe comenzar con una afinidad");
assert.equal(save.character.bodyType, "female", "El cuerpo elegido debe guardarse");
assert.equal(save.character.hair, 4, "El peinado elegido debe guardarse");
assert.equal(save.loadout.length, 2, "El personaje debe comenzar con dos técnicas");
assert.equal(new Set(save.loadout).size, 2, "La selección inicial no debe duplicar técnicas");
assert.equal(save.character.affinityXp.viento, 50, "La afinidad inicial debe comenzar con experiencia básica");
assert.equal(loadoutSlotsForLevel(1), 2, "El nivel 1 debe habilitar dos ranuras");
assert.equal(loadoutSlotsForLevel(5), 3, "El nivel 5 debe habilitar la tercera ranura");
assert.equal(loadoutSlotsForLevel(8), 4, "El nivel 8 debe habilitar la cuarta ranura");

const initialStats = derivedStats(save);
assert.equal(initialStats.damageBonus, 2, "El kunai inicial debe sumar daño");
assert.equal(initialStats.maxChakra, 90, "El amuleto inicial debe sumar chakra");

save.progression.attributePoints = 1;
save = spendAttribute(save, "agility");
assert.equal(save.progression.attributes.agility, 1, "Debe poder invertirse un punto");
assert.equal(save.progression.attributePoints, 0, "Invertir un punto debe consumirlo");
assert.equal(derivedStats(save).evasion, 13, "Agilidad y chaleco deben modificar la evasión");

const reward = awardEncounter(save, 3);
assert.equal(reward.coins, 70, "El jefe debe entregar su recompensa");
assert.equal(reward.save.progression.level, 1, "Una sola recompensa del jefe no debe saltar el umbral inicial");
assert.ok(reward.save.character.affinityXp.viento > save.character.affinityXp.viento, "Combatir debe entrenar las afinidades activas");

let routeSave = save;
for (let encounter = 0; encounter < 4; encounter += 1) routeSave = awardEncounter(routeSave, encounter).save;
assert.equal(routeSave.progression.level, 2, "Completar la ruta debe subir al personaje de nivel");
assert.equal(routeSave.progression.attributePoints, 2, "Subir de nivel debe entregar dos puntos de atributo");

let campaignSave = save;
campaignSave = completeMission(campaignSave, "m01").save;
campaignSave = completeMission(campaignSave, "m02").save;
assert.equal(campaignSave.campaign.companion, "mika", "La segunda misión debe desbloquear a Mika");
const repeated = completeMission(campaignSave, "m02");
assert.equal(repeated.firstClear, false, "Repetir una misión no debe duplicar su recompensa principal");
campaignSave = completeMission(campaignSave, "m07").save;
assert.equal(campaignSave.campaign.rank, "Guardián", "Aprobar el examen debe ascender el rango");
assert.equal(campaignSave.campaign.elementRank, 2, "El examen debe abrir el segundo espacio de afinidad");

let fullCampaign = save;
for (let index = 1; index <= 10; index += 1) fullCampaign = completeMission(fullCampaign, `m${String(index).padStart(2, "0")}`).save;
assert.equal(fullCampaign.campaign.completedMissions.length, 10, "La campaña completa debe registrar diez misiones");
assert.equal(fullCampaign.campaign.rank, "Guardián", "La campaña completa debe conservar el ascenso");
assert.equal(fullCampaign.campaign.elementRank, 3, "El final debe abrir el tercer espacio de afinidad");

const corrupt = normalizeSave({ character: { name: "", affinity: "water" }, progression: { level: -4 }, equipment: {}, loadout: ["invalid"] });
assert.equal(corrupt.progression.level, 1, "Los niveles inválidos deben repararse");
assert.equal(corrupt.character.affinity, "fuego", "Las afinidades inválidas deben repararse");
assert.equal(corrupt.loadout.length, 2, "Una selección corrupta debe restaurar las dos técnicas iniciales");
assert.deepEqual(
  { bodyType: corrupt.character.bodyType, face: corrupt.character.face, hair: corrupt.character.hair, top: corrupt.character.top, bottom: corrupt.character.bottom, shoes: corrupt.character.shoes },
  { bodyType: "male", face: 1, hair: 1, top: 1, bottom: 1, shoes: 1 },
  "Un guardado anterior debe migrar a una apariencia modular válida"
);

const migrated = normalizeSave({ character: { name: "Legacy", affinity: "wind" }, progression: { level: 2 }, equipment: {}, campaign: { completedMissions: ["m07"] } });
assert.deepEqual(migrated.character.affinities, ["viento"], "Los guardados anteriores deben migrar su afinidad básica");
assert.equal(migrated.campaign.elementRank, 2, "El progreso anterior debe recuperar su rango elemental");

const dualAffinity = normalizeSave({ ...campaignSave, character: { ...campaignSave.character, affinities: ["viento", "fuego"], affinityXp: { ...campaignSave.character.affinityXp, viento: 100, fuego: 100 } }, loadout: ["lightning_spark"] });
assert.deepEqual(dualAffinity.character.affinities, ["viento", "fuego"], "El rango 2 debe conservar dos afinidades básicas");
assert.ok(dualAffinity.loadout.includes("lightning_spark"), "Combinar Viento y Fuego debe habilitar técnicas de Rayo");
assert.equal(affinityXpForElement(dualAffinity.character, "rayo"), 100, "Las combinaciones deben usar la afinidad básica menos entrenada");

const tripleAffinity = normalizeSave({ ...fullCampaign, progression: { ...fullCampaign.progression, level: 8 }, character: { ...fullCampaign.character, affinities: ["viento", "fuego", "agua"], affinityXp: { viento: 300, fuego: 300, agua: 300, tierra: 0 } }, loadout: ["storm_domain"] });
assert.equal(tripleAffinity.character.affinities.length, 3, "El rango 3 debe conservar tres afinidades básicas");
assert.ok(tripleAffinity.loadout.includes("storm_domain"), "Combinar Viento, Fuego y Agua debe habilitar técnicas de Tormenta");

const emptyBuild = normalizeSave({ ...save, equipment: { weapon: null, armor: null, accessory: null, companion: null }, loadout: [] });
assert.deepEqual(emptyBuild.loadout, [], "Debe ser posible desequipar todas las técnicas");
assert.equal(emptyBuild.equipment.weapon, null, "Debe ser posible dejar una ranura de equipo vacía");

const repairedAppearance = normalizeSave({ ...save, character: { ...save.character, face: 99, hair: -3, top: "3", bottom: 0, shoes: 8 } });
assert.deepEqual(
  { face: repairedAppearance.character.face, hair: repairedAppearance.character.hair, top: repairedAppearance.character.top, bottom: repairedAppearance.character.bottom, shoes: repairedAppearance.character.shoes },
  { face: 3, hair: 1, top: 3, bottom: 1, shoes: 2 },
  "Las piezas modulares fuera de rango deben repararse"
);

console.log("Pruebas de progreso superadas.");
