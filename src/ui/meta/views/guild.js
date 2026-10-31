import { ROOM_WALLS, ROOM_FLOORS, ROOM_DECOR, CLAN_EMBLEMS, CLAN_COLORS, MAX_ROOM_DECOR, roomDecor, guildOwnedCount, availableRoomDecoration, normalizeGuildState, updateGuildRoom, saveClanDraft } from "../../../guild.js?v=0.126.0";
import { projectRoomDecoration, roomDecorationStyle, roomPointToPlacement, moveRoomDecoration } from "../../../guild-room.js?v=0.126.0";
import { guildDecorArt, clanEmblemArt, guildRoomBackdrop } from "../guild-art.js?v=0.126.0";

export function createGuildView(deps) {
  let save, host, tab = "room", filter = "all", selected = null, placing = null, drag = null, draft;
  let message = "Tu espacio se guarda automáticamente. Compra más colores, suelos y decoraciones en la Tienda.";
  const escape = deps.escapeHtml;
  const state = () => normalizeGuildState(save.guild, save);
  const selectedEntry = () => state().room.decorations.find(entry => entry.id === selected);
  const canvasPoint = (event, bounds) => ({ x: (event.clientX - bounds.left) / bounds.width * 1000, y: (event.clientY - bounds.top) / bounds.height * 700 });
  function decoration(entry, index) {
    const item = roomDecor(entry.type), surface = projectRoomDecoration(entry).surface;
    const art = surface === "floor" ? guildDecorArt(entry.type) : guildDecorArt(entry.type).replace("<svg ", '<svg preserveAspectRatio="none" ');
    return `<button class="room-decoration ${selected === entry.id ? "selected" : ""}" type="button" data-room-object="${entry.id}" data-room-surface="${surface}" style="${roomDecorationStyle(entry, index)}" aria-label="${escape(item.name)}. ${surface === "floor" ? "Suelo" : surface === "left" ? "Pared izquierda" : "Pared derecha"}. Flechas para mover; Suprimir para retirar." aria-pressed="${selected === entry.id}">${art}</button>`;
  }
  function inspector(current) {
    const wall = current && roomDecor(current.type).category === "wall", disabled = current ? "" : "disabled";
    return `<div class="guild-room-inspector"><strong data-room-selection>${current ? escape(roomDecor(current.type).name) : "Sin selección"}</strong><div class="guild-inspector-actions"><div class="guild-move-controls" role="group" aria-label="Mover decoración">${[["left", "←", "izquierda"], ["up", "↑", "arriba"], ["down", "↓", "abajo"], ["right", "→", "derecha"]].map(([id, icon, label]) => `<button type="button" data-room-move="${id}" aria-label="Mover ${label}" ${disabled}>${icon}</button>`).join("")}</div><label>Tamaño<select data-room-scale ${disabled}>${[[.75, "Pequeño"], [1, "Mediano"], [1.25, "Grande"]].map(([value, label]) => `<option value="${value}" ${value === (current?.scale || 1) ? "selected" : ""}>${label}</option>`).join("")}</select></label><button type="button" data-room-side ${wall ? "" : "disabled"}>${wall ? `Pasar a pared ${current.x > 500 ? "izquierda" : "derecha"}` : "Cambiar de pared"}</button><button type="button" data-room-front ${disabled}>Al frente</button><button type="button" data-room-remove ${disabled}>Retirar</button></div></div>`;
  }
  function roomContents() {
    const { room } = state(), current = selectedEntry(), chosen = roomDecor(placing);
    const wall = ROOM_WALLS.find(entry => entry.id === room.wall), floor = ROOM_FLOORS.find(entry => entry.id === room.floor);
    return `<div class="guild-room-layout"><div class="guild-room-main">
      <div class="guild-room-surround"><div class="guild-room-canvas ${chosen ? "is-placing" : ""}" ${chosen ? `data-placing-surface="${chosen.category}"` : ""} role="group" aria-label="Mi espacio: sala isométrica con dos paredes y suelo" tabindex="0">${guildRoomBackdrop(wall.color, floor.color, floor.id)}<span class="guild-room-sign">${escape(save.character.name)} · MI ESPACIO</span>${room.decorations.map(decoration).join("")}</div></div>
      ${inspector(current)}<small class="guild-room-help">Arrastra para mover · Flechas: mover · Suprimir: retirar. Los cuadros e insignias van en las paredes; los muebles, en el suelo.</small></div>
      <aside class="guild-catalog"><header><div><p class="eyebrow">DALE TU ESTILO</p><h3>Decoraciones</h3></div><span class="guild-room-count" aria-label="${room.decorations.length} de ${MAX_ROOM_DECOR} decoraciones">${room.decorations.length}/${MAX_ROOM_DECOR}</span></header><div class="guild-finishes"><fieldset><legend>Pared de ladrillo · Color</legend><div>${ROOM_WALLS.map(entry => `<button type="button" class="guild-swatch" data-room-wall="${entry.id}" style="--swatch:${entry.color}" ${guildOwnedCount(save, "wall", entry.id) ? "" : 'disabled title="Compra este color en la Tienda"'} aria-label="Pared ${entry.name}" aria-pressed="${room.wall === entry.id}"><span aria-hidden="true">${room.wall === entry.id ? "✓" : ""}</span></button>`).join("")}</div></fieldset><label>Piso<select data-room-floor>${ROOM_FLOORS.map(entry => `<option value="${entry.id}" ${room.floor === entry.id ? "selected" : ""} ${guildOwnedCount(save, "floor", entry.id) ? "" : "disabled"}>${entry.name}${guildOwnedCount(save, "floor", entry.id) ? "" : " · Tienda"}</option>`).join("")}</select></label></div><div class="guild-filters" role="group" aria-label="Categorías de decoración">${[["all", "Todas"], ["wall", "Pared"], ["floor", "Suelo"], ["badges", "Insignias"]].map(([id, label]) => `<button type="button" data-decor-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join("")}</div><div class="guild-decor-catalog">${ROOM_DECOR.filter(item => filter === "all" || (filter === "badges" ? ["novice", "medal", "trophy", "guardian"].includes(item.id) : item.category === filter)).map(item => {
        const owned = guildOwnedCount(save, "decor", item.id), available = availableRoomDecoration(save, item.id, room);
        return `<button type="button" class="guild-catalog-item" data-place-decor="${item.id}" aria-pressed="${placing === item.id}" ${available ? "" : "disabled"}><span class="guild-decor-art">${guildDecorArt(item.id)}</span><strong>${escape(item.name)}</strong><small>${owned ? `${available} disponibles · ${owned - available} colocados` : "Comprar en Tienda"}</small></button>`;
      }).join("")}</div><button type="button" class="guild-shop-link" data-guild-shop>Comprar decoraciones en la Tienda</button><div class="guild-place-actions"><button type="button" data-room-place ${chosen ? "" : "disabled"}>Colocar ${chosen ? escape(chosen.name.toLowerCase()) : "decoración"}</button>${chosen ? '<button type="button" data-room-cancel>Cancelar</button>' : ""}</div></aside></div>`;
  }
  function emblemPreview() {
    const clean = saveClanDraft(save, draft).guild.clanDraft;
    return `<div class="guild-clan-emblem" style="--clan-color:${CLAN_COLORS.find(entry => entry.id === clean.color).color}">${clanEmblemArt(clean.emblem)}</div><small>${clean.tag ? `[${escape(clean.tag)}]` : "TU FUTURO CLAN"}</small><h3>${escape(clean.name || "Nombre del clan")}</h3><p>${escape(clean.motto || "Un mismo camino. Un mismo emblema.")}</p>`;
  }
  function clanContents() {
    return `<div class="guild-clan-layout"><section class="guild-clan-designer"><div class="guild-clan-preview" data-clan-preview>${emblemPreview()}</div><form data-clan-form><p class="eyebrow">DISEÑA TU IDENTIDAD</p><h3>Borrador de clan</h3><p>Guarda el nombre y el emblema en esta partida para cuando lleguen los clanes online.</p><div class="guild-clan-names"><label>Nombre<input name="name" maxlength="24" value="${escape(draft.name)}" placeholder="Nombre del clan"></label><label>Sigla<input name="tag" maxlength="4" value="${escape(draft.tag)}" placeholder="SOL" pattern="[A-Za-z0-9]{0,4}" title="Hasta cuatro letras o números"></label></div><label>Lema<input name="motto" maxlength="90" value="${escape(draft.motto)}" placeholder="El lema de tu clan"></label><fieldset><legend>Emblema</legend><div class="guild-emblem-options" role="group" aria-label="Emblema del clan">${CLAN_EMBLEMS.map(entry => `<button type="button" data-clan-emblem="${entry.id}" aria-label="${entry.name}" aria-pressed="${draft.emblem === entry.id}">${clanEmblemArt(entry.id)}<span>${entry.name}</span></button>`).join("")}</div></fieldset><label>Color del emblema<select name="color">${CLAN_COLORS.map(entry => `<option value="${entry.id}" ${draft.color === entry.id ? "selected" : ""}>${entry.name}</option>`).join("")}</select></label><button type="submit" data-clan-save>Guardar borrador</button></form></section><aside class="guild-online-panel"><span class="guild-coming-soon">ONLINE · PRÓXIMAMENTE</span><h3>Espacio del clan</h3><p>Los clanes compartidos, sus miembros y las puntuaciones estarán disponibles al conectar el juego a un servidor.</p><div class="guild-online-actions"><button type="button" disabled>Crear clan online</button><button type="button" disabled>Buscar y unirse a un clan</button></div><h4>Clasificación de jugadores</h4><table><thead><tr><th>Puesto</th><th>Jugador</th><th>Puntos</th></tr></thead><tbody><tr><td colspan="3">La clasificación estará disponible online.</td></tr></tbody></table><h4>Clasificación de clanes</h4><table><thead><tr><th>Puesto</th><th>Clan</th><th>Puntos</th></tr></thead><tbody><tr><td colspan="3">La clasificación estará disponible online.</td></tr></tbody></table><p class="guild-local-note">El borrador es personal. La creación del clan y las invitaciones se habilitarán junto con el modo online.</p></aside></div>`;
  }
  const paint = (focus = null) => {
    if (!host) return;
    host.querySelectorAll("[data-guild-tab]").forEach(button => {
      const active = button.dataset.guildTab === tab;
      button.setAttribute("aria-selected", String(active)); button.tabIndex = active ? 0 : -1;
    });
    const panel = host.querySelector(".guild-body");
    panel.setAttribute("aria-labelledby", `guild-tab-${tab}`);
    panel.innerHTML = tab === "room" ? roomContents() : clanContents();
    host.querySelector(".guild-message").textContent = message;
    if (focus) host.querySelector(focus)?.focus({ preventScroll: true });
  };
  function commit(action, focus = null) {
    const result = updateGuildRoom(save, action);
    if (result.ok) { save = deps.onPersist(result.save); if (action.type === "add") placing = null; }
    selected = result.selected || (action.type === "remove" ? null : selected);
    message = result.message;
    paint(focus);
  }
  function move(dx, dy, focus = null) {
    const entry = selectedEntry();
    if (entry) { const position = moveRoomDecoration(entry, dx, dy); commit({ type: "move", id: selected, x: position.x, y: position.y }, focus); }
  }
  function updateDraft(form) {
    draft = { ...draft, ...Object.fromEntries(new FormData(form)) };
    host.querySelector("[data-clan-preview]").innerHTML = emblemPreview();
    host.querySelector(".guild-message").textContent = "Borrador modificado. Pulsa Guardar borrador para conservarlo.";
  }
  return {
    id: "guild",
    render(state) {
      save = state.save; draft = { ...normalizeGuildState(save.guild, save).clanDraft };
      tab = "room"; selected = null; placing = null; filter = "all";
      message = "Tu espacio se guarda automáticamente. Compra más colores, suelos y decoraciones en la Tienda.";
      return `<section class="guild-hall" aria-label="Gremio" style="--guild-background:url('assets/locations/inn.webp?v=${deps.assetVersion}')"><header class="guild-heading"><div><h2>Un lugar al que volver</h2></div><span class="guild-personal-tag">ESPACIO DE ${escape(save.character.name.toUpperCase())}</span></header><nav class="guild-tabs" role="tablist" aria-label="Áreas del gremio"><button type="button" id="guild-tab-room" data-guild-tab="room" role="tab" aria-selected="true" aria-controls="guild-panel">Mi espacio</button><button type="button" id="guild-tab-clans" data-guild-tab="clans" role="tab" aria-selected="false" aria-controls="guild-panel" tabindex="-1">Clanes <small>Online próximamente</small></button></nav><p class="guild-message" role="status">${escape(message)}</p><div id="guild-panel" class="guild-body" role="tabpanel" aria-labelledby="guild-tab-room">${roomContents()}</div></section>`;
    },
    mount(root, scope) {
      host = root.querySelector(".guild-hall");
      scope.onCleanup(() => { drag = null; host = null; });
      scope.listen(host, "click", event => {
        const button = event.target.closest("button");
        if (button?.disabled) return;
        const data = button?.dataset || {};
        if (button?.hasAttribute("data-guild-shop")) deps.onNavigate("shop");
        else if (data.guildTab) { tab = data.guildTab; placing = null; message = tab === "room" ? "Tu espacio se guarda automáticamente." : "Diseña y guarda tu identidad de clan. Las funciones online llegarán más adelante."; paint(`[data-guild-tab="${tab}"]`); }
        else if (data.roomWall) commit({ type: "finish", surface: "wall", value: data.roomWall }, `[data-room-wall="${data.roomWall}"]`);
        else if (data.decorFilter) { filter = data.decorFilter; paint(`[data-decor-filter="${filter}"]`); }
        else if (data.placeDecor) { placing = data.placeDecor; selected = null; message = "Haz clic en la sala o usa Colocar para añadir una unidad de la decoración."; paint("[data-room-place]"); }
        else if (button?.hasAttribute("data-room-place")) { commit({ type: "add", item: placing }); }
        else if (button?.hasAttribute("data-room-cancel")) { placing = null; paint(); }
        else if (data.roomObject) { selected = data.roomObject; placing = null; paint(`[data-room-object="${selected}"]`); }
        else if (button?.hasAttribute("data-room-remove")) commit({ type: "remove", id: selected });
        else if (button?.hasAttribute("data-room-front")) commit({ type: "front", id: selected }, "[data-room-front]");
        else if (button?.hasAttribute("data-room-side")) {
          const entry = selectedEntry(); if (entry) commit({ type: "move", id: selected, x: 1000 - entry.x, y: entry.y }, "[data-room-side]");
        }
        else if (data.roomMove) { const [dx, dy] = { left: [-20, 0], right: [20, 0], up: [0, -20], down: [0, 20] }[data.roomMove]; move(dx, dy, `[data-room-move="${data.roomMove}"]`); }
        else if (data.clanEmblem) { draft.emblem = data.clanEmblem; updateDraft(host.querySelector("[data-clan-form]")); host.querySelectorAll("[data-clan-emblem]").forEach(entry => entry.setAttribute("aria-pressed", String(entry.dataset.clanEmblem === draft.emblem))); }
        else if (placing && event.target.closest(".guild-room-canvas")) {
          const bounds = host.querySelector(".guild-room-canvas").getBoundingClientRect();
          const position = roomPointToPlacement(placing, canvasPoint(event, bounds));
          if (position) commit({ type: "add", item: placing, ...position });
          else { message = roomDecor(placing).category === "wall" ? "Elige un punto en la pared izquierda o derecha." : "Elige un punto sobre el suelo de la sala."; paint(); }
        }
      });
      scope.listen(host, "change", event => {
        if (event.target.hasAttribute("data-room-floor")) commit({ type: "finish", surface: "floor", value: event.target.value }, "[data-room-floor]");
        if (event.target.hasAttribute("data-room-scale")) commit({ type: "scale", id: selected, value: event.target.value }, "[data-room-scale]");
      });
      scope.listen(host, "input", event => { const form = event.target.closest("[data-clan-form]"); if (form) updateDraft(form); });
      scope.listen(host, "submit", event => {
        if (!event.target.matches("[data-clan-form]")) return;
        event.preventDefault(); save = deps.onPersist(saveClanDraft(save, draft)); draft = { ...save.guild.clanDraft };
        message = "Borrador de clan guardado en esta partida."; paint("[data-clan-save]");
      });
      scope.listen(host, "keydown", event => {
        if (event.target.matches("[data-guild-tab]") && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); host.querySelector(`[data-guild-tab="${tab === "room" ? "clans" : "room"}"]`).click(); return; }
        if (!event.target.matches("[data-room-object]")) return;
        selected = event.target.dataset.roomObject;
        const directions = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
        if (directions[event.key]) { event.preventDefault(); move(...directions[event.key], `[data-room-object="${selected}"]`); }
        if (["Delete", "Backspace"].includes(event.key)) { event.preventDefault(); commit({ type: "remove", id: selected }); }
      });
      scope.listen(host, "pointerdown", event => {
        const object = event.target.closest("[data-room-object]");
        if (!object || event.button !== 0) return;
        event.preventDefault(); selected = object.dataset.roomObject; placing = null;
        const entry = selectedEntry(), bounds = object.parentElement.getBoundingClientRect();
        drag = { pointer: event.pointerId, startX: event.clientX, startY: event.clientY, entry, bounds, object, x: entry.x, y: entry.y };
        host.setPointerCapture(event.pointerId);
      });
      scope.listen(host, "pointermove", event => {
        if (!drag || drag.pointer !== event.pointerId) return;
        const entry = moveRoomDecoration(drag.entry, (event.clientX - drag.startX) / drag.bounds.width * 1000, (event.clientY - drag.startY) / drag.bounds.height * 700);
        drag.x = entry.x; drag.y = entry.y;
        drag.object.style.cssText = roomDecorationStyle(entry, state().room.decorations.findIndex(item => item.id === entry.id));
        drag.object.dataset.roomSurface = projectRoomDecoration(entry).surface;
      });
      const endDrag = event => {
        if (!drag || event.pointerId !== drag.pointer) return;
        const current = drag; drag = null;
        if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
        if (event.type === "pointercancel") { paint(); return; }
        commit({ type: "move", id: current.entry.id, x: current.x, y: current.y }, `[data-room-object="${current.entry.id}"]`);
      };
      scope.listen(host, "pointerup", endDrag); scope.listen(host, "pointercancel", endDrag);
      scope.listen(host, "lostpointercapture", event => { if (drag?.pointer === event.pointerId) { drag = null; paint(); } });
    },
    dispose() { host = null; drag = null; }
  };
}
