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
  const idleBursts = [];
  const activeBursts = new Set();
  const makeBurst = () => {
    const effect = document.createElement("img");
    effect.className = "game-cursor-click";
    effect.src = "assets/ui/cursor/click-burst.png?v=0.1.0";
    effect.alt = "";
    effect.width = 88;
    effect.height = 96;
    effect.draggable = false;
    effect.setAttribute("aria-hidden", "true");
    return effect;
  };
  const burst = event => {
    if (event.button !== 0 || event.pointerType !== "mouse" || !finePointer.matches) return;
    const effect = idleBursts.pop() || makeBurst();
    effect.style.left = `${event.clientX}px`;
    effect.style.top = `${event.clientY}px`;
    (event.target.closest("dialog:modal") || document.body).append(effect);
    const finish = () => {
      if (!activeBursts.delete(finish)) return;
      window.clearTimeout(timeout);
      effect.removeEventListener("animationend", finish);
      effect.remove();
      if (idleBursts.length < 4) idleBursts.push(effect);
    };
    const timeout = window.setTimeout(finish, 500);
    activeBursts.add(finish);
    effect.addEventListener("animationend", finish);
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
    for (const finish of activeBursts) finish();
    idleBursts.length = 0;
    root.classList.remove("has-game-cursor", "is-game-cursor-busy");
  };
}
