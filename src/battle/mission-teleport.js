import { createPlayerFighter, destroyFighter } from "../fighters.js?v=0.81.0";
import { playerFighterAppearance } from "../character.js?v=0.76.0";
import { missionTravelPresentation } from "./mission-travel-presentation.js?v=0.96.0";
import { playTeleportTransition } from "./teleport-transition.js?v=1.1.0";
import { BATTLE_ARENAS, HEIGHT, WIDTH, battleRuntime, sharpenTextTree } from "./runtime.js?v=0.91.0";

export async function playMissionTeleport(scene, data) {
  const returning = data.direction === "toVillage" || data.direction === "toDoctorRoute";
  const mission = battleRuntime.activeMission;
  const arena = mission.encounters?.length ? BATTLE_ARENAS[((mission.arenaNumber || mission.number || 1) - 1) % BATTLE_ARENAS.length].texture : "forest-road";
  const source = returning ? arena : "village-outskirts";
  const destination = data.direction === "toDoctorRoute" ? "forest-road" : returning ? "village-outskirts" : arena;
  const background = scene.add.image(WIDTH / 2, HEIGHT / 2, source).setDisplaySize(WIDTH, HEIGHT).setDepth(0);
  scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x06101a, .12).setOrigin(0).setDepth(1);
  const presentation = missionTravelPresentation(mission, data);
  const title = scene.add.text(480, 90, returning ? "REGRESO POR TRANSPORTACIÓN" : "TRANSPORTACIÓN A LA MISIÓN", {
    fontFamily: '"Cinzel", Georgia, serif', fontSize: "22px", color: "#f5edd8", fontStyle: "bold", stroke: "#102536", strokeThickness: 4
  }).setOrigin(.5).setDepth(12);
  const location = scene.add.text(480, 125, returning ? presentation.departure : "ALDEA", {
    fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "16px", color: "#d6e7e4"
  }).setOrigin(.5).setDepth(12);
  const fighter = createPlayerFighter(scene, 220, 372, playerFighterAppearance(battleRuntime.activeSave));
  fighter.body.setName("teleport-traveler");
  try {
    sharpenTextTree(scene.children.list);
    const completed = await playTeleportTransition(scene, { fighter, objectId: battleRuntime.activeSave.character.teleportObject,
      changeScreen() { background.setTexture(destination).setDisplaySize(WIDTH, HEIGHT); title.setText(presentation.arrival); location.setText(presentation.destination); } });
    if (completed) scene.finishTravel(data);
  } finally { if (fighter.body.scene) destroyFighter(fighter); }
}
