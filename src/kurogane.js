import { KUROGANE_PREREQUISITE, KUROGANE_FINALE, GUILD_GIFT_NOTICE } from "./content/sagas/hermanos-kurogane/saga.js";
import { FIRST_SAGA_CONCLUSION } from "./content/sagas/futuro-prometedor/m05-raizen/dialogues.js";
import { guildItemId } from "./guild-catalog.js?v=0.126.0";

export const COMPANIONS = Object.freeze({
  haruto: { id: "haruto", name: "Haruto Kazehara", affinity: "viento", role: "Ofensiva y velocidad", technique: "Corte de Vendaval", cost: 14, color: 0x9ad477 },
  akari: { id: "akari", name: "Akari Mizunose", affinity: "agua", role: "Apoyo y control", technique: "Barrera de Agua", cost: 16, color: 0x75c9ef }
});
export const kuroganeAvailable = save => save?.campaign?.completedMissions?.includes(KUROGANE_PREREQUISITE) || false;
export const kuroganeCompleted = save => save?.campaign?.completedMissions?.includes(KUROGANE_FINALE) || false;
export const kuroganeProloguePending = save => kuroganeAvailable(save) && !save.campaign.kuroganePrologueCompleted;
export const FIRST_SAGA_CONCLUSION_NOTICE = FIRST_SAGA_CONCLUSION.noticeId;
export function firstSagaConclusion(save, master) {
  if (!kuroganeProloguePending(save) || save.campaign.kuroganeCompanion
    || save.campaign.seenMissionNotices?.includes(FIRST_SAGA_CONCLUSION_NOTICE)) return [];
  return [[master.name, FIRST_SAGA_CONCLUSION.advice[master.id]],
    ...FIRST_SAGA_CONCLUSION.lines.map(line => [line.speaker === "master" ? master.name : "Ren Arashiro", line.text])];
}
export function chooseCompanion(save, id) {
  if (!COMPANIONS[id] || !kuroganeAvailable(save) || !save.campaign.kuroganePrologueCompleted
    || save.campaign.kuroganeCompanion && !kuroganeCompleted(save)) return save;
  return { ...save, campaign: { ...save.campaign, kuroganeCompanion: id } };
}
export function grantKuroganeGifts(save) {
  if (!kuroganeAvailable(save)) return save;
  const missingGift = ["plant", "novice"].some(type => !(save.inventory.items[guildItemId("decor", type)] > 0));
  if (save.campaign.kuroganeGiftsGranted && (!missingGift || !guildGiftDeliveryPending(save))) return save;
  const items = { ...save.inventory.items };
  for (const type of ["plant", "novice"]) {
    const id = guildItemId("decor", type);
    items[id] = Math.max(1, items[id] || 0);
  }
  return { ...save, inventory: { ...save.inventory, items }, campaign: { ...save.campaign, kuroganeGiftsGranted: true } };
}
export const guildGiftDeliveryPending = save => kuroganeProloguePending(save) && !save.campaign.seenMissionNotices?.includes(GUILD_GIFT_NOTICE);
export function receiveGuildGifts(save) {
  if (!guildGiftDeliveryPending(save)) return save;
  const received = grantKuroganeGifts(save);
  return { ...received, campaign: { ...received.campaign, seenMissionNotices: [...new Set([...(received.campaign.seenMissionNotices || []), GUILD_GIFT_NOTICE])] } };
}
export function finishKuroganePrologue(save) {
  if (!kuroganeAvailable(save) || !save.campaign.kuroganeGiftsGranted || guildGiftDeliveryPending(save)
    || !["plant", "novice"].every(type => save.guild.room.decorations.some(entry => entry.type === type))) return save;
  return { ...save, campaign: { ...save.campaign, kuroganePrologueCompleted: true } };
}
export function recordKuroganeDecoration(save, action) {
  if (!save.campaign.kuroganeGiftsGranted || save.campaign.kuroganePrologueCompleted
    || !["add", "move", "scale"].includes(action.type)) return save;
  const type = action.type === "add" ? action.item : save.guild.room.decorations.find(entry => entry.id === action.id)?.type;
  if (!["plant", "novice"].includes(type)) return save;
  return { ...save, campaign: { ...save.campaign, kuroganeRoomLessons: [...new Set([...(save.campaign.kuroganeRoomLessons || []), type])] } };
}
export function companionDecision(id, ally, player, targets, objective = null) {
  const living = targets.map((target, index) => ({ ...target, index })).filter(t => t.state.hp > 0);
  if (ally.hp <= 0 || !living.length) return null;
  if (id === "akari" && ally.chakra >= COMPANIONS.akari.cost
    && (player.hp < player.maxHp * .55 || objective && objective.hp < objective.maxHp * .75)) return { type: "barrier", cost: 16 };
  const target = living.sort((a, b) => a.state.hp - b.state.hp || a.index - b.index)[0];
  return { type: ally.chakra >= 14 ? "technique" : "strike", cost: ally.chakra >= 14 ? 14 : 0, target: target.index };
}
