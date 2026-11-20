import { listSaveSlots, normalizeSave, SAVE_VERSION, saveStatus, writeSaveToSlot } from "../../save.js?v=0.160.0";

const formatDate = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });
const errors = {
  "auth/popup-blocked": "Permite las ventanas emergentes para iniciar sesión con Google.",
  "auth/popup-closed-by-user": "Se cerró la ventana de Google. Puedes volver a intentarlo.",
  "auth/unauthorized-domain": "Este dominio aún no está autorizado para iniciar sesión en Firebase.",
  "auth/configuration-not-found": "Firebase Authentication aún no está configurado para el juego.",
  "auth/operation-not-allowed": "El inicio de sesión con Google aún no está habilitado en Firebase.",
  "permission-denied": "Firebase denegó el acceso a las copias de esta cuenta.",
  "save/conflict": "La copia cambió en otro dispositivo. Actualiza la lista antes de volver a intentarlo.",
  "save/too-large": "La partida supera el tamaño admitido para una copia en la nube."
};

function decodeCopy(copy) {
  try {
    const data = JSON.parse(copy.payload);
    if (!Number.isInteger(data?.version) || data.version < 1 || data.version > SAVE_VERSION || !data.character) return null;
    return normalizeSave(data);
  } catch (_) {
    return null;
  }
}

