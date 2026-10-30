import { MAN_SPRITE_JOINTS } from "../character-rigs.js";

export const PUPPET_JOINTS = MAN_SPRITE_JOINTS;

export const PUPPET_JOINT_PARENTS = Object.freeze({
  neck: null,
  shoulderRight: null,
  elbowRight: "shoulderRight",
  wristRight: "elbowRight",
  shoulderLeft: null,
  elbowLeft: "shoulderLeft",
  wristLeft: "elbowLeft",
  hipRight: null,
  kneeRight: "hipRight",
  ankleRight: "kneeRight",
  hipLeft: null,
  kneeLeft: "hipLeft",
  ankleLeft: "kneeLeft"
});

export const PUPPET_PART_JOINTS = Object.freeze({
  cabeza: "neck",
  brazo_derecho: "shoulderRight",
  antebrazo_derecho: "elbowRight",
  mano_derecha: "wristRight",
  brazo_izquierdo: "shoulderLeft",
  antebrazo_izquierdo: "elbowLeft",
  mano_izquierda: "wristLeft",
  muslo_derecho: "hipRight",
  pierna_derecha: "kneeRight",
  pie_derecho: "ankleRight",
  muslo_izquierdo: "hipLeft",
  pierna_izquierda: "kneeLeft",
  pie_izquierdo: "ankleLeft"
});

export const PUPPET_TARGETS = Object.freeze([
  "body", "rig", "shadow", "torso", ...Object.keys(PUPPET_JOINTS)
]);
