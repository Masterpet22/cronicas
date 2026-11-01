const CURSOR_ASSET_VERSION = "0.1.0";
const CURSOR_ASSETS = Object.freeze({
  kunai: `assets/ui/cursor/kunai.png?v=${CURSOR_ASSET_VERSION}`,
  loading: `assets/ui/cursor/shuriken.png?v=${CURSOR_ASSET_VERSION}`,
  click: `assets/ui/cursor/click-burst.png?v=${CURSOR_ASSET_VERSION}`
});

export function hasVisibleBusyState(root) {
  if (!root) return false;
  return [...root.querySelectorAll('[aria-busy="true"], .app-loading')]
    .some(element => !element.hidden && element.getClientRects().length > 0);
}

export function installGameCursor(root = document.querySelector("main")) {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!root || !finePointer.matches) return () => {};

  const cursor = document.createElement("span");
  cursor.className = "game-cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = `<img class="game-cursor-kunai" src="${CURSOR_ASSETS.kunai}" alt="" width="56" height="48" draggable="false"><img class="game-cursor-loading" src="${CURSOR_ASSETS.loading}" alt="" width="50" height="52" draggable="false">`;
  document.body.append(cursor);
  document.documentElement.classList.add("has-game-cursor");

  let x = 0;
  let y = 0;
  let frame = 0;
  let disposed = false;

  // Un dialog modal vive por encima de cualquier z-index del documento.
  // El cursor debe pertenecer a ese dialog mientras esté abierto.
  const syncCursorLayer = () => {
    const dialogs = [...root.querySelectorAll("dialog[open]")].filter(dialog => dialog.matches(":modal"));
    const focused = document.activeElement?.closest("dialog[open]");
    const host = dialogs.includes(focused) ? focused : dialogs.at(-1) || document.body;
    if (cursor.parentElement !== host) host.append(cursor);
  };

  const draw = () => {
    frame = 0;
    cursor.style.transform = `translate3d(${x - 1}px, ${y - 1}px, 0)`;
  };
  const move = event => {
    x = event.clientX;
    y = event.clientY;
    cursor.classList.add("is-visible");
    if (!frame) frame = requestAnimationFrame(draw);
  };
  const hide = () => cursor.classList.remove("is-visible");
  const refreshBusyState = () => {
    const busy = hasVisibleBusyState(root);
    if (cursor.classList.contains("is-loading") !== busy) cursor.classList.toggle("is-loading", busy);
    syncCursorLayer();
  };
  const burst = event => {
    if (event.button !== 0) return;
    const effect = document.createElement("img");
    effect.className = "game-cursor-click";
    effect.src = CURSOR_ASSETS.click;
    effect.alt = "";
    effect.width = 88;
    effect.height = 96;
    effect.draggable = false;
    effect.setAttribute("aria-hidden", "true");
    effect.style.left = `${event.clientX}px`;
    effect.style.top = `${event.clientY}px`;
    (cursor.parentElement || document.body).append(effect);
    const remove = () => effect.remove();
    effect.addEventListener("animationend", remove, { once: true });
    window.setTimeout(remove, 500);
  };

  root.addEventListener("pointermove", move, { passive: true });
  root.addEventListener("pointerenter", move, { passive: true });
  root.addEventListener("pointerleave", hide, { passive: true });
  root.addEventListener("pointerdown", burst, { passive: true });
  root.addEventListener("focusin", syncCursorLayer);
  window.addEventListener("blur", hide);

  const observer = new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.(".game-cursor, .game-cursor-click"))) refreshBusyState();
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-busy", "hidden", "class", "style", "open"] });
  refreshBusyState();

  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
    root.removeEventListener("pointermove", move);
    root.removeEventListener("pointerenter", move);
    root.removeEventListener("pointerleave", hide);
    root.removeEventListener("pointerdown", burst);
    root.removeEventListener("focusin", syncCursorLayer);
    window.removeEventListener("blur", hide);
    cursor.remove();
    document.documentElement.classList.remove("has-game-cursor");
  };
}
