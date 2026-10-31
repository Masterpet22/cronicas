import { worldDate, monthOf, monthLength, eventsBetween, plazaSchedule, dateLabel, eventProgress } from "../../../plaza-events.js?v=0.130.0";
import { createElementalChallenge } from "../../../tower.js?v=0.131.0";

export function createTowerView(deps) {
  let save, host, scope, timer, renderedDay;
  function contents() {
    const today = worldDate(), month = monthOf(today), active = plazaSchedule(today).active;
    renderedDay = today;
    const events = eventsBetween(`${month}-01`, `${month}-${monthLength(month)}`).filter(item => item.activity === "tower");
    return `<header><h2>Los cuatro desafíos elementales</h2><p>Agua · Tierra · Fuego · Aire. Un minijefe en los días 5, 12, 19 y 26 de cada mes.</p></header><p class="tower-message" role="status"></p><div class="tower-challenges">${events.map(event => {
      const available = active.some(item => item.key === event.key), progress = eventProgress(save, event);
      return `<article data-tower-event="${event.id}"><img src="${deps.elementIcon(event.element)}" width="56" height="56" alt=""><small>${deps.escapeHtml(dateLabel(event.start))}</small><h3>${deps.escapeHtml(event.title)}</h3><p>Minijefe de ${event.element === "viento" ? "aire" : event.element} · Nivel adaptado al personaje</p>${progress.completed ? '<strong class="event-completed">✓ Edición superada</strong>' : ""}<button type="button" data-start-tower="${event.key}" ${available ? "" : "disabled"}>${available ? progress.completed ? "Repetir desafío" : "Desafiar al minijefe" : "Disponible en su fecha"}</button></article>`;
    }).join("")}</div><p class="tower-note">La victoria se guarda por edición. Por ahora estos desafíos no entregan PX, monedas ni objetos y no consumen recursos de misión.</p><button type="button" data-tower-calendar>Ver calendario de eventos</button>`;
  }
  return {
    id: "tower",
    render(state) { save = state.save; return `<section class="tower-panel" aria-label="Torre de Desafíos">${contents()}</section>`; },
    mount(root, viewScope) {
      host = root.querySelector(".tower-panel"); scope = viewScope;
      timer = window.setInterval(() => { if (host && worldDate() !== renderedDay && !host.querySelector('[aria-busy="true"]')) host.innerHTML = contents(); }, 30000);
      scope.onCleanup(() => { window.clearInterval(timer); host = null; });
      scope.listen(host, "click", async event => {
        const button = event.target.closest("button"); if (!button || button.disabled) return;
        if (button.hasAttribute("data-tower-calendar")) return deps.onNavigate("event");
        if (!button.dataset.startTower) return;
        const mission = createElementalChallenge(button.dataset.startTower);
        if (!mission) { host.innerHTML = contents(); host.querySelector(".tower-message").textContent = "El desafío ya no está activo. Consulta el calendario."; return; }
        button.disabled = true; button.setAttribute("aria-busy", "true");
        try { await deps.onStartMission(save, mission); }
        finally { if (scope.isCurrent() && button.isConnected) { button.disabled = false; button.removeAttribute("aria-busy"); } }
      });
    },
    dispose() { window.clearInterval(timer); host = null; }
  };
}
