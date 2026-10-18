export function createViewRuntime(root) {
  let revision = 0;
  let controller = null;
  let cleanups = [];

  const dispose = () => {
    controller?.abort();
    controller = null;
    cleanups.splice(0).reverse().forEach((cleanup) => {
      try { cleanup(); } catch (_) { /* La siguiente vista debe poder montarse. */ }
    });
    root.querySelectorAll?.("[data-transient-overlay]").forEach((overlay) => overlay.remove());
  };

  const replace = (viewId, html) => {
    dispose();
    revision += 1;
    controller = new AbortController();
    const ownController = controller;
    root.replaceChildren();
    root.insertAdjacentHTML("afterbegin", html);
    root.dataset.activeView = viewId;
    const ownRevision = revision;
    return {
      signal: ownController.signal,
      revision: ownRevision,
      isCurrent: () => revision === ownRevision && !ownController.signal.aborted,
      guard: (callback) => (...args) => {
        if (revision === ownRevision && !ownController.signal.aborted) return callback(...args);
      },
      listen: (target, type, listener, options = {}) => target?.addEventListener(type, listener, { ...options, signal: ownController.signal }),
      onCleanup: (cleanup) => cleanups.push(cleanup)
    };
  };

  const mountOverlay = (overlay) => {
    overlay.dataset.transientOverlay = "true";
    root.append(overlay);
    const mountedRevision = revision;
    return {
      isCurrent: () => revision === mountedRevision && overlay.isConnected,
      remove: () => overlay.remove()
    };
  };

  return { replace, mountOverlay, dispose, get revision() { return revision; } };
}
