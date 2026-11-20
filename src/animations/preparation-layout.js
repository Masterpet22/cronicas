// Registro del dibujo compacto: cortes de muñeca en (380, 910) y (1150, 910).
export const PREPARATION_HAND_ART = Object.freeze({
  midpointX: 765 / 1536, midpointY: 910 / 1024, span: 770 / 1536,
  wristWidth: 340 / 1536, verticalScale: .88
});

export function preparationHandLayout(rig) {
  // Los pivotes distales difieren entre cuerpos. Estos registros hacen coincidir
  // el corte ilustrado con la sección visible del antebrazo en cada rig.
  const factor = rig.bodyType === "female" ? .5 : .64;
  const forearmWidth = (rig.byId.antebrazo_izquierdo.width + rig.byId.antebrazo_derecho.width) / 2 * factor;
  return { span: forearmWidth * PREPARATION_HAND_ART.span / PREPARATION_HAND_ART.wristWidth,
    wristY: rig.byId.torso.y - rig.byId.torso.height * .1 };
}
