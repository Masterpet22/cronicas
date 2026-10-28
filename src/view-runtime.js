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
    let paused = false;
    const timers = new Set();
    const schedule = (timer) => {
      timer.started = performance.now();
      timer.handle = setTimeout(() => timer.finish(true), timer.remaining);
    };
    ownController.signal.addEventListener("abort", () => {
      timers.forEach((timer) => timer.finish(false));
    }, { once: true });
    root.replaceChildren();
    root.insertAdjacentHTML("afterbegin", html);
    root.dataset.activeView = viewId;
    const ownRevision = revision;
    return {
      signal: ownController.signal,
      revision: ownRevision,
      isPaused: () => paused,
      setPaused(value) {
        if (ownController.signal.aborted || paused === value) return;
        paused = value;
        timers.forEach((timer) => {
          if (paused) {
            clearTimeout(timer.handle);
            timer.remaining = Math.max(0, timer.remaining - (performance.now() - timer.started));
          } else schedule(timer);
        });
      },
      delay(duration) {
        return new Promise((resolve) => {
          if (ownController.signal.aborted) { resolve(false); return; }
          const timer = { remaining: Math.max(0, duration), finish(value) {
            clearTimeout(timer.handle);
            timers.delete(timer);
            resolve(value);
          } };
          timers.add(timer);
          if (!paused) schedule(timer);
        });
      },
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
