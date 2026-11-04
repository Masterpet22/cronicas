import { NPCS } from "./npcs.js?v=0.131.0";
import { masterIdForCharacter } from "./save/character-state.js";
import { META_ASSET_VERSION } from "./asset-urls.js?v=0.115.0";

const GUARDIANS = { headquarters: "ren", shop: "hana", archive: "sayo", kagemori: "iori" };
const HARU = { id: "haru", name: "Haru Takamine", title: "Médico errante" };
const AREA_LINES = {
  headquarters: "Yo organizo las sagas y sus encargos. Tu maestro te ayudará a preparar cada salida.",
  shop: "Aquí compras por el precio indicado y vendes a la mitad. Elige la cantidad antes de confirmar.",
  archive: "Yo guardo el Diccionario, el Bestiario y la Crónica. Tu maestro te ayudará a aplicar lo que descubras.",
  kagemori: "Yo conozco esta aldea. Reúne las pistas y tu maestro te ayudará a relacionarlas.",
  "doctor-route": "Cada camino conectado tiene ventajas y riesgos. Cuando llegues, te enseñaré a leer el mapa cifrado.",
  battle: "Te acompaño desde fuera del duelo. Practicaremos una acción a la vez."
};
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function tutorialSpeakers(save, area = "battle") {
  const master = NPCS[masterIdForCharacter(save.character)];
  const doctorFound = (save.campaign?.doctorRoute?.phase || 0) >= 3;
  const guardian = ["dojo", "battle"].includes(area) ? master : area === "doctor-route" ? doctorFound ? HARU : master : NPCS[GUARDIANS[area]] || master;
  const introduction = area === "doctor-route" ? doctorFound ? "El cifrado oculta la ruta. Intercambia sellos vecinos para revelar sus fragmentos." : "Como exploradora, te aconsejo leer los caminos conectados y sus riesgos. Haru podrá ayudarte al final del recorrido." : AREA_LINES[area];
  return { master, guardian, introduction: introduction || "Aprenderemos sobre los controles reales, una acción a la vez." };
}

export function tutorialActor(save, area, role = "master") {
  const { master, guardian } = tutorialSpeakers(save, area);
  return role === "guardian" && guardian.image ? guardian : master;
}

export function tutorialCharacterMarkup(actor) {
  return `<div class="tutorial-character-stage story-character" data-dialogue-character="${actor.id}"><img src="${actor.image}?v=${META_ASSET_VERSION}" alt="${escape(actor.name)}" width="1145" height="1374" loading="eager" fetchpriority="high" decoding="async"></div>`;
}

export function tutorialSpeakerMarkup(actor) {
  return `<strong data-tutorial-speaker="${actor.id}">${escape(actor.name)}</strong><small>${escape(actor.title)}</small>`;
}

export function updateTutorialActor(root, actor) {
  const character = root.querySelector("[data-dialogue-character]");
  if (character.dataset.dialogueCharacter !== actor.id) {
    character.dataset.dialogueCharacter = actor.id;
    const image = character.querySelector("img"); image.src = `${actor.image}?v=${META_ASSET_VERSION}`; image.alt = actor.name;
    root.querySelector("[data-dialogue-speaker]").innerHTML = tutorialSpeakerMarkup(actor);
  }
}
