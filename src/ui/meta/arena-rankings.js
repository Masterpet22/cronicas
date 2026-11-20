const formatScore = new Intl.NumberFormat("es");

export const arenaRankingsMarkup = `<details class="arena-rankings">
  <summary>Clasificación de Arena</summary>
  <table aria-label="Clasificación de Arena" hidden>
    <thead><tr><th scope="col">Puesto</th><th scope="col">Jugador</th><th scope="col">Rango</th><th scope="col">Puntos</th></tr></thead>
    <tbody></tbody>
  </table>
  <p class="arena-ranking-status" role="status"></p>
  <button class="secondary-button" type="button" data-ranking-more hidden>Ver más</button>
</details>`;

export function mountArenaRankings(host, scope, escapeHtml) {
  const views = new WeakMap();

  function getView(details) {
    if (!views.has(details)) views.set(details, { ids: new Set(), cursor: undefined, pending: false });
    return views.get(details);
  }

  async function load(details) {
    const state = getView(details);
    if (state.pending || state.cursor === null) return;
    state.pending = true;
    const table = details.querySelector("table");
    const status = details.querySelector("[role=status]");
    const button = details.querySelector("[data-ranking-more]");
    button.setAttribute("aria-disabled", "true");
    status.textContent = "Cargando clasificación…";
    try {
      const { loadArenaRankings } = await import("../../arena-rankings.js?v=1.0.0");
      const { entries, cursor } = await loadArenaRankings(state.cursor);
      if (!scope.isCurrent() || !details.isConnected || views.get(details) !== state) return;
      const rows = [];
      for (const { id, alias, tier, score } of entries) {
        if (state.ids.has(id)) continue;
        state.ids.add(id);
        rows.push(`<tr><td>${state.ids.size}</td><th scope="row">${escapeHtml(alias)}</th><td>${escapeHtml(tier || "—")}</td><td>${formatScore.format(score)}</td></tr>`);
      }
      table.tBodies[0].insertAdjacentHTML("beforeend", rows.join(""));
      table.hidden = !state.ids.size;
      status.textContent = state.ids.size ? "" : "Aún no hay puntuaciones de combates clasificatorios validados.";
      state.cursor = cursor;
      if (!cursor && document.activeElement === button) details.querySelector("summary").focus();
      button.hidden = !cursor;
      button.textContent = "Ver más";
    } catch (_) {
      if (!scope.isCurrent() || !details.isConnected || views.get(details) !== state) return;
      status.textContent = "No se pudo cargar la clasificación.";
      button.textContent = "Reintentar";
      button.hidden = false;
    } finally {
      state.pending = false;
      if (views.get(details) === state) button.removeAttribute("aria-disabled");
    }
  }

  scope.listen(host, "toggle", event => {
    const details = event.target;
    if (!details.matches(".arena-rankings")) return;
    if (!details.open) {
      views.delete(details);
      details.querySelector("table").hidden = true;
      details.querySelector("tbody").replaceChildren();
      details.querySelector("[data-ranking-more]").hidden = true;
      return;
    }
    if (getView(details).cursor === undefined) void load(details);
  }, { capture: true });
  scope.listen(host, "click", event => {
    const button = event.target.closest("[data-ranking-more]");
    if (button) void load(button.closest(".arena-rankings"));
  });
}
