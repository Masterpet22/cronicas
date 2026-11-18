import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { isSceneActive, pauseSceneIfActive, resumeSceneIfPaused, stopSceneIfRunning } from "../src/battle/scene-lifecycle.js";
import { acquireEffect } from "../src/battle/effect-pool.js";

function scenePlugin(initial = {}) {
  const state = { active: false, paused: false, sleeping: false, ...initial };
  const calls = [];
  return {
    calls,
    state,
    isActive: () => state.active,
    isPaused: () => state.paused,
    isSleeping: () => state.sleeping,
    pause: () => { calls.push("pause"); state.active = false; state.paused = true; },
    resume: () => { calls.push("resume"); state.paused = false; state.active = true; },
    stop: () => { calls.push("stop"); state.active = false; state.paused = false; state.sleeping = false; }
  };
}

const inactive = scenePlugin();
assert.equal(isSceneActive(inactive), false);
assert.equal(pauseSceneIfActive(inactive), false);
assert.equal(resumeSceneIfPaused(inactive), false);
assert.equal(stopSceneIfRunning(inactive), false);
assert.deepEqual(inactive.calls, [], "Una escena detenida no debe recibir órdenes de ciclo de vida");

const active = scenePlugin({ active: true });
assert.equal(isSceneActive(active), true);
assert.equal(pauseSceneIfActive(active), true);
assert.deepEqual(active.calls, ["pause"]);
assert.equal(pauseSceneIfActive(active), false, "Una escena ya pausada no debe pausarse otra vez");
assert.equal(resumeSceneIfPaused(active), true);
assert.deepEqual(active.calls, ["pause", "resume"]);

const sleeping = scenePlugin({ sleeping: true });
assert.equal(stopSceneIfRunning(sleeping), true);
assert.deepEqual(sleeping.calls, ["stop"]);

const scene = { events: new EventEmitter() };
const makeEffect = () => [{
  scene,
  setActive(active) { this.active = active; return this; },
  setVisible(visible) { this.visible = visible; return this; },
  addToDisplayList() { this.displayed = true; return this; },
  removeFromDisplayList() { this.displayed = false; return this; },
  destroy() { this.scene = null; }
}];
const first = acquireEffect(scene, "impact", makeEffect);
const parallel = acquireEffect(scene, "impact", makeEffect);
assert.notEqual(first.objects[0], parallel.objects[0]);
first.release();
assert.equal(first.objects[0].displayed, false);
const reused = acquireEffect(scene, "impact", makeEffect);
assert.equal(reused.objects[0], first.objects[0]);
first.release();
assert.equal(reused.objects[0].active, true);
const overflow = Array.from({ length: 4 }, () => acquireEffect(scene, "impact", makeEffect));
parallel.release();
reused.release();
overflow.forEach(effect => effect.release());
assert.equal(overflow.filter(effect => effect.objects[0].scene === null).length, 2);
scene.events.emit("shutdown");
assert.ok([first, parallel, ...overflow].every(effect => effect.objects[0].scene === null));
assert.equal(scene.events.listenerCount("destroy"), 0);
const restarted = acquireEffect(scene, "impact", makeEffect);
assert.notEqual(restarted.objects[0], first.objects[0]);
scene.events.emit("destroy");
assert.equal(restarted.objects[0].scene, null);

console.log("Guardas de ciclo de vida de escenas verificadas.");
