import { ITEMS, STARTER_EQUIPMENT, sellPrice } from "./items.js?v=0.126.0";
import { BASE_COSMETICS, LEGACY_SEALS } from "./cosmetics.js?v=0.114.0";
import { AFFINITY_IDS } from "./affinity-system.js?v=0.114.0";
import { GUILD_STARTER_ITEMS, GUILD_INVENTORY_VERSION, guildInventoryGrants } from "./guild-catalog.js?v=0.126.0";
import { placedDecorationCount } from "./guild.js?v=0.126.0";

export const countItem = (save, id) => {
  const count = Number(save?.inventory?.items?.[id]);
  return Object.hasOwn(ITEMS, id) && Number.isFinite(count) ? Math.max(0, Math.min(ITEMS[id].stackLimit, Math.floor(count))) : 0;
};
export const starterInventory = (character = {}) => ({ items: Object.fromEntries([
  ...Object.values(STARTER_EQUIPMENT).filter(Boolean),
  ...GUILD_STARTER_ITEMS,
  ...Object.values(ITEMS).filter(item => item.kind === "cosmetic" && (item.price === 0 || item.cosmeticSlot === "hair" && item.value === (character.hair ?? 1))).map(item => item.id)
].map(id => [id, 1])), extraAffinityUnlocked: false });

export function normalizeInventory(save) {
  const source = save?.inventory;
  const items = {};
  if (source?.items && typeof source.items === "object") {
    for (const id of Object.keys(ITEMS)) {
      const value = Number(source.items[id]);
      if (Number.isFinite(value) && value >= 1) items[id] = Math.min(ITEMS[id].stackLimit, Math.floor(value));
    }
  }
  const legacy = !source || Number(save?.version || 0) < 20;
  if (save?.character) {
    if (legacy) {
      if (!source || Number(save.version || 0) < 19) Object.assign(items, starterInventory(save.character).items);
      for (const id of Object.values(save.equipment || {})) if (ITEMS[id]?.kind === "equipment") items[id] = 1;
      for (const [oldId, sealId] of Object.entries(LEGACY_SEALS)) if (source?.items?.[oldId] > 0 || save.equipment?.armor === oldId) items[sealId] = 1;
      for (const item of Object.values(ITEMS)) if (item.kind === "cosmetic" && (item.price === 0 || item.value === (save.character[item.cosmeticSlot] === "chair" ? "puppet" : save.character[item.cosmeticSlot]))) items[item.id] = 1;
    }
  }
  if (save?.character) for (const item of Object.values(ITEMS)) if (item.kind === "cosmetic" && item.price === 0) items[item.id] = 1;
  if (save?.character) {
    if (Number(save.version || 0) < GUILD_INVENTORY_VERSION) for (const [id, count] of Object.entries(guildInventoryGrants(save))) items[id] = Math.max(items[id] || 0, count);
    for (const item of Object.values(ITEMS)) if (item.kind === "decoration" && item.price === 0) items[item.id] = 1;
  }
  const legacyThird = Number(save?.version || 0) < 19 && save?.character?.affinities?.length >= 3 && save.progression?.level >= 35 && save.campaign?.elementRank >= 3;
  return { items, extraAffinityUnlocked: source?.extraAffinityUnlocked === true || Boolean(legacyThird) };
}

const clone = save => ({ ...save, progression: { ...save.progression }, inventory: normalizeInventory(save) });
const failure = (save, message) => ({ ok: false, save, message });
const success = (save, message) => ({ ok: true, save, message });

export function purchaseItem(save, id, quantity = 1) {
  const item = Object.hasOwn(ITEMS, id) ? ITEMS[id] : null;
  if (!save?.character || !item || !(item.price > 0) || item.purchasable === false) return failure(save, "Este objeto no está a la venta.");
  if (item.kind === "contract" && save.campaign.completedSecondaryMissions.includes(item.missionId)) return failure(save, "Ya completaste este contrato.");
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > item.stackLimit) return failure(save, "La cantidad no es válida.");
  const next = clone(save);
  if (countItem(next, id) + quantity > item.stackLimit) return failure(save, item.stackLimit === 1 ? "Ya tienes este objeto." : "No puedes llevar más de 99 unidades.");
  if (id === "affinity_scroll" && next.inventory.extraAffinityUnlocked) return failure(save, "La afinidad extra ya está desbloqueada.");
  const total = item.price * quantity;
  if (!Number.isSafeInteger(next.progression.coins) || next.progression.coins < total) return failure(save, "No tienes suficientes monedas.");
  next.progression.coins -= total;
  next.inventory.items[id] = countItem(next, id) + quantity;
  return success(next, `Compraste ${quantity > 1 ? `${quantity} × ` : ""}${item.name}.`);
}

export function equipItem(save, slot, id) {
  if (!Object.hasOwn(STARTER_EQUIPMENT, slot)) return failure(save, "La ranura no es válida.");
  if (id !== null && (ITEMS[id]?.slot !== slot || countItem(save, id) < 1)) return failure(save, "Compra o consigue este equipo primero.");
  return success({ ...save, equipment: { ...save.equipment, [slot]: id } }, id ? `${ITEMS[id].name} equipado.` : "Ranura desequipada.");
}

