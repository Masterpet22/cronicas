import assert from "node:assert/strict";
import { awardEncounter, completeMission, createCharacter, createDefaultSave, derivedStats, normalizeSave, SAVE_VERSION, spendAttribute } from "../src/save.js";

let save = createCharacter(createDefaultSave(), { name: "  Kira  ", affinity: "wind", appearance: "#34bbaa" });
assert.equal(SAVE_VERSION, 2, "La campaña debe usar la segunda versión del guardado");
assert.equal(save.character.name, "Kira", "El nombre debe limpiarse");
assert.equal(save.character.affinity, "wind", "La afinidad seleccionada debe guardarse");
assert.equal(save.loadout.length, 4, "El personaje debe comenzar con cuatro técnicas");
assert.equal(new Set(save.loadout).size, 4, "La selección inicial no debe duplicar técnicas");

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

let fullCampaign = save;
for (let index = 1; index <= 10; index += 1) fullCampaign = completeMission(fullCampaign, `m${String(index).padStart(2, "0")}`).save;
assert.equal(fullCampaign.campaign.completedMissions.length, 10, "La campaña completa debe registrar diez misiones");
assert.equal(fullCampaign.campaign.rank, "Guardián", "La campaña completa debe conservar el ascenso");

const corrupt = normalizeSave({ character: { name: "", affinity: "water" }, progression: { level: -4 }, equipment: {}, loadout: ["invalid"] });
assert.equal(corrupt.progression.level, 1, "Los niveles inválidos deben repararse");
assert.equal(corrupt.character.affinity, "fire", "Las afinidades inválidas deben repararse");
assert.equal(corrupt.loadout.length, 4, "Una selección corrupta debe restaurarse");

console.log("Pruebas de progreso superadas.");
