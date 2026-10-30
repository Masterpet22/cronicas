import { SEALS } from "../../data.js?v=0.114.0";
import { CIPHER_SIZE, cipherComplete, cipherHint } from "../../puzzles/seal-cipher.js";

const sealGlyph = (id) => {
  const frame = SEALS[id].frame;
  return `<span class="cipher-glyph" style="background-position:${frame % 3 / 2 * 100}% ${Math.floor(frame / 3) / 3 * 100}%" aria-hidden="true"></span>`;
};
const sceneLines = (mission, scene, deps, save) => deps.getMissionSceneDialogue(mission.id, scene, { save }).map((line) => line.text);

export function renderDoctorCipher(route, mission, deps, save) {
  if (!route.cipher) return `<section class="doctor-route-screen doctor-meeting"><header><div><p class="eyebrow">EL MÉDICO ERRANTE · OBJETIVO LOCALIZADO</p><h2>El campamento de Haru</h2></div></header><section class="doctor-encounter"><div class="doctor-mark" aria-hidden="true">医</div><div><p class="eyebrow">MÉDICO Y VIAJERO</p><h2>${deps.escapeHtml(mission.cipher.speaker)}</h2><p>Haru deja sus instrumentos a un lado y examina las marcas del mapa que has traído.</p><p class="doctor-meeting-note">El viaje te ha llevado hasta él. Ahora comienza el descifrado.</p></div></section><div class="cipher-entry-transition" hidden><div aria-hidden="true">${sealGlyph(mission.cipher.seals[2])}</div><p class="eyebrow">LOS CAMINOS OLVIDADOS</p><h2>El secreto de los sellos</h2><p>Haru extiende el mapa sobre la mesa…</p></div></section>`;
  const solved = cipherComplete(route.cipher);
  const count = route.cipher.revealed.filter(Boolean).length;
  const farewell = sceneLines(mission, mission.cipher.farewellScene, deps, save);
  return `<section class="doctor-route-screen cipher-screen ${solved ? "cipher-solved" : ""}"><header><div><p class="eyebrow">EL MÉDICO ERRANTE · ${solved ? "CIFRADO RESUELTO" : "EL LEGADO DE LOS SELLOS"}</p><h2>${solved ? "El camino ha sido revelado" : "Descifra el mapa de Akumori"}</h2><p>${solved ? "La guarida de los Cuervos ya tiene un lugar en el mapa." : "Reúne tres sellos iguales y descubre los caminos bajo la tinta."}</p></div></header><div class="cipher-workspace"><aside class="cipher-guidance"><div class="cipher-guide-name"><span aria-hidden="true">医</span><div><p class="eyebrow">HARU TAKAMINE</p><strong>La tinta guarda un secreto</strong></div></div>${solved ? farewell.map((text) => `<p>${deps.escapeHtml(text)}</p>`).join("") : `<p>Intercambia dos sellos vecinos. Cada combinación elimina la tinta de esas casillas y revela un fragmento del mapa.</p><p>Une cuatro o más para crear un <strong>sello de línea</strong>. Intercámbialo con un vecino para limpiar una fila o columna.</p><div class="cipher-seal-legend">${mission.cipher.seals.map((id, type) => `<span class="cipher-type-${type}">${sealGlyph(id)}<small>${SEALS[id].label}</small></span>`).join("")}</div>`}<div class="cipher-progress-label"><span>MAPA DESCIFRADO</span><strong data-cipher-progress>${count}/36</strong></div><div class="cipher-progress-track" role="progressbar" aria-label="Fragmentos del mapa descifrados" aria-valuemin="0" aria-valuemax="36" aria-valuenow="${count}"><span style="width:${count / 36 * 100}%"></span></div><p class="cipher-move-count"><span data-cipher-moves>${route.cipher.moves}</span> movimientos · Sin límite de tiempo</p><p class="cipher-feedback" data-cipher-feedback role="status">${solved ? "El mapa está completo. Haru puede entregarte su libro." : "Elige un sello y después uno de sus vecinos."}</p>${solved ? '<button class="primary-button" type="button" data-complete-doctor>RECIBIR EL LIBRO Y REGRESAR</button>' : '<button class="secondary-button cipher-hint-button" type="button" data-cipher-hint>PISTA DE HARU</button>'}</aside><div class="cipher-puzzle"><div class="cipher-paper"><img src="assets/maps/akumori-deciphered.svg" alt="Mapa de los caminos hacia la guarida de los Cuervos" class="cipher-map-image" ${solved ? "" : 'aria-hidden="true"'}><div class="cipher-ink" aria-hidden="true"></div><div class="cipher-grid" role="group" aria-label="Tablero de sellos, seis filas y seis columnas"></div></div><p class="cipher-board-caption">${solved ? "CAMINO AL DESFILADERO DEL CUERVO" : "COMBINA LOS SELLOS · REVELA LOS 36 FRAGMENTOS"}</p></div></div></section>`;
}

