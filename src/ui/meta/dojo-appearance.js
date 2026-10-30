import { skinToneControlMarkup } from "../skin-tone-control.js?v=0.119.0";
import { normalizeSkinTone } from "../../skin-tones.js?v=0.119.0";
import { ITEMS } from "../../items.js?v=0.114.0";
import { COSMETIC_SLOTS } from "../../cosmetics.js?v=0.114.0";
import { countItem, equipCosmetic } from "../../inventory.js?v=0.114.0";

const choices = (save, slot) => Object.values(ITEMS).filter(item => item.kind === "cosmetic" && item.cosmeticSlot === slot && countItem(save, item.id));
export function appearanceControlsMarkup(save) {
  return skinToneControlMarkup(save.character.skinTone) + Object.entries(COSMETIC_SLOTS).map(([slot, label]) => {
    const owned = choices(save, slot), current = owned.find(item => item.value === save.character[slot]) || owned[0];
    const disabled = owned.length < 2 ? "disabled" : "";
    return `<div class="cosmetic-control" data-cosmetic-control="${slot}"><span class="cosmetic-label">${label}</span><div class="cosmetic-stepper"><button type="button" data-cosmetic-step="${slot}" data-direction="-1" aria-label="${label} anterior" ${disabled}>‹</button><output data-cosmetic-value="${slot}">${current?.image ? `<img class="teleport-object-preview" src="${current.image}" alt="" width="30" height="30">` : ""}${current?.name || "Sin seleccionar"}</output><button type="button" data-cosmetic-step="${slot}" data-direction="1" aria-label="${label} siguiente" ${disabled}>›</button></div><small>${current?.description || ""} ${owned.length < 2 ? "Consigue otras opciones en la tienda." : ""}</small></div>`;
  }).join("");
}
export function refreshDojoAppearance(root, save) {
  const menu = root.querySelector(".cosmetic-menu");
  if (menu) menu.innerHTML = appearanceControlsMarkup(save);
}
export function mountDojoAppearance(root, scope, { getSave, persist }) {
  scope.listen(root.querySelector(".cosmetic-menu"), "change", event => {
    if (event.target.name !== "skinTone") return;
    const save = getSave(), tone = normalizeSkinTone(event.target.value);
    persist({ ...save, character: { ...save.character, skinTone: tone } });
    root.querySelector(`[name="skinTone"][value="${tone}"]`)?.focus();
  });
  scope.listen(root.querySelector(".cosmetic-menu"), "click", event => {
    const button = event.target.closest("[data-cosmetic-step]");
    if (!button || button.disabled) return;
    const save = getSave(), slot = button.dataset.cosmeticStep, owned = choices(save, slot);
    const index = Math.max(0, owned.findIndex(item => item.value === save.character[slot]));
    const next = owned[(index + Number(button.dataset.direction) + owned.length) % owned.length];
    const result = equipCosmetic(save, next?.id);
    if (!result.ok) return;
    persist(result.save);
    root.querySelector(`#dojo-message`).textContent = result.message;
    root.querySelector(`[data-cosmetic-step="${slot}"][data-direction="${button.dataset.direction}"]`)?.focus();
  });
}
