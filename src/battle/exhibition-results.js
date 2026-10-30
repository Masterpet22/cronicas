import { ARENA_DIFFICULTIES } from "../arena.js?v=0.122.0";

export function showExhibitionResult(scene, won) {
  const host = scene.game.canvas.parentElement, hud = host.querySelector(".combat-access");
  if (hud) hud.inert = true;
  const dialog = document.createElement("dialog");
  dialog.className = "arena-result-dialog";
  dialog.setAttribute("aria-labelledby", "arena-result-title");
  const difficulty = ARENA_DIFFICULTIES.find(entry => entry.id === scene.mission.arenaSettings.difficulty);
  dialog.innerHTML = `<p class="eyebrow">ARENA DEL HORIZONTE · EXHIBICIÓN LOCAL</p><h2 id="arena-result-title">${won ? "Victoria" : "Derrota"}</h2><p>${won ? "Has superado al rival de entrenamiento." : "Ajusta tus técnicas y vuelve a intentarlo."}</p><div class="arena-result-stats"><span>Rival<strong></strong></span><span>Dificultad<strong>${difficulty.name}</strong></span><span>Turnos resueltos<strong>${Math.max(1, scene.round)}</strong></span><span>Vida restante<strong>${Math.max(0, Math.round(scene.player.hp))}/${scene.player.maxHp}</strong></span></div><p class="arena-practice-note">La exhibición no entrega PX, monedas ni puntos de clasificación. Tu campaña, tus objetos y tu bestiario se conservan.</p><footer><button type="button" data-arena-rematch>Revancha</button><button type="button" data-arena-return>Volver a la Arena</button></footer>`;
  dialog.querySelector(".arena-result-stats strong").textContent = scene.encounters[0].name;
  const close = () => { dialog.close(); dialog.remove(); if (hud) hud.inert = false; };
  dialog.querySelector("[data-arena-rematch]").addEventListener("click", () => { close(); scene.scene.restart(); });
  dialog.querySelector("[data-arena-return]").addEventListener("click", () => { close(); scene.leaveExhibition(); });
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); scene.leaveExhibition(); });
  host.append(dialog); dialog.showModal(); dialog.querySelector("[data-arena-rematch]").focus();
  scene.events.once("shutdown", close);
}
