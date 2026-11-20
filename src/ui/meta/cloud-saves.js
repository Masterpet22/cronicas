import { cloudSession } from "../../save/cloud-session.js?v=0.168.0";

const authErrors = {
  "auth/popup-blocked": "Permite las ventanas emergentes para entrar con Google.",
  "auth/popup-closed-by-user": "Se cerró la ventana de Google. Puedes volver a intentarlo.",
  "auth/unauthorized-domain": "Este dominio aún no está autorizado para entrar con Google."
};

export function cloudStatusText() {
  if (cloudSession.blocked) return "Abre las partidas de esta cuenta en una sola pestaña.";
  if (cloudSession.loading) return "Cargando partidas de la cuenta…";
  if (cloudSession.conflicts.length) return "Hay partidas con cambios en dos dispositivos.";
  if (cloudSession.unavailable) return cloudSession.pending
    ? "Sin sincronizar. El progreso está guardado en este navegador."
    : "Sin conexión con Firebase. Puedes continuar las partidas disponibles en este navegador.";
  if (cloudSession.syncing || cloudSession.pending) return "Guardando en la nube…";
  return "Guardado automático en la nube.";
}

export function mountCloudSaveStatus() {
  const indicator = document.querySelector("[data-game-cloud-status]");
  const update = () => {
    indicator.hidden = !cloudSession.account;
    const message = cloudSession.account ? cloudStatusText() : "";
    if (indicator.textContent !== message) indicator.textContent = message;
  };
  cloudSession.subscribe(update);
  update();
}

