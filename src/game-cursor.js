const BUSY_SELECTOR = '[aria-busy="true"], .app-loading';

export function hasVisibleBusyState(root) {
  if (!root) return false;
  return [...root.querySelectorAll(BUSY_SELECTOR)]
    .some(element => !element.hidden && element.getClientRects().length > 0);
}

function containsBusyState(node) {
  return node.matches?.(BUSY_SELECTOR) || node.querySelector?.(BUSY_SELECTOR);
}

export function installGameCursor(root = document.querySelector("main")) {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!root || !finePointer.matches) return () => {};

  const refreshBusyState = () => root.classList.toggle("is-game-cursor-busy", hasVisibleBusyState(root));
  const burst = event => {
    if (event.button !== 0 || event.pointerType !== "mouse" || !finePointer.matches) return;
    const effect = document.createElement("img");
    effect.className = "game-cursor-click";
    effect.src = "assets/ui/cursor/click-burst.png?v=0.1.0";
    effect.alt = "";
    effect.width = 88;
    effect.height = 96;
    effect.draggable = false;
    effect.setAttribute("aria-hidden", "true");
    effect.style.left = `${event.clientX}px`;
    effect.style.top = `${event.clientY}px`;
    (event.target.closest("dialog:modal") || document.body).append(effect);
    const timeout = window.setTimeout(() => effect.remove(), 500);
    effect.addEventListener("animationend", () => {
      window.clearTimeout(timeout);
      effect.remove();
    }, { once: true });
  };

  root.classList.add("has-game-cursor");
  root.addEventListener("pointerdown", burst, { capture: true, passive: true });
  let busyFrame = 0;
  const observer = new MutationObserver(records => {
    if (busyFrame || !records.some(record => record.type === "attributes"
      ? record.attributeName === "aria-busy" || containsBusyState(record.target)
      : [...record.addedNodes, ...record.removedNodes].some(containsBusyState))) return;
    busyFrame = requestAnimationFrame(() => {
      busyFrame = 0;
      refreshBusyState();
    });
  });
  observer.observe(root, { subtree: true, childList: true, attributeFilter: ["aria-busy", "hidden"] });
  refreshBusyState();

  return () => {
    observer.disconnect();
    if (busyFrame) cancelAnimationFrame(busyFrame);
    root.removeEventListener("pointerdown", burst, true);
    root.classList.remove("has-game-cursor", "is-game-cursor-busy");
  };
}
