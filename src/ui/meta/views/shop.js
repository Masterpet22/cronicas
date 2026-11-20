import { COSMETIC_SLOTS } from "../../../cosmetics.js?v=0.166.0";
import { ITEM_CATEGORIES, ITEMS, SHOP_ITEMS, sellPrice } from "../../../items.js?v=0.166.0";
import { countItem, purchaseItem, sellItem, saleBlockReason, sellableItemCount } from "../../../inventory.js?v=0.166.0";
import { itemIcon } from "../../item-icons.js?v=0.166.0";
import { CLOTHING_PARTS } from "../../../base-outfit.js?v=0.166.0";
import { rasterCharacterPreviewMarkup } from "../character-preview.js?v=0.167.0";

const clothingSlots = Object.keys(CLOTHING_PARTS);
const fittingItems = Object.fromEntries(clothingSlots.map(slot => [
  slot, Object.values(ITEMS).filter(item => item.cosmeticSlot === slot)
]));
const shopFilters = [
  ["Equipo", ["weapons", "throwables", "seals", "accessories"]],
  ["Suministros y misiones", ["consumables", "scrolls", "contracts"]],
  ["Ropa", clothingSlots],
  ["Apariencia y hogar", ["appearance", "substitution", "decorations"]]
];
const shopCategory = item => clothingSlots.includes(item.cosmeticSlot) ? item.cosmeticSlot : item.category;

export function createShopView(deps) {
  let save, mode = "buy", category = "all", message = "", host;
  const tryOn = new Map();
  const escape = deps.escapeHtml;

  function buyBlockReason(item, count) {
    if (item.kind === "contract" && save.campaign.completedSecondaryMissions.includes(item.missionId)) return "Contrato completado";
    if (item.stackLimit === 1 && (count > 0 || item.kind === "affinity" && save.inventory.extraAffinityUnlocked)) return "Ya lo tienes";
    if (count >= item.stackLimit) return "Capacidad máxima";
    return save.progression.coins < item.price ? "Sin monedas" : "";
  }

  function fittingPreview() {
    const character = { ...save.character };
    for (const [slot, item] of tryOn) character[slot] = item.value;
    return rasterCharacterPreviewMarkup({ character }, deps.assetVersion, {
      backdrop: "",
      label: "Vista previa de tu personaje con las prendas del probador"
    });
  }

  function fittingAction(item) {
    if (!item?.price) return "";
    const reason = buyBlockReason(item, countItem(save, item.id));
    return `<span class="shop-fitting-price">${item.price} monedas</span><button type="submit" ${reason ? "disabled" : ""}>${reason || "Comprar"}</button>`;
  }

  function fittingContents() {
    const name = item => item.value === 1 && save.character.outfit ? "Del traje completo" : item.name;
    const rows = clothingSlots.map(slot => {
      const items = fittingItems[slot];
      const equipped = items.find(item => item.value === save.character[slot]) ?? items[0];
      const trial = tryOn.get(slot);
      const options = items.filter(item => item !== equipped).map(item =>
        `<option value="${item.id}" ${item === trial ? "selected" : ""}>${escape(name(item))}</option>`
      ).join("");
      return `<form class="shop-fitting-row" data-fitting-slot="${slot}"><label for="shop-fitting-${slot}">${COSMETIC_SLOTS[slot]}</label><select id="shop-fitting-${slot}" data-fitting-select><option value="">Puesto · ${escape(name(equipped))}</option>${options}</select><div class="shop-fitting-action" data-fitting-action aria-live="polite">${fittingAction(trial)}</div></form>`;
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
    return `<header class="shop-heading"><div><h2>Prepara tu próximo viaje</h2></div><strong class="shop-wallet">${save.progression.coins}<small>MONEDAS</small></strong></header><nav class="shop-tabs" aria-label="Operación de la tienda">${tabs}</nav><p class="shop-feedback" role="status">${escape(message)}</p>${mode === "fitting" ? fittingContents() : catalogMarkup()}`;
  }
  const refresh = selector => { host.innerHTML = contents(); if (selector) host.querySelector(selector)?.focus({ preventScroll:true }); };
  return {
    id: "shop",
    render(state) {
      if (!host?.isConnected) {
        tryOn.clear();
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
        if (event.target.closest("[data-fitting-reset]") && tryOn.size) {
          tryOn.clear();
          message = "";
          refresh("[data-fitting-select]");
        }
      });
      scope.listen(host, "change", event => {
        const select = event.target;
        if (select.matches("[data-shop-category-select]")) {
          category = select.value;
          refresh("[data-shop-category-select]");
        }
        if (select.matches("[data-fitting-select]")) {
          const row = select.closest("[data-fitting-slot]");
          const slot = row.dataset.fittingSlot;
          const item = fittingItems[slot].find(option => option.id === select.value);
          if (item) tryOn.set(slot, item);
          else tryOn.delete(slot);
          row.querySelector("[data-fitting-action]").innerHTML = fittingAction(item);
          host.querySelector("[data-fitting-preview]").innerHTML = fittingPreview();
          host.querySelector("[data-fitting-reset]").disabled = !tryOn.size;
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
          ? host.querySelector(`[data-fitting-slot="${slot}"] select`)
          : host.querySelector(`[data-shop-item="${id}"] button:not([disabled])`) || host.querySelector("[data-shop-category-select]");
        nextAction?.focus({ preventScroll:true });
        const coins = root.querySelector(".summary-item:last-child strong");
        if (coins) { coins.textContent = save.progression.coins; coins.parentElement.setAttribute("aria-label", `${save.progression.coins} monedas`); }
      });
    },
    dispose() { host = null; tryOn.clear(); }
  };
}
