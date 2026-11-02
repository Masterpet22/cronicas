import { ELEMENTS } from "../elements.js?v=0.20.0";
import { availableAffinitySlots } from "../affinity-system.js?v=0.114.0";
import { PHYSICAL_COLOR } from "./definitions.js?v=1.0.0";

export const LOCKED_SKILL_COLOR = "#707984";
const validHex = color => /^#[0-9a-f]{6}$/i.test(color || "");
const channels = color => [1,3,5].map(offset => parseInt(color.slice(offset,offset+2),16));
const hex = values => `#${values.map(value => Math.round(value).toString(16).padStart(2,"0")).join("")}`;

// Equal RGB contribution: pure red + pure blue is purple (#800080).
export function mixSkillColors(first,second) {
  if (!validHex(first) || !validHex(second)) return LOCKED_SKILL_COLOR;
  const a=channels(first), b=channels(second);
  return hex(a.map((value,index) => (value+b[index])/2));
}

export function affinitySlotColor(save,slot) {
  const capacity=availableAffinitySlots(save?.progression?.level,save?.campaign?.elementRank,
    save?.inventory?.extraAffinityUnlocked,save?.campaign?.rank);
  const element=ELEMENTS[save?.character?.affinities?.[slot]];
  return Number.isInteger(slot) && slot>=0 && slot<capacity && element
    ? `#${element.color.toString(16).padStart(6,"0")}` : LOCKED_SKILL_COLOR;
}

export function skillRegionColor(save,cell) {
  if (cell.category === "physical") return PHYSICAL_COLOR;
  if (cell.category === "affinity") return affinitySlotColor(save,cell.slot);
  const [a,b]=cell.pair || [];
  const first=affinitySlotColor(save,a), second=affinitySlotColor(save,b);
  return first === LOCKED_SKILL_COLOR || second === LOCKED_SKILL_COLOR
    ? LOCKED_SKILL_COLOR : mixSkillColors(first,second);
}

function luminance(color) {
  const linear=channels(color).map(value => value/255<=.04045 ? value/255/12.92 : ((value/255+.055)/1.055)**2.4);
  return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
}

export function characterCoreColors(character) {
  const fill=validHex(character?.appearance) ? character.appearance.toLowerCase() : "#e8edf5";
  const dark="#171b15", light="#f5f3eb", level=luminance(fill);
  const contrast = ink => (Math.max(level,luminance(ink))+.05)/(Math.min(level,luminance(ink))+.05);
  return { fill,ink:contrast(dark)>=contrast(light) ? dark : light };
}
