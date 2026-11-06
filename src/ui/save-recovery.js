import { saveStatus, subscribeSaveStatus, retryPendingSaves, pendingSaveCopies } from "../save.js?v=0.140.0";

export function mountSaveRecovery() {
  const banner = document.createElement("aside");
  banner.className = "save-recovery";
  banner.hidden = true;
  banner.setAttribute("aria-label", "Estado del guardado");
  banner.innerHTML = '<div role="alert"><strong>No se pudo guardar en este navegador.</strong><p>Tu progreso sigue en esta sesión. Reintenta o descarga una copia antes de cerrar.</p></div><div class="save-recovery-actions"><button type="button" data-save-retry>Reintentar guardado</button><button type="button" data-save-export>Descargar copia</button></div>';
  document.body.append(banner);
  const resize = () => document.documentElement.style.setProperty("--save-recovery-height", banner.hidden ? "0px" : `${Math.ceil(banner.getBoundingClientRect().height)}px`);
  const update = status => {
    const restoreFocus = status.ok && banner.contains(document.activeElement);
    banner.hidden = status.ok;
    document.body.classList.toggle("has-save-error", !status.ok);
    banner.querySelector("[data-save-export]").disabled = !pendingSaveCopies().length;
    resize();
    if (restoreFocus) {
      const target = document.querySelector('dialog[open] button:not([disabled])')
        || document.querySelector('#game:not([hidden]) .combat-access-pause')
        || document.querySelector('#meta:not([hidden]) [role="tab"][aria-selected="true"]')
        || document.querySelector('#meta:not([hidden]) button:not([disabled])');
      target?.focus({ preventScroll:true });
    }
  };
  banner.querySelector("[data-save-retry]").addEventListener("click", () => {
    const status = retryPendingSaves();
    if (!status.ok) banner.querySelector("p").textContent = "El navegador sigue sin permitir el guardado. Descarga una copia y conserva esta sesión abierta.";
    resize();
  });
  banner.querySelector("[data-save-export]").addEventListener("click", () => {
    for (const { slot, save } of pendingSaveCopies()) {
      const url = URL.createObjectURL(new Blob([JSON.stringify(save, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `cronicas-partida-${slot}.json`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  const unsubscribe = subscribeSaveStatus(update);
  const observer = new ResizeObserver(resize);
  observer.observe(banner);
  const preventLoss = event => { if (!saveStatus().ok) { event.preventDefault(); event.returnValue = ""; } };
  window.addEventListener("beforeunload", preventLoss);
  update(saveStatus());
  return () => { unsubscribe(); observer.disconnect(); window.removeEventListener("beforeunload", preventLoss); banner.remove(); };
}
