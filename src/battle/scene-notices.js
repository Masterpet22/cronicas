import { suspendPauseRendering } from "./pause-rendering.js?v=1.1.0";

export function mountSceneNotice(scene, variant, label, onClose) {
  const host = scene.game.canvas.parentElement;
  host.classList.add("scene-notice-host");
  const overlay = document.createElement("div");
  overlay.className = `combat-scene-notice ${variant}`;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", label);
  const panel = document.createElement("section");
  panel.className = "scene-panel";
  panel.tabIndex = -1;
  overlay.append(panel);
  host.append(overlay);

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    scene.events.off("shutdown", close);
    scene.events.off("destroy", close);
    overlay.remove();
    onClose?.();
  }

  overlay.addEventListener("keydown", event => {
    event.stopPropagation();
    if (event.key !== "Tab") return;
    const buttons = [...panel.querySelectorAll("button:not(:disabled)")];
    const next = event.shiftKey ? buttons.at(-1) : buttons[0];
    const edge = event.shiftKey ? buttons[0] : buttons.at(-1);
    if (!buttons.includes(document.activeElement) || document.activeElement === edge) {
      event.preventDefault();
      (next ?? panel).focus({ preventScroll: true });
    }
  });
  scene.events.once("shutdown", close);
  scene.events.once("destroy", close);
  return { overlay, panel, close };
}

export function addNoticeText(parent, tag, text, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

export function presentBattleNotice(scene, title, description, choices, { quote, afterChoice } = {}) {
  return new Promise(resolve => {
    const restoreHud = scene.accessibleHud?.suspend?.();
    let selection;
    let frozen;
    const { panel, close } = mountSceneNotice(scene, "mission-notice", title, () => {
      frozen?.dispose();
      restoreHud?.();
      resolve(selection);
    });
    addNoticeText(panel, "h2", title, "scene-title");
    const copy = document.createElement("div");
    copy.className = "scene-copy";
    for (const paragraph of description.split(/\n\s*\n/)) {
      if (paragraph) addNoticeText(copy, "p", paragraph);
    }
    if (quote) {
      const block = document.createElement("blockquote");
      addNoticeText(block, "p", quote.text);
      addNoticeText(block, "cite", quote.speaker);
      copy.append(block);
    }
    panel.append(copy);
    const actions = document.createElement("div");
    actions.className = "scene-choices";
    panel.append(actions);
    for (const choice of choices) {
      const button = addNoticeText(actions, "button", "", "scene-choice");
      button.type = "button";
      button.disabled = Boolean(choice.disabled);
      button.classList.toggle("is-primary", Boolean(choice.primary));
      addNoticeText(button, "strong", choice.label);
      if (choice.detail) addNoticeText(button, "small", choice.detail);
      button.addEventListener("click", async () => {
        if (selection !== undefined) return;
        selection = choice.value;
        if (afterChoice) {
          frozen.dispose();
          const response = addNoticeText(panel, "p", afterChoice(selection), "scene-choice-response");
          response.setAttribute("role", "status");
          actions.hidden = true;
          panel.focus({ preventScroll: true });
          await scene.delay(1100);
        }
        close();
      });
    }
    frozen = suspendPauseRendering(scene);
    (actions.querySelector("button.is-primary:not(:disabled)") ?? actions.querySelector("button:not(:disabled)") ?? panel)
      .focus({ preventScroll: true });
  });
}
