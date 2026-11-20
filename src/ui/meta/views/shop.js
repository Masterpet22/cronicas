import { COSMETIC_SLOTS } from "../../../cosmetics.js?v=0.170.0";
import { ITEM_CATEGORIES, ITEMS, SHOP_ITEMS, sellPrice } from "../../../items.js?v=0.170.0";
import { countItem, purchaseItem, sellItem, saleBlockReason, sellableItemCount } from "../../../inventory.js?v=0.170.0";
import { itemIcon } from "../../item-icons.js?v=0.170.0";
import { CLOTHING_PARTS, isFullArmor } from "../../../base-outfit.js?v=0.170.0";
import { rasterCharacterPreviewMarkup } from "../character-preview.js?v=0.170.0";

const clothingSlots = Object.keys(CLOTHING_PARTS);
const fittingGroups = { clothing: clothingSlots, armor: ["mask", "outfit"] };
const fittingItems = Object.fromEntries(Object.values(fittingGroups).flat().map(slot => [
  slot, Object.values(ITEMS).filter(item => item.cosmeticSlot === slot)
]));
const shopFilters = [
  ["Equipo", ["weapons", "throwables", "seals", "accessories"]],
  ["Suministros y misiones", ["consumables", "scrolls", "contracts"]],
  ["Ropa", clothingSlots],
  ["Apariencia y hogar", ["appearance", "mask", "outfit", "substitution", "decorations"]]
];
const shopCategory = item => Object.hasOwn(fittingItems, item.cosmeticSlot) ? item.cosmeticSlot : item.category;

