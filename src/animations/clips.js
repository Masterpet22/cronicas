export const ANIMATION_STATES = Object.freeze({
  IDLE: "idle",
  LOCOMOTION: "locomotion",
  ACTION: "action",
  HIT: "hit",
  DEFEATED: "defeated"
});

export const ANIMATION_PRIORITIES = Object.freeze({
  [ANIMATION_STATES.IDLE]: 10,
  [ANIMATION_STATES.LOCOMOTION]: 20,
  [ANIMATION_STATES.ACTION]: 30,
  [ANIMATION_STATES.HIT]: 40,
  [ANIMATION_STATES.DEFEATED]: 50
});

// Un clip solo describe intención y movimiento. El controlador de Phaser y el
// laboratorio HTML actúan como adaptadores y consumen estos mismos datos.
export const PUPPET_ANIMATION_CLIPS = Object.freeze({
  "idle-natural": Object.freeze({
    id: "idle-natural",
    label: "Respiración natural",
    description: "Respiración suave con el peso fijo en los pies.",
    category: "reposo",
    state: ANIMATION_STATES.IDLE,
    status: "integrated",
    loop: true,
    tracks: Object.freeze([
      { target: "torso", duration: 1550, yoyo: true, ease: "Sine.inOut", to: { y: -4, scaleY: 0.008 } },
      { target: "neck", duration: 1550, yoyo: true, ease: "Sine.inOut", to: { y: -4 } },
      { target: "shoulderLeft", duration: 1550, yoyo: true, ease: "Sine.inOut", to: { y: -2.5 } },
      { target: "shoulderRight", duration: 1550, yoyo: true, ease: "Sine.inOut", to: { y: -2.5 } },
      { target: "neck", duration: 3100, delay: 420, yoyo: true, ease: "Sine.inOut", to: { angle: 0.8 } }
    ])
  }),
  "idle-alert": Object.freeze({
    id: "idle-alert",
    label: "Reposo alerta",
    description: "Respiración corta y mirada atenta antes de actuar.",
    category: "reposo",
    state: ANIMATION_STATES.IDLE,
    status: "integrated",
    loop: true,
    tracks: Object.freeze([
      { target: "torso", duration: 980, yoyo: true, ease: "Sine.inOut", to: { y: -2.4, scaleY: 0.005 } },
      { target: "neck", duration: 980, yoyo: true, ease: "Sine.inOut", to: { y: -2.4 } },
      { target: "shoulderLeft", duration: 980, yoyo: true, ease: "Sine.inOut", to: { y: -1.6 } },
      { target: "shoulderRight", duration: 980, yoyo: true, ease: "Sine.inOut", to: { y: -1.6 } },
      { target: "neck", duration: 1850, delay: 220, yoyo: true, ease: "Sine.inOut", to: { angle: -1.4 } }
    ])
  }),
  "idle-focus": Object.freeze({
    id: "idle-focus",
    label: "Reposo concentrado",
    description: "Movimiento lento y contenido para diálogos o espera.",
    category: "reposo",
    state: ANIMATION_STATES.IDLE,
    status: "integrated",
    loop: true,
    tracks: Object.freeze([
      { target: "torso", duration: 2200, yoyo: true, ease: "Sine.inOut", to: { y: -2.5, scaleY: 0.005 } },
      { target: "neck", duration: 2200, yoyo: true, ease: "Sine.inOut", to: { y: -2.5, angle: 0.45 } },
      { target: "shoulderLeft", duration: 2200, yoyo: true, ease: "Sine.inOut", to: { y: -1.4 } },
      { target: "shoulderRight", duration: 2200, yoyo: true, ease: "Sine.inOut", to: { y: -1.4 } }
    ])
  }),
  "guard-hold": Object.freeze({
    id: "guard-hold",
    label: "Guardia sostenida",
    description: "Cubre rostro y torso mientras mantiene ambos pies firmes.",
    category: "defensa",
    state: ANIMATION_STATES.ACTION,
    status: "integrated",
    loop: true,
    enterDuration: 180,
    tracks: Object.freeze([
      { target: "shoulderLeft", duration: 1150, yoyo: true, ease: "Sine.inOut", from: { angle: -62 }, to: { angle: -59 } },
      { target: "elbowLeft", duration: 1150, yoyo: true, ease: "Sine.inOut", from: { angle: -70 }, to: { angle: -67 } },
      { target: "wristLeft", duration: 1150, yoyo: true, ease: "Sine.inOut", from: { angle: -8 }, to: { angle: -5 } },
      { target: "shoulderRight", duration: 1150, yoyo: true, ease: "Sine.inOut", from: { angle: 48 }, to: { angle: 51 } },
      { target: "elbowRight", duration: 1150, yoyo: true, ease: "Sine.inOut", from: { angle: 105 }, to: { angle: 108 } },
      { target: "wristRight", duration: 1150, yoyo: true, ease: "Sine.inOut", from: { angle: 7 }, to: { angle: 4 } },
      { target: "rig", duration: 1150, yoyo: true, ease: "Sine.inOut", from: { x: -2, angle: -1 }, to: { x: -1, angle: -0.4 } }
    ])
  }),
  "guard-impact": Object.freeze({
    id: "guard-impact",
    label: "Impacto bloqueado",
    description: "La guardia absorbe el golpe y retrocede sin perder la postura.",
    category: "defensa",
    state: ANIMATION_STATES.HIT,
    status: "integrated",
    loop: false,
    tracks: Object.freeze([
      { target: "shoulderLeft", duration: 115, yoyo: true, ease: "Quad.out", from: { angle: -62 }, to: { angle: -69 } },
      { target: "elbowLeft", duration: 115, yoyo: true, ease: "Quad.out", from: { angle: -70 }, to: { angle: -77 } },
      { target: "shoulderRight", duration: 115, yoyo: true, ease: "Quad.out", from: { angle: 48 }, to: { angle: 55 } },
      { target: "elbowRight", duration: 115, yoyo: true, ease: "Quad.out", from: { angle: 105 }, to: { angle: 112 } },
      { target: "rig", duration: 115, yoyo: true, ease: "Quad.out", from: { x: -2, angle: -1 }, to: { x: -15, angle: -3.5 } }
    ])
  }),
  "hit-light": Object.freeze({
    id: "hit-light",
    label: "Daño leve",
    description: "Retroceso corto del torso y la cabeza ante un impacto común.",
    category: "reacción",
    state: ANIMATION_STATES.HIT,
    status: "integrated",
    loop: false,
    tracks: Object.freeze([
      { target: "rig", duration: 125, yoyo: true, ease: "Quad.out", to: { x: -13, angle: -3 } },
      { target: "neck", duration: 105, yoyo: true, ease: "Quad.out", to: { angle: -6 } },
      { target: "shoulderLeft", duration: 125, yoyo: true, ease: "Quad.out", to: { angle: 8 } },
      { target: "shoulderRight", duration: 125, yoyo: true, ease: "Quad.out", to: { angle: 8 } }
    ])
  }),
  "hit-heavy": Object.freeze({
    id: "hit-heavy",
    label: "Daño fuerte",
    description: "El cuerpo entero cede y flexiona las piernas ante un golpe potente.",
    category: "reacción",
    state: ANIMATION_STATES.HIT,
    status: "integrated",
    loop: false,
    tracks: Object.freeze([
      { target: "rig", duration: 165, yoyo: true, ease: "Cubic.out", to: { x: -27, y: 7, angle: -7 } },
      { target: "neck", duration: 125, yoyo: true, ease: "Quad.out", to: { angle: -11 } },
      { target: "shoulderLeft", duration: 150, yoyo: true, ease: "Quad.out", to: { angle: 15 } },
      { target: "shoulderRight", duration: 150, yoyo: true, ease: "Quad.out", to: { angle: 13 } },
      { target: "hipLeft", duration: 165, yoyo: true, ease: "Cubic.out", to: { angle: -7 } },
      { target: "hipRight", duration: 165, yoyo: true, ease: "Cubic.out", to: { angle: 9 } },
      { target: "kneeLeft", duration: 165, yoyo: true, ease: "Cubic.out", to: { angle: 13 } },
      { target: "kneeRight", duration: 165, yoyo: true, ease: "Cubic.out", to: { angle: 16 } }
    ])
  })
});

export const DEFAULT_IDLE_CLIP = "idle-natural";

export function animationClipList(category = null) {
  return Object.values(PUPPET_ANIMATION_CLIPS).filter((clip) => !category || clip.category === category);
}
