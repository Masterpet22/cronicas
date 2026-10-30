import { getDialogue } from "./dialogues.js?v=0.114.0";

const npc = (id, name, title, image) => Object.freeze({
  id, name, title, image,
  dialogue: Object.freeze({ intro: `npc.${id}.intro`, guide: `npc.${id}.guide` })
});

export const NPCS = Object.freeze({
  ren: npc("ren", "Ren Arashiro", "Jefe de la Aldea", "assets/npcs/ren-arashiro.webp"),
  kureha: npc("kureha", "Kureha Tsukikage", "Guía de la Torre", "assets/npcs/kureha-tsukikage.webp"),
  sayo: npc("sayo", "Sayo Kisaragi", "Archivera Mayor", "assets/npcs/sayo-kisaragi.webp"),
  daichi: npc("daichi", "Daichi Kazan", "Maestro del Dojo", "assets/npcs/daichi-kazan.webp"),
  mei: npc("mei", "Mei Hayate", "Instructora de Técnicas", "assets/npcs/mei-hayate.webp"),
  goro: npc("goro", "Goro Tetsugan", "Campeón de la Arena", "assets/npcs/goro-tetsugan.webp"),
  hana: npc("hana", "Hana Kogane", "Mercader de Suministros", "assets/npcs/hana-kogane.webp"),
  yuna: npc("yuna", "Yuna Ametsuki", "Anfitriona del Gremio", "assets/npcs/yuna-ametsuki.webp"),
  riku: npc("riku", "Riku Senda", "Coordinador de Misiones", "assets/npcs/riku-senda.webp"),
  nao: npc("nao", "Nao Matsuri", "Maestre de Festivales", "assets/npcs/nao-matsuri.webp"),
  iori: npc("iori", "Iori Kagemori", "Anciano de Kagemori", "assets/npcs/iori-kagemori.webp"),
  nami: npc("nami", "Nami Kurose", "Exploradora de Kagemori", "assets/npcs/nami-kurose.webp")
});

export const LOCATION_CAST = Object.freeze({
  headquarters: ["ren"],
  dojo: ["daichi", "mei"],
  archive: ["sayo"],
  shop: ["hana"],
  tower: ["kureha"],
  arena: ["goro"],
  inn: ["yuna"],
  missions: ["riku"],
  event: ["nao"],
  kagemori: ["iori", "nami"]
});

export function locationDialogue(locationId, type = "intro", options = {}) {
  return (LOCATION_CAST[locationId] || []).flatMap((id) => {
    const character = NPCS[id];
    return getDialogue(character?.dialogue?.[type], {
      ...options,
      placement: options.placement || { surface: `location-${type}`, owner: id }
    }).map((line) => [NPCS[line.speaker]?.name || character.name, line.text]);
  });
}

export function npcByName(name) {
  return Object.values(NPCS).find((character) => character.name === name) || null;
}

export function npcName(id) {
  return NPCS[id]?.name || id;
}