export function createCloudSavePanel({ escapeHtml }) {
  let guestOpen = false;
  return {
    markup: () => cloudSession.account
      ? `<section class="cloud-saves cloud-saves-signed" aria-label="Guardado en la nube"><div data-cloud-controls></div></section>`
      : `<details class="cloud-saves" ${guestOpen ? "open" : ""}><summary>Jugar con una cuenta de Google</summary><div class="cloud-saves-body" data-cloud-controls></div></details>`,
    mount(root, scope) {
      const panel = root.querySelector(".cloud-saves");
      const controls = panel.querySelector("[data-cloud-controls]");
      let preparing = false;
      let prepared = false;
      let busy = false;
      let error = "";
      const button = (action, label, attributes = "") => `<button class="secondary-button" type="button" data-cloud-action="${action}" ${attributes} ${busy ? "disabled" : ""}>${label}</button>`;

      function describe(payload) {
        try {
          const save = JSON.parse(payload);
          return save ? `${escapeHtml(save.character.name)} · Nivel ${Number(save.progression.level) || 1}` : "Ranura vacía";
        } catch (_) { return "Partida incompatible"; }
      }

      function render() {
        const account = cloudSession.account;
        const importOpen = controls.querySelector(".cloud-import")?.open;
        const targets = new Map([...controls.querySelectorAll("[data-import-slot]")].map(select => [select.dataset.importSlot, select.value]));
        const focused = controls.contains(document.activeElement) ? document.activeElement : null;
        const selector = focused?.dataset.cloudAction
          ? `[data-cloud-action="${focused.dataset.cloudAction}"]${focused.dataset.slot ? `[data-slot="${focused.dataset.slot}"]` : ""}` : "";
        if (!account) {
          controls.innerHTML = `<div class="cloud-saves-account"><span>Guarda automáticamente y continúa en otro equipo con la misma cuenta.</span>
            ${button("login", "Iniciar sesión con Google", preparing ? "disabled" : "")}</div>
            <p role="status">${escapeHtml(error || (preparing ? "Conectando con Google…" : ""))}</p>`;
        } else {
          const conflicts = cloudSession.conflicts.map(({ slot, local, payload }) => `<li><div><strong>Partida ${slot}</strong><span>En este equipo · ${describe(local)}</span><span>En la nube · ${describe(payload)}</span></div>
            <div class="cloud-saves-actions">
              ${button("keep", "Conservar la de este equipo", `data-slot="${slot}"`)}
              ${button("use-cloud", "Usar la de la nube", `data-slot="${slot}"`)}
            </div></li>`).join("");
          const imports = cloudSession.imports().map(({ slot, save, targets: available }) => `<li>
            <div><strong>${escapeHtml(save.character.name)}</strong><span>Partida local ${slot} · Nivel ${save.progression.level}</span></div>
            <div class="cloud-saves-actions"><select data-import-slot="${slot}" aria-label="Ranura para ${escapeHtml(save.character.name)}">
              ${available.map(target => `<option value="${target}" ${String(target) === (targets.get(String(slot)) ?? String(slot)) ? "selected" : ""}>Partida ${target}</option>`).join("")}
            </select>${button("import", "Vincular partida", `data-slot="${slot}"`)}</div>
          </li>`).join("");
          const retry = (cloudSession.unavailable || cloudSession.blocked) && !cloudSession.loading
            ? button("retry", "Reintentar conexión") : "";
          controls.innerHTML = `<div class="cloud-saves-account">
            <div><strong>${escapeHtml(account.label || "Cuenta de Google")}</strong><p role="status">${escapeHtml(error || cloudStatusText())}</p></div>
            <div class="cloud-saves-actions">${retry}${button("logout", "Cerrar sesión")}</div>
          </div>
          ${conflicts ? `<ul aria-label="Partidas con cambios simultáneos">${conflicts}</ul>` : ""}
          ${imports ? `<details class="cloud-import"><summary>Vincular partidas de este navegador</summary><ul>${imports}</ul></details>` : ""}`;
        }
        if (importOpen && controls.querySelector(".cloud-import")) controls.querySelector(".cloud-import").open = true;
        if (selector) controls.querySelector(selector)?.focus({ preventScroll: true });
      }

      async function prepare() {
        if (preparing || prepared) return;
        preparing = true;
        error = "";
        render();
        try { await cloudSession.prepareLogin(); prepared = true; }
        catch (_) { error = "No se pudo conectar con Google. Vuelve a intentarlo."; }
        finally { preparing = false; if (scope.isCurrent()) render(); }
      }

      scope.onCleanup(cloudSession.subscribe(render));
      if (cloudSession.account) scope.listen(window, "online", () => { void cloudSession.refresh(); });
      scope.listen(panel, "toggle", event => {
        if (event.target !== panel || cloudSession.account) return;
        guestOpen = panel.open;
        if (guestOpen) void prepare();
      });
      scope.listen(controls, "click", async event => {
        const control = event.target.closest("[data-cloud-action]");
        if (!control || busy) return;
        const action = control.dataset.cloudAction;
        const slot = Number(control.dataset.slot);
        if (action === "logout" && cloudSession.pending &&
          !window.confirm("Hay cambios pendientes de sincronizar. Se conservarán en este navegador hasta que vuelvas a entrar. ¿Cerrar sesión?")) return;
        if ((action === "keep" || action === "use-cloud") && !window.confirm(action === "keep"
          ? "¿Reemplazar la partida de la nube por la de este equipo?"
          : "¿Descartar los cambios de este equipo y continuar con la partida de la nube?")) return;
        error = "";
        busy = true;
        if (action === "login" || action === "logout") render();
        try {
          if (action === "login") await cloudSession.signIn();
          if (action === "logout") await cloudSession.signOut();
          if (action === "retry") await cloudSession.retry();
          if (action === "import") cloudSession.importSave(slot, Number(controls.querySelector(`[data-import-slot="${slot}"]`)?.value));
          if (action === "keep" || action === "use-cloud") cloudSession.resolve(slot, action === "keep");
        } catch (failure) {
          error = authErrors[failure.code] || "No se pudo completar esta acción. Reintenta el guardado o la conexión.";
        } finally {
          busy = false;
          if (scope.isCurrent()) render();
        }
      });
      render();
      if (panel.open) void prepare();
    }
  };
}
