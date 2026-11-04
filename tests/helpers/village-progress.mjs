import { STORY_SAGAS } from "../../src/content/sagas/futuro-prometedor/saga.js";

// Las pruebas de servicios preparan el progreso requerido; las pruebas de
// desbloqueos comprueban los límites con partidas nuevas por separado.
export function unlockVillageForTest(save, { arena = false, rank = 1 } = {}) {
  const tutorial = STORY_SAGAS.find(saga => saga.number === 1);
  save.campaign.completedMissions = [...tutorial.missionIds];
  save.campaign.archiveUnlocked = true;
  save.progression.level = Math.max(save.progression.level, arena ? 16 : 1, rank === 2 ? 15 : rank === 3 ? 30 : 1);
  if (rank >= 2 && !save.campaign.completedSecondaryMissions.includes("affinity_trial_2")) save.campaign.completedSecondaryMissions.push("affinity_trial_2");
  if (rank >= 3 && !save.campaign.completedSecondaryMissions.includes("affinity_trial_3")) save.campaign.completedSecondaryMissions.push("affinity_trial_3");
  return save;
}

// La saga 2 no existe aún. Solo en el navegador de pruebas se sirve un
// catálogo sintético para ejercitar los servicios reservados a saga 3.
export async function installArenaSagaForTest(page) {
  await page.route("**/src/content/sagas/futuro-prometedor/saga.js*", async route => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({ response, body: source + '\nSTORY_SAGAS.push({ id: "test-service-saga", number: 2, title: "Saga de prueba de servicios", subtitle: "Solo pruebas", missionIds: [STORY_SAGA.missionIds.at(-1)] });\n' });
  });
}