export function createShopView(deps) {
  let save, mode = "buy", category = "all", message = "", host;
  let fittingGroup = "clothing";
  const tryOn = new Map();
  const escape = deps.escapeHtml;

  function buyBlockReason(item, count) {
    if (item.kind === "contract" && save.campaign.completedSecondaryMissions.includes(item.missionId)) return "Contrato completado";
    if (item.stackLimit === 1 && (count > 0 || item.kind === "affinity" && save.inventory.extraAffinityUnlocked)) return "Ya lo tienes";
    if (count >= item.stackLimit) return "Capacidad máxima";
    return save.progression.coins < item.price ? "Sin monedas" : "";
  }

  function fittingCharacter() {
    const character = { ...save.character };
    for (const [slot, item] of tryOn) character[slot] = item.value;
    return character;
  }

  function fittingPreview() {
    return rasterCharacterPreviewMarkup({ character: fittingCharacter() }, deps.assetVersion, {
      backdrop: "",
      label: "Vista previa de tu personaje con las prendas del probador"
    });
  }

  function fittingAction(item) {
    if (!item?.price) return "";
    const reason = buyBlockReason(item, countItem(save, item.id));
    return `<span class="shop-fitting-price">${item.price} monedas</span><button type="submit" ${reason ? "disabled" : ""}>${reason || "Comprar"}</button>`;
  }

  function equippedFittingItem(slot) {
    const items = fittingItems[slot];
    return items.find(item => item.value === (save.character[slot] ?? null)) ?? items[0];
  }

  function fittingName(item, isEquipped) {
    const name = item.value === 1 && fittingCharacter().outfit ? "Del traje completo" : item.name;
    return isEquipped ? `Puesto · ${name}` : name;
  }

  function fittingContents() {
    const armorCoversClothes = fittingGroup === "clothing" && isFullArmor(fittingCharacter().outfit);
    const disabled = armorCoversClothes ? "disabled" : "";
    const rows = fittingGroups[fittingGroup].map(slot => {
      const trial = tryOn.get(slot);
      const label = COSMETIC_SLOTS[slot];
      const name = armorCoversClothes ? "Cubierto por la armadura" : fittingName(trial ?? equippedFittingItem(slot), !trial);
      return `<form class="shop-fitting-row" data-fitting-slot="${slot}" aria-labelledby="shop-fitting-${slot}"><span class="shop-fitting-label" id="shop-fitting-${slot}">${label}</span><div class="cosmetic-stepper shop-fitting-stepper"><button type="button" data-fitting-step="-1" aria-label="${label} anterior" ${disabled}>‹</button><output data-fitting-name>${escape(name)}</output><button type="button" data-fitting-step="1" aria-label="${label} siguiente" ${disabled}>›</button></div><div class="shop-fitting-action" data-fitting-action aria-live="polite">${armorCoversClothes ? "" : fittingAction(trial)}</div></form>`;
    }).join("");
    return `<div class="shop-fitting"><div class="shop-fitting-preview" data-fitting-preview>${fittingPreview()}</div><div class="shop-fitting-controls">${rows}<button class="shop-fitting-reset" type="button" data-fitting-reset ${tryOn.size ? "" : "disabled"}>Restaurar mi ropa</button></div></div>`;
  }

  function catalog() {
    const items = mode === "buy" ? SHOP_ITEMS : Object.values(ITEMS).filter(item => countItem(save, item.id) && sellPrice(item));
    return items.filter(item => category === "all" || shopCategory(item) === category).map(item => {
      const count = countItem(save, item.id), selling = mode === "sell";
      const reason = selling ? saleBlockReason(save, item.id) : buyBlockReason(item, count);
      const maximum = selling ? sellableItemCount(save, item.id) : item.stackLimit - count;
      const placed = item.kind === "decoration" ? count - sellableItemCount(save, item.id) : 0;
      return `<form class="item-card shop-item" data-shop-item="${item.id}"><div class="item-card-top"><span class="item-art">${itemIcon(item, save.character.bodyType)}</span><span class="item-price">${item.price === 0 ? "Inicial" : `${selling ? sellPrice(item) : item.price} <small>monedas / unidad</small>`}</span></div><h3>${escape(item.name)}</h3><p>${escape(item.description)}</p><small class="shop-stock">En inventario: ${count}${placed ? ` · En Mi espacio: ${placed}` : ""}${reason && selling ? `<br>${escape(reason)}` : ""}</small><div class="shop-purchase">${item.stackLimit > 1 ? `<label>Cantidad<input type="number" min="1" max="${Math.max(1, maximum)}" value="1" aria-label="Cantidad de ${escape(item.name)}" ${maximum < 1 ? "disabled" : ""}></label>` : ""}<button type="submit" ${reason ? "disabled" : ""}>${selling ? "Vender" : reason || "Comprar"}</button></div></form>`;
    }).join("") || `<p class="inventory-empty">${mode === "sell" ? "No tienes objetos para vender en esta categoría." : "No hay objetos a la venta en esta categoría."}</p>`;
  }
  function contents() {
    const tabs = [["buy", "Comprar"], ["sell", "Vender"], ["fitting", "Probador"]].map(([id, label]) =>
      `<button type="button" data-shop-mode="${id}" aria-pressed="${mode === id}">${label}</button>`
    ).join("");
    const catalogMarkup = () => {
      const filters = shopFilters.map(([label, ids]) =>
        `<optgroup label="${label}">${ids.map(id => `<option value="${id}" ${category === id ? "selected" : ""}>${ITEM_CATEGORIES[id] ?? COSMETIC_SLOTS[id]}</option>`).join("")}</optgroup>`
      ).join("");
      return `<label class="shop-category-filter">Tipo de objeto<select data-shop-category-select><option value="all" ${category === "all" ? "selected" : ""}>Todos los objetos</option>${filters}</select></label><div class="shop-items">${catalog()}</div>`;
    };
    const groups = mode === "fitting" ? `<div class="shop-fitting-groups" role="group" aria-label="Prendas del probador">${[["clothing", "Ropa"], ["armor", "Máscaras y trajes"]].map(([id, label]) =>
      `<button type="button" data-fitting-group="${id}" aria-pressed="${fittingGroup === id}">${label}</button>`
    ).join("")}</div>` : "";
    return `<header class="shop-heading"><div><h2>Prepara tu próximo viaje</h2></div><strong class="shop-wallet">${save.progression.coins}<small>MONEDAS</small></strong></header><nav class="shop-tabs" aria-label="Operación de la tienda">${tabs}${groups}</nav><p class="shop-feedback" role="status">${escape(message)}</p>${mode === "fitting" ? fittingContents() : catalogMarkup()}`;
  }
  const refresh = selector => { host.innerHTML = contents(); if (selector) host.querySelector(selector)?.focus({ preventScroll:true }); };
  return {
    id: "shop",
    render(state) {
      if (!host?.isConnected) {
        tryOn.clear();
        fittingGroup = "clothing";
        if (mode === "fitting") mode = "buy";
      }
      save = state.save;
      return `<section class="shop-panel" aria-label="Tienda">${contents()}</section>`;
    },
    mount(root, scope) {
      host = root.querySelector(".shop-panel");
      scope.listen(host, "click", event => {
        const tab = event.target.closest("[data-shop-mode]");
        if (tab) { mode = tab.dataset.shopMode; category = "all"; message = ""; refresh(`[data-shop-mode="${mode}"]`); }
        const group = event.target.closest("[data-fitting-group]");
        if (group) { fittingGroup = group.dataset.fittingGroup; refresh(`[data-fitting-group="${fittingGroup}"]`); }
        const arrow = event.target.closest("[data-fitting-step]");
        if (arrow) {
          const row = arrow.closest("[data-fitting-slot]");
          const slot = row.dataset.fittingSlot;
          const items = fittingItems[slot];
          const equipped = equippedFittingItem(slot);
          const selected = items.indexOf(tryOn.get(slot) ?? equipped);
          const next = items[(selected + Number(arrow.dataset.fittingStep) + items.length) % items.length];
          if (next === equipped) tryOn.delete(slot);
          else tryOn.set(slot, next);
          row.querySelector("[data-fitting-name]").textContent = fittingName(next, next === equipped);
          row.querySelector("[data-fitting-action]").innerHTML = fittingAction(tryOn.get(slot));
          host.querySelector("[data-fitting-preview]").innerHTML = fittingPreview();
          host.querySelector("[data-fitting-reset]").disabled = !tryOn.size;
        }
        if (event.target.closest("[data-fitting-reset]") && tryOn.size) {
          tryOn.clear();
          message = "";
          refresh('[data-fitting-step="1"]');
        }
      });
      scope.listen(host, "change", event => {
        const select = event.target;
        if (select.matches("[data-shop-category-select]")) {
          category = select.value;
          refresh("[data-shop-category-select]");
        }
      });
      scope.listen(host, "submit", event => {
        event.preventDefault();
        const form = event.target.closest("[data-shop-item], [data-fitting-slot]");
        const slot = form?.dataset.fittingSlot;
        const id = slot ? tryOn.get(slot)?.id : form?.dataset.shopItem;
        if (!id) return;
        const result = (mode === "sell" ? sellItem : purchaseItem)(save, id, Number(form.querySelector("input")?.value || 1));
        if (result.ok) save = deps.onPersist(result.save);
        message = result.message;
        refresh();
        const nextAction = slot
          ? host.querySelector(`[data-fitting-slot="${slot}"] [data-fitting-step="1"]`)
          : host.querySelector(`[data-shop-item="${id}"] button:not([disabled])`) || host.querySelector("[data-shop-category-select]");
        nextAction?.focus({ preventScroll:true });
        const coins = root.querySelector(".summary-item:last-child strong");
        if (coins) { coins.textContent = save.progression.coins; coins.parentElement.setAttribute("aria-label", `${save.progression.coins} monedas`); }
      });
    },
    dispose() { host = null; tryOn.clear(); }
  };
}
