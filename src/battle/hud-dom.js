export function setHudText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

export function setHudAttribute(element, name, value) {
  const current = element.getAttribute(name);
  const next = value === null ? null : String(value);
  if (current === next) return;
  if (next === null) element.removeAttribute(name);
  else element.setAttribute(name, next);
}

export function setHudProgress(meter, value) {
  const ratio = Math.max(0, Math.min(1, value));
  if (meter.value !== ratio || !meter.hasAttribute("value")) meter.value = ratio;
}
