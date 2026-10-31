import { plazaSchedule, worldDate } from "../../../plaza-events.js?v=0.130.0";
import { ARENA_RIVALS, ARENA_DIFFICULTIES, normalizeArenaSettings, createExhibition, arenaPreview } from "../../../arena.js?v=0.131.0";
import { JUTSU_LIBRARY } from "../../../data.js?v=0.114.0";

export function createArenaView(deps) {
  let save, host, tab = "local", settings = normalizeArenaSettings();
  const escape = deps.escapeHtml;
  function localContents() {
    const { profile, enemy, player } = arenaPreview(save, settings);
    const rival = ARENA_RIVALS.find(entry => entry.id === settings.rival);
    const difficulty = ARENA_DIFFICULTIES.find(entry => entry.id === settings.difficulty);
    const techniques = save.loadout.map(id => JUTSU_LIBRARY.find(entry => entry.id === id)?.name).filter(Boolean);
    return `<div class="arena-local-layout"><form class="arena-setup"><section><p class="eyebrow">EXHIBICIÓN CONTRA LA IA</p><h3>Elige tu rival</h3><p>Practica tu configuración en un duelo individual. Cada rival utiliza su propia afinidad y secuencia de ataques.</p><div class="arena-rivals" role="radiogroup" aria-label="Rival de exhibición">${ARENA_RIVALS.map(entry => `<button type="button" role="radio" data-arena-rival="${entry.id}" aria-checked="${settings.rival === entry.id}" tabindex="${settings.rival === entry.id ? 0 : -1}"><img src="${deps.elementIcon(entry.affinity)}" alt="" width="48" height="48"><span><strong>${escape(entry.name)}</strong><small>${escape(entry.detail)}</small></span></button>`).join("")}</div></section><section><h3>Dificultad</h3><div class="arena-difficulties" role="radiogroup" aria-label="Dificultad de exhibición">${ARENA_DIFFICULTIES.map(entry => `<button type="button" role="radio" data-arena-difficulty="${entry.id}" aria-checked="${settings.difficulty === entry.id}" tabindex="${settings.difficulty === entry.id ? 0 : -1}">${entry.name}</button>`).join("")}</div><p class="arena-difficulty-description">${difficulty.detail}</p></section><footer><button type="submit" data-start-exhibition>Iniciar exhibición</button><small>Sin coste de entrada · Puedes pedir revancha al terminar.</small></footer></form>
      <aside class="arena-match-preview"><p class="eyebrow">EL PRÓXIMO DUELO</p><div class="arena-versus"><div><span class="arena-combatant-mark">${escape(save.character.name.slice(0, 1).toUpperCase())}</span><strong>${escape(save.character.name)}</strong><small>Nivel ${save.progression.level}</small></div><b>VS</b><div><img src="${deps.elementIcon(rival.affinity)}" width="56" height="56" alt=""><strong>${escape(rival.name)}</strong><small>Nivel ${profile.level} · IA</small></div></div><dl class="arena-preview-stats"><div><dt></dt><dt>Tú</dt><dt>Rival</dt></div>${[["Vida", player.maxHp, enemy.maxHp], ["Chakra", player.maxChakra, enemy.maxChakra], ["Fuerza", player.strength, enemy.strength], ["Velocidad", player.speed, enemy.speed]].map(([label, value, opponent]) => `<div><dt>${label}</dt><dd>${value}</dd><dd>${opponent}</dd></div>`).join("")}</dl><h4>Tus técnicas equipadas</h4><p class="arena-loadout">${techniques.length ? techniques.map(escape).join(" · ") : "Sin técnicas equipadas. Puedes combatir con Golpe veloz y Guardia."}</p><button type="button" class="arena-dojo-link" data-arena-dojo>Preparar equipo en el Dojo →</button><div class="arena-practice-note"><strong>Reglas de exhibición</strong><ul><li>Vida y chakra completos al empezar.</li><li>Sin consumibles ni pergaminos de reintento.</li><li>Sin PX, monedas, bestiario ni progreso de misión.</li><li>La dificultad se adapta a tu personaje y equipo.</li></ul></div></aside></div>`;
  }
  function multiplayerContents() {
    return `<section class="arena-online"><span class="arena-coming-soon">MULTIJUGADOR · PRÓXIMAMENTE</span><h3>Prepárate para medirte con otros jugadores</h3><p>Los duelos entre jugadores, el emparejamiento y las clasificaciones se habilitarán al conectar el juego a un servidor.</p><div class="arena-online-modes"><article><span aria-hidden="true">⚔</span><h4>PvP de exhibición</h4><p>Duelos amistosos para probar estrategias contra otros jugadores.</p><button type="button" disabled>Buscar duelo amistoso</button></article><article><span aria-hidden="true">✦</span><h4>PvP clasificatorio</h4><p>Combates competitivos con rango y clasificación de jugadores.</p><button type="button" disabled>Buscar combate clasificatorio</button></article></div><section class="arena-rankings"><h4>Clasificación de jugadores</h4><table><thead><tr><th>Puesto</th><th>Jugador</th><th>Rango</th><th>Puntos</th></tr></thead><tbody><tr><td colspan="4">Disponible con el modo online. Las exhibiciones locales no otorgan puntos de clasificación.</td></tr></tbody></table></section></section>`;
  }
  const refresh = focus => {
    host.querySelectorAll("[data-arena-tab]").forEach(button => {
      const selected = button.dataset.arenaTab === tab;
      button.setAttribute("aria-selected", String(selected)); button.tabIndex = selected ? 0 : -1;
    });
    const panel = host.querySelector(".arena-mode-panel");
    panel.setAttribute("aria-labelledby", `arena-tab-${tab}`);
    panel.innerHTML = tab === "local" ? localContents() : multiplayerContents();
    if (focus) host.querySelector(focus)?.focus({ preventScroll: true });
  };
  return {
    id: "arena",
    render(state) {
      save = state.save;
      return `<section class="arena-panel" aria-label="Arena de Combate"><header class="arena-heading"><h2>Demuestra tu técnica</h2><p>Prepara un duelo, prueba tu equipo y aprende de cada combate.</p></header>${plazaSchedule(worldDate()).active.some(event => event.id === "elemental-festival") ? '<aside class="arena-event-banner"><strong>Festival elemental</strong><p>Combates especiales pendientes de definir. Las exhibiciones habituales siguen disponibles.</p></aside>' : ""}<nav role="tablist" class="arena-tabs" aria-label="Modos de la Arena"><button type="button" id="arena-tab-local" role="tab" data-arena-tab="local" aria-controls="arena-mode-panel" aria-selected="${tab === "local"}" tabindex="${tab === "local" ? 0 : -1}">Local <small>Contra la IA</small></button><button type="button" id="arena-tab-online" role="tab" data-arena-tab="online" aria-controls="arena-mode-panel" aria-selected="${tab === "online"}" tabindex="${tab === "online" ? 0 : -1}">Multijugador <small>Próximamente</small></button></nav><p class="arena-feedback" role="status"></p><div class="arena-mode-panel" role="tabpanel" id="arena-mode-panel" aria-labelledby="arena-tab-${tab}">${tab === "local" ? localContents() : multiplayerContents()}</div></section>`;
    },
    mount(root, scope) {
      host = root.querySelector(".arena-panel");
      scope.onCleanup(() => { host = null; });
      scope.listen(host, "click", event => {
        const button = event.target.closest("button");
        if (!button || button.disabled) return;
        if (button.dataset.arenaTab) { tab = button.dataset.arenaTab; refresh(`[data-arena-tab="${tab}"]`); }
        if (button.dataset.arenaRival) { settings = { ...settings, rival: button.dataset.arenaRival }; refresh(`[data-arena-rival="${settings.rival}"]`); }
        if (button.dataset.arenaDifficulty) { settings = { ...settings, difficulty: button.dataset.arenaDifficulty }; refresh(`[data-arena-difficulty="${settings.difficulty}"]`); }
        if (button.hasAttribute("data-arena-dojo")) deps.onNavigate("dojo");
      });
      scope.listen(host, "keydown", event => {
        const button = event.target.closest('[role="radio"], [role="tab"]');
        if (!button || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const options = [...button.parentElement.querySelectorAll("button")], index = options.indexOf(button);
        const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) + options.length) % options.length;
        options[next].click();
      });
      scope.listen(host, "submit", async event => {
        event.preventDefault();
        const button = host.querySelector("[data-start-exhibition]");
        if (!button || button.disabled) return;
        button.disabled = true; button.setAttribute("aria-busy", "true");
        try { await deps.onStartMission(save, createExhibition(settings)); }
        finally { if (button.isConnected) { button.disabled = false; button.removeAttribute("aria-busy"); } }
      });
    },
    dispose() { host = null; }
  };
}