export function createCloudSavePanel({ escapeHtml, onRestored }) {
  let open = false;
  let client;
  let restoredMessage = "";

  async function connect() {
    if (!client) {
      client = import("../../save/firebase-cloud.js?v=1.0.0").catch(error => {
        client = null;
        throw error;
      });
    }
    const api = await client;
    await api.ready();
    return api;
  }

  return {
    markup: () => `<details class="cloud-saves" ${open ? "open" : ""}>
      <summary>Guardado en la nube</summary>
      <div class="cloud-saves-body">
        <div data-cloud-controls></div>
        <p data-cloud-status role="status"></p>
      </div>
    </details>`,
    mount(root, scope) {
      const panel = root.querySelector(".cloud-saves");
      const controls = panel.querySelector("[data-cloud-controls]");
      const status = panel.querySelector("[data-cloud-status]");
      let api;
      let account;
      let copies;
      let busy = false;
      let disconnect;

      const render = () => {
        const disabled = busy ? "disabled" : "";
        const localSlots = listSaveSlots();
        const rows = copies?.map((copy, index) => {
          const { slot, save } = localSlots[index];
          const remote = copy && decodeCopy(copy);
          const date = copy?.updatedAt?.toDate?.();
          const identical = remote && JSON.stringify(remote) === JSON.stringify(save);
          const description = remote
            ? `${escapeHtml(remote.character.name)} · Nivel ${remote.progression.level}${date ? ` · ${escapeHtml(formatDate.format(date))}` : ""}`
            : copy ? "Copia incompatible con esta versión" : "Sin copia en la nube";
          return `<li><div><strong>Partida ${slot}</strong><span>${description}</span></div>
            <div class="cloud-saves-actions">
              <button class="secondary-button" type="button" data-cloud-action="upload" data-slot="${slot}" aria-label="Subir copia de la partida ${slot}" ${busy || !save?.character || identical || (copy && !remote) ? "disabled" : ""}>Subir copia</button>
              <button class="secondary-button" type="button" data-cloud-action="restore" data-slot="${slot}" aria-label="Restaurar partida ${slot}" ${busy || !remote || identical ? "disabled" : ""}>Restaurar</button>
            </div></li>`;
        }).join("");
        controls.innerHTML = account ? `
          <div class="cloud-saves-account"><span>${escapeHtml(account.email || account.displayName || "Sesión iniciada")}</span>
            <div class="cloud-saves-actions"><button class="secondary-button" type="button" data-cloud-action="refresh" ${disabled}>Actualizar copias</button>
            <button class="secondary-button" type="button" data-cloud-action="logout" ${disabled}>Cerrar sesión</button></div></div>
          ${rows ? `<ul aria-label="Copias en la nube">${rows}</ul>` : ""}` : `
          <div class="cloud-saves-account"><span>Sube tus partidas y restáuralas en otro navegador con la misma cuenta.</span>
            <button class="secondary-button" type="button" data-cloud-action="login" ${disabled}>Iniciar sesión con Google</button></div>`;
      };

      const refresh = async () => {
        const user = account;
        copies = undefined;
        if (!user) return;
        const result = await Promise.all(listSaveSlots().map(({ slot }) => api.readCopy(user.uid, slot)));
        if (scope.isCurrent() && api.currentUser()?.uid === user.uid && account?.uid === user.uid) copies = result;
      };

      const run = async (work, loading, button) => {
        if (busy) return;
        busy = true;
        status.textContent = loading;
        render();
        if (button) panel.querySelector("summary").focus({ preventScroll: true });
        try {
          status.textContent = (await work()) || "";
        } catch (error) {
          if (error?.code === "save/conflict") copies = undefined;
          status.textContent = errors[error?.code] || "No se pudo conectar con la nube. Comprueba tu conexión y vuelve a intentarlo.";
        } finally {
          busy = false;
          if (scope.isCurrent()) {
            render();
            if (button && document.activeElement === panel.querySelector("summary")) {
              const slotSelector = button.dataset.slot ? `[data-slot="${button.dataset.slot}"]` : "";
              const next = controls.querySelector(`[data-cloud-action="${button.dataset.cloudAction}"]${slotSelector}:enabled`)
                || controls.querySelector('[data-cloud-action="refresh"]:enabled');
              next?.focus({ preventScroll: true });
            }
          }
        }
      };

      const init = async () => {
        if (api || busy) return;
        await run(async () => {
          api = await connect();
          if (!scope.isCurrent()) return;
          account = api.currentUser();
          disconnect = api.watchAccount(user => {
            if (account?.uid === user?.uid) return;
            account = user;
            copies = undefined;
            if (!busy) void run(refresh, "Consultando las copias…");
          });
          await refresh();
          const message = restoredMessage;
          restoredMessage = "";
          return message;
        }, "Conectando con Firebase…");
      };

      scope.onCleanup(() => disconnect?.());
      scope.listen(panel, "toggle", () => {
        open = panel.open;
        if (open) void init();
      });

      scope.listen(controls, "click", event => {
        const button = event.target.closest("[data-cloud-action]");
        if (!button || busy) return;
        const action = button.dataset.cloudAction;
        const slot = Number(button.dataset.slot);
        const local = listSaveSlots().find(entry => entry.slot === slot)?.save;
        const copy = copies?.[slot - 1];
        const uid = account?.uid;

        if (action === "login") {
          if (!api) { void init(); return; }
          void run(async () => {
            await api.logIn();
            account = api.currentUser();
            await refresh();
          }, "Abriendo el inicio de sesión…", button);
        } else if (action === "logout") {
          void run(async () => {
            await api.logOut();
            account = api.currentUser();
            copies = undefined;
          }, "Cerrando sesión…", button);
        } else if (action === "refresh") {
          void run(refresh, "Consultando las copias…", button);
        } else if (action === "upload" && uid && local?.character) {
          if (copy && !window.confirm(`¿Reemplazar la copia de la partida ${slot} en la nube por la de ${local.character.name}?`)) return;
          void run(async () => {
            await api.uploadCopy(uid, slot, JSON.stringify(local), copy?.revision ?? null);
            if (account?.uid === uid && api.currentUser()?.uid === uid) {
              try { await refresh(); }
              catch (_) { return `Copia de la partida ${slot} guardada. Actualiza la lista para verla.`; }
            }
            return `Copia de la partida ${slot} guardada en la nube.`;
          }, "Subiendo copia…", button);
        } else if (action === "restore" && uid && copy) {
          if (local?.character && !window.confirm(`¿Reemplazar la partida ${slot} de ${local.character.name} en este navegador por la copia de la nube?`)) return;
          void run(async () => {
            const current = await api.readCopy(uid, slot);
            if (!scope.isCurrent() || api.currentUser()?.uid !== uid) return;
            if (current?.revision !== copy.revision) throw Object.assign(new Error(), { code: "save/conflict" });
            const latestLocal = listSaveSlots().find(entry => entry.slot === slot)?.save;
            if (JSON.stringify(latestLocal) !== JSON.stringify(local)) return "La partida local cambió. Revisa la ranura antes de volver a intentarlo.";
            const save = decodeCopy(current);
            if (!save) return "La copia requiere una versión compatible del juego.";
            writeSaveToSlot(slot, save);
            restoredMessage = saveStatus().pendingSlots.includes(slot)
              ? "La copia está en memoria. Reintenta el guardado local antes de cerrar el juego."
              : `Partida ${slot} restaurada en este navegador.`;
            onRestored();
            root.querySelector(`[data-select-slot="${slot}"]`)?.focus();
          }, "Restaurando partida…", button);
        }
      });

      render();
      if (panel.open) void init();
    }
  };
}
