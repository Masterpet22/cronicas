import assert from "node:assert/strict";
import { isSceneActive, pauseSceneIfActive, resumeSceneIfPaused, stopSceneIfRunning } from "../src/battle/scene-lifecycle.js";

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

console.log("Guardas de ciclo de vida de escenas verificadas.");
