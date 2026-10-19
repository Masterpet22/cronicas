export const MASTER_IDS = Object.freeze(["mei", "daichi"]);

export function assignedMasterId(bodyType) {
  return bodyType === "female" ? "daichi" : "mei";
}

export function masterIdForCharacter(character) {
  return MASTER_IDS.includes(character?.masterId) ? character.masterId : assignedMasterId(character?.bodyType);
}
