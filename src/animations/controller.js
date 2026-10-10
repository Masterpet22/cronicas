import { ANIMATION_PRIORITIES, PUPPET_ANIMATION_CLIPS } from "./clips.js?v=0.38.0";

const TRANSFORM_PROPERTIES = ["x", "y", "angle", "scaleX", "scaleY", "alpha"];

function targetFor(fighter, name) {
  if (name === "torso") return fighter.sprite;
  if (name === "body" || name === "rig" || name === "shadow") return fighter[name];
  return fighter.joints?.[name] || null;
}

function snapshot(target) {
  return Object.fromEntries(TRANSFORM_PROPERTIES.map((property) => [property, Number(target?.[property] ?? (property.startsWith("scale") || property === "alpha" ? 1 : 0))]));
}

function addOffsets(base, offsets = {}) {
  return Object.fromEntries(Object.entries(offsets).map(([property, value]) => [property, base[property] + value]));
}

export class PuppetAnimationController {
  constructor(scene, fighter, clips = PUPPET_ANIMATION_CLIPS) {
    this.scene = scene;
    this.fighter = fighter;
    this.clips = clips;
    this.current = null;
    this.tweens = [];
    this.touched = new Map();
  }

  get state() { return this.current?.state || null; }
  get clipId() { return this.current?.id || null; }

  canPlay(clip) {
    if (!this.current) return true;
    return ANIMATION_PRIORITIES[clip.state] >= ANIMATION_PRIORITIES[this.current.state];
  }

  play(id, { force = false, timeScale = 1 } = {}) {
    const clip = this.clips[id];
    if (!clip) throw new Error(`Clip de animación desconocido: ${id}`);
    if (this.current?.id === id) return true;
    if (!force && !this.canPlay(clip)) return false;
    this.stop({ reset: true });
    this.current = clip;

    for (const track of clip.tracks) {
      const target = targetFor(this.fighter, track.target);
      if (!target) continue;
      const base = snapshot(target);
      this.touched.set(target, base);
      if (track.from) Object.assign(target, addOffsets(base, track.from));
      const tween = this.scene.tweens.add({
        targets: target,
        ...addOffsets(base, track.to),
        duration: Math.max(1, track.duration / timeScale),
        delay: (track.delay || 0) / timeScale,
        ease: track.ease || "Sine.inOut",
        yoyo: Boolean(track.yoyo),
        repeat: clip.loop ? -1 : 0
      });
      this.tweens.push(tween);
    }
    return true;
  }

  loop(id, options) { return this.play(id, options); }

  stop({ reset = true } = {}) {
    this.tweens.forEach((tween) => tween?.stop());
    this.tweens = [];
    if (reset) this.touched.forEach((base, target) => Object.assign(target, base));
    this.touched.clear();
    this.current = null;
  }
}

export function createPuppetAnimationController(scene, fighter) {
  return new PuppetAnimationController(scene, fighter);
}
