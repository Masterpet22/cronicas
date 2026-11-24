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

  const loading = document.createElement("img");
  loading.className = "game-cursor-loading";
  loading.src = "assets/ui/cursor/shuriken.png?v=0.1.0";
  loading.alt = "";
  loading.width = 50;
  loading.height = 52;
  loading.draggable = false;
  loading.setAttribute("aria-hidden", "true");

  let x = 0;
  let y = 0;
  let hasPointer = false;
  let busy = false;
  let moveFrame = 0;

  const drawLoading = () => {
    moveFrame = 0;
    loading.style.left = `${x}px`;
    loading.style.top = `${y}px`;
  };
  const syncLoadingHost = () => {
    const dialogs = [...root.querySelectorAll("dialog[open]")].filter(dialog => dialog.matches(":modal"));
    const focused = document.activeElement?.closest("dialog[open]");
    const host = dialogs.includes(focused) ? focused : dialogs.at(-1) || document.body;
    if (loading.parentElement !== host) host.append(loading);
  };
  const syncLoadingVisibility = () => {
    loading.classList.toggle("is-visible", busy && hasPointer);
    root.classList.toggle("is-game-cursor-tracking", busy && hasPointer);
  };
  const refreshBusyState = () => {
    busy = hasVisibleBusyState(root);
    root.classList.toggle("is-game-cursor-busy", busy);
    if (busy) {
      drawLoading();
      syncLoadingHost();
    } else {
      if (moveFrame) {
        cancelAnimationFrame(moveFrame);
        moveFrame = 0;
      }
      loading.remove();
    }
    syncLoadingVisibility();
  };
  const trackPointer = event => {
    if ((event.pointerType && event.pointerType !== "mouse") || !finePointer.matches) return;
    x = event.clientX;
    y = event.clientY;
    const becameVisible = !hasPointer;
    hasPointer = true;
    if (!busy) return;
    if (becameVisible) {
      drawLoading();
      syncLoadingVisibility();
    } else if (!moveFrame) {
      moveFrame = requestAnimationFrame(drawLoading);
    }
  };
  const hidePointer = () => {
    hasPointer = false;
    if (busy) syncLoadingVisibility();
  };
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
    trackPointer(event);
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
  root.addEventListener("pointermove", trackPointer, { passive: true });
  root.addEventListener("pointerenter", trackPointer, { passive: true });
  root.addEventListener("pointerleave", hidePointer, { passive: true });
  root.addEventListener("pointerdown", burst, { capture: true, passive: true });
  window.addEventListener("blur", hidePointer);
  let busyFrame = 0;
  const observer = new MutationObserver(records => {
    if (busyFrame || !records.some(record => record.type === "attributes"
      ? record.attributeName === "aria-busy" || (busy && record.attributeName === "open") || containsBusyState(record.target)
      : [...record.addedNodes, ...record.removedNodes].some(node => containsBusyState(node) || (busy && node.nodeName === "DIALOG")))) return;
    busyFrame = requestAnimationFrame(() => {
      busyFrame = 0;
      refreshBusyState();
    });
  });
  observer.observe(root, { subtree: true, childList: true, attributeFilter: ["aria-busy", "hidden", "open"] });
  refreshBusyState();

  return () => {
    observer.disconnect();
    if (busyFrame) cancelAnimationFrame(busyFrame);
    if (moveFrame) cancelAnimationFrame(moveFrame);
    root.removeEventListener("pointermove", trackPointer);
    root.removeEventListener("pointerenter", trackPointer);
    root.removeEventListener("pointerleave", hidePointer);
    root.removeEventListener("pointerdown", burst, true);
    window.removeEventListener("blur", hidePointer);
    loading.remove();
    for (const finish of activeBursts) finish();
    idleBursts.length = 0;
    root.classList.remove("has-game-cursor", "is-game-cursor-busy", "is-game-cursor-tracking");
  };
}