function delay(scope, duration) {
  return scope.delay(duration);
}

export function mountDoctorCipher(root, scope, state, mission, deps) {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (!state.save.campaign.doctorRoute.cipher) {
    const lines = sceneLines(mission, mission.cipher.lessonScene, deps, state.save).map((text) => [mission.cipher.speaker, text]);
    deps.showDialogue(lines, async () => {
      if (!scope.isCurrent()) return;
      const transition = root.querySelector(".cipher-entry-transition");
      transition.hidden = false;
      const animation = transition.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 100 : 450, fill: "both" });
      scope.onCleanup(() => animation.cancel());
      await delay(scope, reduced ? 160 : 1100);
      if (!scope.isCurrent()) return;
      state.save = deps.onDoctorCipherAction(state.save, "start").save;
      deps.onRerender();
    }, "DESCIFRAR EL MAPA", "story");
    return;
  }
  const grid = root.querySelector(".cipher-grid");
  const ink = root.querySelector(".cipher-ink");
  let selected = null;
  let hint = null;
  let busy = false;
  let display = state.save.campaign.doctorRoute.cipher;
  const animations = new Set();
  const track = (animation) => { animations.add(animation); animation.finished.then(() => animations.delete(animation), () => animations.delete(animation)); };
  scope.onCleanup(() => animations.forEach((animation) => animation.cancel()));
  const feedback = (text) => { root.querySelector("[data-cipher-feedback]").textContent = text; };
  const draw = (snapshot = display) => {
    const solved = cipherComplete(snapshot);
    ink.innerHTML = snapshot.revealed.map((found) => `<span class="${found ? "revealed" : ""}"></span>`).join("");
    grid.innerHTML = snapshot.board.map((type, index) => {
      const seal = mission.cipher.seals[type];
      const special = snapshot.specials[index];
      return `<button type="button" class="cipher-cell cipher-type-${type} ${snapshot.revealed[index] ? "uncovered" : ""} ${selected === index ? "selected" : ""} ${hint && [hint.from, hint.to].includes(index) ? "hinted" : ""} ${special ? `special special-${special}` : ""}" data-cipher-cell="${index}" aria-label="Fila ${Math.floor(index / CIPHER_SIZE) + 1}, columna ${index % CIPHER_SIZE + 1}: ${SEALS[seal].label}${special ? special === "row" ? ", limpia una fila" : ", limpia una columna" : ""}" aria-pressed="${selected === index}" ${busy || solved ? "disabled" : ""}><span class="cipher-piece">${sealGlyph(seal)}${special ? '<span class="cipher-special-mark" aria-hidden="true">✦</span>' : ""}</span></button>`;
    }).join("");
    grid.setAttribute("aria-busy", String(busy));
    const count = snapshot.revealed.filter(Boolean).length;
    root.querySelector("[data-cipher-progress]").textContent = `${count}/36`;
    root.querySelector("[data-cipher-moves]").textContent = state.save.campaign.doctorRoute.cipher.moves;
    const progress = root.querySelector(".cipher-progress-track");
    progress.setAttribute("aria-valuenow", String(count));
    progress.firstElementChild.style.width = `${count / 36 * 100}%`;
  };
  draw();
  if (cipherComplete(display)) return;

  const animateSwap = async (from, to, reverse = false) => {
    if (reduced) return;
    const a = grid.querySelector(`[data-cipher-cell="${from}"]`);
    const b = grid.querySelector(`[data-cipher-cell="${to}"]`);
    const deltaX = ((to % CIPHER_SIZE) - (from % CIPHER_SIZE)) * 100;
    const deltaY = (Math.floor(to / CIPHER_SIZE) - Math.floor(from / CIPHER_SIZE)) * 100;
    for (const [element, sign] of [[a, 1], [b, -1]]) {
      const frames = [{ transform: "translate(0,0)" }, { transform: `translate(${deltaX * sign}%,${deltaY * sign}%)` }];
      const animation = element.animate(reverse ? frames.reverse() : frames, { duration: 170, fill: "both", easing: "ease-in-out" });
      track(animation);
    }
    await delay(scope, 175);
  };

  const playSwap = async (from, to) => {
    const result = deps.onDoctorCipherAction(state.save, "swap", { from, to });
    state.save = result.save;
    busy = true; selected = null; hint = null;
    draw();
    await animateSwap(from, to);
    if (!scope.isCurrent()) return;
    if (!result.valid) {
      await animateSwap(from, to, true);
      if (!scope.isCurrent()) return;
      busy = false; draw();
      feedback("Esos sellos no forman una combinación. Prueba con otros vecinos.");
      grid.querySelector(`[data-cipher-cell="${to}"]`)?.focus({ preventScroll: true });
      return;
    }
    for (const step of result.steps) {
      if (!scope.isCurrent()) return;
      draw(step.before);
      step.cleared.forEach((index) => grid.querySelector(`[data-cipher-cell="${index}"]`).classList.add("breaking"));
      await delay(scope, reduced ? 30 : 230);
      if (!scope.isCurrent()) return;
      draw(step.after);
      if (!reduced) {
        for (const fall of step.falls.filter((entry) => entry.from !== entry.to)) {
          const element = grid.querySelector(`[data-cipher-cell="${fall.to}"] .cipher-piece`);
          const distance = (fall.from - fall.to) / CIPHER_SIZE * 100;
          const animation = element.animate([{ transform: `translateY(${distance}%)`, opacity: .25 }, { transform: "translateY(0)", opacity: 1 }], { duration: 240, easing: "ease-out" });
          track(animation);
        }
      }
      await delay(scope, reduced ? 30 : 260);
    }
    if (!scope.isCurrent()) return;
    display = state.save.campaign.doctorRoute.cipher;
    busy = false; draw();
    if (cipherComplete(display)) { deps.onRerender(); return; }
    const found = display.revealed.filter(Boolean).length;
    feedback(result.reshuffled ? "Los sellos se han reorganizado. Los fragmentos descubiertos siguen a salvo." : `${result.steps.length > 1 ? `¡${result.steps.length} combinaciones en cadena! ` : ""}${found} fragmentos revelados. Sigue el rastro bajo la tinta.`);
    grid.querySelector(`[data-cipher-cell="${to}"]`)?.focus({ preventScroll: true });
  };
  scope.listen(grid, "click", (event) => {
    const button = event.target.closest("[data-cipher-cell]");
    if (!button || busy) return;
    const index = Number(button.dataset.cipherCell);
    if (selected === null) { selected = index; hint = null; draw(); grid.querySelector(`[data-cipher-cell="${index}"]`).focus({ preventScroll: true }); return; }
    if (selected === index) { selected = null; draw(); return; }
    const adjacent = Math.abs(Math.floor(selected / CIPHER_SIZE) - Math.floor(index / CIPHER_SIZE)) + Math.abs(selected % CIPHER_SIZE - index % CIPHER_SIZE) === 1;
    if (!adjacent) { selected = index; draw(); grid.querySelector(`[data-cipher-cell="${index}"]`).focus({ preventScroll: true }); feedback("Elige un vecino del sello seleccionado."); return; }
    void playSwap(selected, index);
  });
  scope.listen(grid, "keydown", (event) => {
    const cell = event.target.closest("[data-cipher-cell]");
    if (!cell || busy) return;
    const index = Number(cell.dataset.cipherCell);
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -CIPHER_SIZE, ArrowDown: CIPHER_SIZE };
    if (event.key === "Escape") { selected = null; hint = null; draw(); grid.querySelector(`[data-cipher-cell="${index}"]`).focus(); }
    if (!Object.hasOwn(offsets, event.key)) return;
    event.preventDefault();
    const next = index + offsets[event.key];
    if (next >= 0 && next < CIPHER_SIZE * CIPHER_SIZE && (Math.abs(offsets[event.key]) === CIPHER_SIZE || Math.floor(next / CIPHER_SIZE) === Math.floor(index / CIPHER_SIZE))) grid.querySelector(`[data-cipher-cell="${next}"]`).focus();
  });
  scope.listen(root.querySelector("[data-cipher-hint]"), "click", () => {
    if (busy) return;
    hint = cipherHint(display); selected = null; draw();
    feedback("Haru: «Intercambia los dos sellos que he marcado. Observa qué fragmentos descubren.»");
  });
}
