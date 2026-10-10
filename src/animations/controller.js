import { ANIMATION_PRIORITIES, PUPPET_ANIMATION_CLIPS } from "./clips.js?v=0.40.0";

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
    this.finished = Promise.resolve(true);
    this.resolveFinished = null;
    this.generation = 0;
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
    const generation = this.generation;
    const playableTracks = clip.tracks.map((track) => ({ track, target: targetFor(this.fighter, track.target) })).filter(({ target }) => target);
    let remaining = playableTracks.length;
    this.finished = new Promise((resolve) => { this.resolveFinished = resolve; });

    for (const { track, target } of playableTracks) {
      const base = this.touched.get(target) || snapshot(target);
      this.touched.set(target, base);
      const enterDuration = track.from ? Number(clip.enterDuration || 0) : 0;
      if (track.from && !enterDuration) Object.assign(target, addOffsets(base, track.from));
      if (track.from && enterDuration) {
        this.tweens.push(this.scene.tweens.add({
          targets: target,
          ...addOffsets(base, track.from),
          duration: Math.max(1, enterDuration / timeScale),
          ease: "Cubic.out"
        }));
      }
      const tween = this.scene.tweens.add({
        targets: target,
        ...addOffsets(base, track.to),
        duration: Math.max(1, track.duration / timeScale),
        delay: ((track.delay || 0) + enterDuration) / timeScale,
        ease: track.ease || "Sine.inOut",
        yoyo: Boolean(track.yoyo),
        repeat: clip.loop ? -1 : 0,
        onComplete: clip.loop ? undefined : () => {
          remaining -= 1;
          if (remaining === 0 && generation === this.generation) this.complete();
        }
      });
      this.tweens.push(tween);
    }
    if (remaining === 0) this.complete();
    return true;
  }

  loop(id, options) { return this.play(id, options); }

  async playOnce(id, options) {
    if (!this.play(id, options)) return false;
    return this.finished;
  }

  complete() {
    const resolve = this.resolveFinished;
    this.tweens = [];
    this.touched.forEach((base, target) => Object.assign(target, base));
    this.touched.clear();
    this.current = null;
    this.resolveFinished = null;
    resolve?.(true);
  }

  stop({ reset = true } = {}) {
    this.generation += 1;
    this.tweens.forEach((tween) => tween?.stop());
    this.tweens = [];
    if (reset) this.touched.forEach((base, target) => Object.assign(target, base));
    this.touched.clear();
    this.current = null;
    this.resolveFinished?.(false);
    this.resolveFinished = null;
  }
}

export function createPuppetAnimationController(scene, fighter) {
  return new PuppetAnimationController(scene, fighter);
}
