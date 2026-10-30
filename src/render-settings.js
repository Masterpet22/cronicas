import { configureRenderResolution, renderQualityPreference } from "./battle/render-resolution.js?v=0.114.0";

const updateEvent = "render-quality-updated";

export function bindRenderSettings(element, runtime, getGame, onResize) {
  const select = document.getElementById("render-quality");
  const status = document.querySelector("[data-render-quality-status]");
  select.value = renderQualityPreference();
  wireQualityButtons(select.closest(".render-quality-control"), select);
  const refresh = () => {
    const game = getGame();
    if (!game || element.hidden) {
      status.textContent = "Se aplicará al entrar en una misión.";
    } else {
      const previousScale = runtime.renderResolution;
      const size = configureRenderResolution(element, runtime, { preference: select.value });
      if (game.scale.width !== size.width || game.scale.height !== size.height) {
        const scenes = game.scene.scenes.filter(scene => scene.scene.isActive() || scene.scene.isPaused());
        const zooms = scenes.map(scene => scene.cameras.main.zoom);
        game.scale.resize(size.width, size.height);
        scenes.forEach((scene, index) => {
          scene.cameras.main.setZoom(zooms[index] * size.scale / previousScale).centerOn(480, 270);
          const sharpen = objects => objects.forEach(child => {
            if (child.type === "Text") child.setResolution(runtime.textTextureResolution);
            if (Array.isArray(child.list)) sharpen(child.list);
          });
          sharpen(scene.children.list);
        });
        onResize?.(game);
      }
      status.textContent = `Resolución actual: ${size.width} × ${size.height} px.`;
    }
    document.dispatchEvent(new Event(updateEvent));
  };
  select.addEventListener("change", () => {
    try { localStorage.setItem("render-quality", select.value); } catch (_) { /* Preferencia opcional. */ }
    refresh();
  });
  const observer = new ResizeObserver(refresh);
  observer.observe(element);
  refresh();
  return { refresh };
}

// Los menús de pausa utilizan la misma preferencia que los ajustes generales.
export function mountRenderQualityControl(parent) {
  const original = document.getElementById("render-quality");
  const control = original.closest(".render-quality-control").cloneNode(true);
  const select = control.querySelector("select");
  select.removeAttribute("id");
  parent.append(control);
  const unwire = wireQualityButtons(control, original);
  return () => { unwire(); control.remove(); };
}

function wireQualityButtons(control, original) {
  control.querySelector(".render-quality-options")?.remove();
  const choices = document.createElement("div");
  choices.className = "render-quality-options";
  choices.setAttribute("role", "radiogroup");
  choices.setAttribute("aria-label", "Resolución de combate");
  const labels = { auto: "Auto", economy: "540p", low: "675p", balanced: "810p", high: "1080p" };
  [...original.options].forEach(option => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", option.textContent);
    button.dataset.renderQuality = option.value;
    button.textContent = labels[option.value];
    button.addEventListener("click", () => {
      original.value = option.value;
      original.dispatchEvent(new Event("change", { bubbles: true }));
    });
    choices.append(button);
  });
  choices.addEventListener("keydown", event => {
    const buttons = [...choices.children];
    const index = buttons.indexOf(document.activeElement);
    if (index < 0 || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : (index + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next].click(); buttons[next].focus();
  });
  control.insertBefore(choices, control.querySelector("[data-render-quality-status]"));
  const sync = () => {
    control.querySelector("select").value = original.value;
    choices.querySelectorAll("button").forEach(button => {
      const checked = button.dataset.renderQuality === original.value;
      button.setAttribute("aria-checked", String(checked));
      button.tabIndex = checked ? 0 : -1;
    });
    control.querySelector("[data-render-quality-status]").textContent = document.querySelector("[data-render-quality-status]").textContent;
  };
  document.addEventListener(updateEvent, sync);
  sync();
  return () => document.removeEventListener(updateEvent, sync);
}
