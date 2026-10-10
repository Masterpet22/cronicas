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
  })
});

export const DEFAULT_IDLE_CLIP = "idle-natural";

export function animationClipList(category = null) {
  return Object.values(PUPPET_ANIMATION_CLIPS).filter((clip) => !category || clip.category === category);
}
