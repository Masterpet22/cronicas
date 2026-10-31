import { EQUIPMENT } from "./data.js?v=0.114.0";
import { COSMETICS } from "./cosmetics.js?v=0.114.0";
import { TELEPORT_OBJECTS } from "./teleport-objects.js";
import { CONTRACT_MISSIONS } from "./content/store-contracts.js?v=0.114.0";
import { GUILD_ITEMS } from "./guild-catalog.js?v=0.126.0";

export const STARTER_EQUIPMENT = Object.freeze({ weapon: "kunai", seal: "seal_wind", accessory: "chakra_charm", companion: null });
const prices = { kunai: 30, steel_kunai: 85, tanto: 80, sword: 130, axe: 160, staff: null,
  seal_wind: 35, seal_vitality: 95, seal_precision: 75, seal_traveler: 65, seal_shadow: 125, seal_channeler: 145, seal_guardian: 240,
  chakra_charm: 60, hawk_eye: 70, scholar_mark: 120 };
const equipment = Object.entries(EQUIPMENT).flatMap(([slot, entries]) => entries.map(item => ({ ...item, slot,
  category: slot === "seal" ? "seals" : slot === "companion" ? "companions" : slot === "weapon" ? "weapons" : "accessories",
  price: prices[item.id] ?? null, purchasable: !["seal_guardian", "companion_hound"].includes(item.id), stackLimit: 1, kind: "equipment" })));
const consumables = [
  { id: "health_potion", name: "Poción de vida", description: "Recupera un 35 % de tus PV máximos. Consume tu turno.", price: 18, effect: { health: .35 } },
  { id: "chakra_potion", name: "Poción de chakra", description: "Recupera un 35 % de tu chakra máximo. Consume tu turno.", price: 22, effect: { chakra: .35 } },
  { id: "purifying_tonic", name: "Tónico purificador", description: "Elimina los estados negativos y Empapado. Consume tu turno.", price: 30, effect: { cleanse: true } },
  { id: "restorative_elixir", name: "Elixir restaurador", description: "Recupera un 50 % de PV y chakra. Consume tu turno.", price: 60, effect: { health: .5, chakra: .5 } }
].map(item => ({ ...item, category: "consumables", kind: "consumable", stackLimit: 99 }));
export const ITEMS = Object.freeze(Object.fromEntries([...equipment, ...consumables, ...COSMETICS, ...GUILD_ITEMS,
  ...TELEPORT_OBJECTS.map((object, index) => ({ id: `substitution_${object.id}`, name: `${object.name} de sustitución`, description: "Objeto que dejas al sustituirte. No se consume al usarlo.", price: [0, 80, 110][index], category: "substitution", kind: "cosmetic", cosmeticSlot: "teleportObject", value: object.id, image: object.file, stackLimit: 1 })),
  ...CONTRACT_MISSIONS.map(mission => ({ id: mission.contractItem, name: `Contrato: ${mission.title}`, description: `Se juega desde el tablón. Nivel recomendado ${mission.recommendedLevel}. Recompensa: ${mission.rewardLabel}.`, price: mission.contractPrice, category: "contracts", kind: "contract", missionId: mission.id, stackLimit: 1 })),
  { id: "retry_scroll", name: "Pergamino de reintento", description: "Repite el duelo perdido después de agotar los dos reintentos gratuitos.", price: 90, category: "scrolls", kind: "retry", stackLimit: 99 },
  { id: "affinity_scroll", name: "Pergamino de afinidad", description: "Desbloquea una tercera afinidad a elección. Requiere Guardián, nivel 10 y dos afinidades activas.", price: 600, category: "scrolls", kind: "affinity", stackLimit: 1 }
].map(item => [item.id, Object.freeze(item)])));
export const ITEM_CATEGORIES = Object.freeze({ all: "Todos", weapons: "Armas", seals: "Sellos", accessories: "Accesorios", appearance: "Apariencia", substitution: "Sustitución", consumables: "Consumibles", scrolls: "Pergaminos", contracts: "Misiones", decorations: "Decoraciones" });
export const SHOP_ITEMS = Object.freeze(Object.values(ITEMS).filter(item => (item.price > 0 || item.kind === "decoration") && item.purchasable !== false));
export const sellPrice = item => Number.isFinite(item?.price) ? Math.floor(item.price / 2) : 0;
