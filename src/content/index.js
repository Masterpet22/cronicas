import { dialogues as dialogue0 } from "./sagas/futuro-prometedor/m01-gato/dialogues.js";
import { dialogues as dialogue1 } from "./sagas/futuro-prometedor/s01-kagemori/dialogues.js";
import { dialogues as dialogue2 } from "./sagas/futuro-prometedor/m02-desfiladero/dialogues.js";
import { dialogues as dialogue3 } from "./sagas/futuro-prometedor/s02-medico/dialogues.js";
import { dialogues as dialogue4 } from "./sagas/futuro-prometedor/m03-umbral/dialogues.js";
import { dialogues as dialogue5 } from "./sagas/futuro-prometedor/m04-corazon/dialogues.js";
import { dialogues as dialogue6 } from "./sagas/futuro-prometedor/m05-raizen/dialogues.js";
import { STORY_SAGAS, MISSIONS, SECONDARY_MISSIONS as LEGACY_SECONDARY_MISSIONS } from "./sagas/futuro-prometedor/saga.js";

import { CONTRACT_MISSIONS, CONTRACT_DIALOGUES } from "./store-contracts.js?v=0.114.0";
export { STORY_SAGAS, MISSIONS };
export const SECONDARY_MISSIONS = Object.freeze([...LEGACY_SECONDARY_MISSIONS, ...CONTRACT_MISSIONS]);
export const ALL_MISSIONS = Object.freeze([...MISSIONS, ...SECONDARY_MISSIONS]);
export const MISSION_DIALOGUES = Object.freeze(Object.assign({}, dialogue0, dialogue1, dialogue2, dialogue3, dialogue4, dialogue5, dialogue6, CONTRACT_DIALOGUES));
