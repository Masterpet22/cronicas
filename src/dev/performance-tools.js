import { createPerformanceMonitor } from "./performance-monitor.js?v=0.99.0";
import { mountPerformancePanel } from "./performance-panel.js?v=0.99.0";

const preference = "dev-performance-enabled";
let enabled = false;
try { enabled = window.localStorage.getItem(preference) === "on"; } catch (_) { /* Herramienta opcional. */ }
let attachment = null;
let monitor = null;
let unmount = null;
let latest = null;
const captures = [];

function capture() {
  if (monitor) latest = monitor.snapshot();
  if (latest) {
    captures.push(latest);
    if (captures.length > 30) captures.shift();
  }
  return latest;
}

function stop() {
  if (monitor) capture();
  unmount?.();
  monitor?.dispose();
  unmount = null;
  monitor = null;
}

function start() {
  if (!attachment || monitor || !enabled) return;
  monitor = createPerformanceMonitor(attachment.game, attachment.options);
  unmount = mountPerformancePanel(attachment.root, monitor, capture, () => performanceTools.exportReport());
}

export const performanceTools = {
  get enabled() { return enabled; },
  setEnabled(value) {
    enabled = Boolean(value);
    try { window.localStorage.setItem(preference, enabled ? "on" : "off"); } catch (_) { /* Sin persistencia. */ }
    if (enabled) start();
    else stop();
  },
  snapshot() { return monitor?.snapshot() || latest; },
  capture,
  exportReport() {
    if (monitor) capture();
    const data = { schemaVersion: 1, captures: [...captures] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "cronicas-rendimiento.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return data;
  }
};

export function uninstallPerformanceTools(game) {
  if (attachment?.game !== game) return;
  stop();
  game.events.off("destroy", attachment.detach);
  attachment = null;
}

export function installPerformanceTools(game, root, options) {
  if (attachment) uninstallPerformanceTools(attachment.game);
  const detach = () => uninstallPerformanceTools(game);
  attachment = { game, root, options, detach };
  game.events.once("destroy", detach);
  start();
}