export function saleBlockReason(save, id) {
  const item = Object.hasOwn(ITEMS, id) ? ITEMS[id] : null;
  if (!save?.character || !item || !countItem(save, id) || !sellPrice(item)) return "Este objeto no se puede vender.";
  if (item.kind === "decoration" && !sellableItemCount(save, id)) return item.guildSurface === "decor" ? "Retíralo de Mi espacio antes de venderlo." : "Cambia este acabado en el Gremio antes de venderlo.";
  if (Object.values(save.equipment || {}).includes(id) || item.kind === "cosmetic" && save.character[item.cosmeticSlot] === item.value) return "Desequípalo en el Dojo antes de venderlo.";
  if (item.kind === "contract" && save.campaign.missionProgress[item.missionId]?.status === "in-progress") return "Termina o abandona la misión antes de vender su contrato.";
  return "";
}

export function sellableItemCount(save, id) {
  const item = ITEMS[id], count = countItem(save, id);
  if (item?.kind !== "decoration") return count;
  if (item.guildSurface === "decor") return Math.max(0, count - placedDecorationCount(save, item.value));
  return save?.guild?.room?.[item.guildSurface] === item.value ? 0 : count;
}

export function sellItem(save, id, quantity = 1) {
  const reason = saleBlockReason(save, id);
  if (reason) return failure(save, reason);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > sellableItemCount(save, id)) return failure(save, ITEMS[id].kind === "decoration" ? "Solo puedes vender las unidades que no estén colocadas en Mi espacio." : "La cantidad no es válida.");
  const next = clone(save), total = sellPrice(ITEMS[id]) * quantity;
  if (!Number.isSafeInteger(next.progression.coins) || next.progression.coins + total > 9999999) return failure(save, "No puedes guardar más monedas.");
  next.inventory.items[id] -= quantity;
  if (!next.inventory.items[id]) delete next.inventory.items[id];
  next.progression.coins += total;
  return success(next, `Vendiste ${quantity} × ${ITEMS[id].name} por ${total} monedas.`);
}

export function normalizeAppearance(character, inventory) {
  return Object.fromEntries(Object.entries(BASE_COSMETICS).map(([slot, base]) => {
    let value = slot === "teleportObject" && character?.[slot] === "chair" ? "puppet" : character?.[slot] ?? base;
    if (["hair", "face", "top", "bottom", "shoes"].includes(slot)) value = Number(value);
    if (slot === "hair" && ![0, 1, 4].includes(value)) value = inventory.items.hair_short ? 1 : 0;
    const owned = Object.values(ITEMS).some(item => item.kind === "cosmetic" && item.cosmeticSlot === slot && item.value === value && inventory.items[item.id] > 0);
    return [slot, owned ? value : base];
  }));
}

export function equipCosmetic(save, id) {
  const item = Object.hasOwn(ITEMS, id) ? ITEMS[id] : null;
  if (!save?.character || item?.kind !== "cosmetic" || !countItem(save, id)) return failure(save, "Compra esta apariencia o sustitución primero.");
  return success({ ...save, character: { ...save.character, [item.cosmeticSlot]: item.value } }, `${item.name} seleccionado.`);
}

export const affinityScrollRequirement = save => save?.campaign?.rank !== "Guardián" || save?.progression?.level < 10
  ? "Requiere rango Guardián y nivel 10 como mínimo."
  : save.character.affinities.length !== 2 ? "Necesitas dos afinidades activas." : "";

export function removeItem(save, id) {
  if (!ITEMS[id] || countItem(save, id) < 1 || ["equipment", "decoration"].includes(ITEMS[id].kind)) return failure(save, "No tienes un objeto utilizable de ese tipo.");
  const next = clone(save), remaining = countItem(next, id) - 1;
  if (remaining) next.inventory.items[id] = remaining;
  else delete next.inventory.items[id];
  return success(next, `${ITEMS[id].name} usado.`);
}

export function unlockAffinityWithScroll(save, affinity) {
  if (!save?.character) return failure(save, "Primero crea un personaje.");
  const known = save?.character?.affinities || [];
  if (!AFFINITY_IDS.includes(affinity) || known.includes(affinity)) return failure(save, "Elige una afinidad diferente.");
  if (save.inventory?.extraAffinityUnlocked) return failure(save, "La tercera afinidad ya está desbloqueada.");
  const requirement = affinityScrollRequirement(save);
  if (requirement) return failure(save, requirement);
  const result = removeItem(save, "affinity_scroll");
  if (!result.ok) return result;
  const next = result.save;
  next.inventory.extraAffinityUnlocked = true;
  next.character = { ...save.character, affinities: [...known, affinity], knownAffinities: [...new Set([...save.character.knownAffinities, affinity])],
    affinityXp: { ...save.character.affinityXp, [affinity]: Math.max(50, save.character.affinityXp[affinity] || 0) } };
  return success(next, `Tercera afinidad desbloqueada: ${affinity}.`);
}

export function missionItemEffect(itemId, player) {
  const item = ITEMS[itemId];
  if (item?.kind !== "consumable") return { ok: false, reason: "Este objeto no se usa durante el turno." };
  if (!player || player.hp <= 0) return { ok: false, reason: "No puedes usarlo estando derrotado." };
  const hp = item.effect.health ? Math.min(Math.max(0, player.maxHp - player.hp), Math.max(1, Math.round(player.maxHp * item.effect.health))) : 0;
  const chakra = item.effect.chakra ? Math.min(Math.max(0, player.maxChakra - player.chakra), Math.max(1, Math.round(player.maxChakra * item.effect.chakra))) : 0;
  const cleanse = Boolean(item.effect.cleanse && (player.statuses?.length || player.soak?.stacks));
  return hp > 0 || chakra > 0 || cleanse ? { ok: true, hp, chakra, cleanse } : { ok: false, reason: "No lo necesitas en este momento." };
}
