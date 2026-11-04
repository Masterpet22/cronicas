import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { suspendPauseRendering } from "../src/battle/pause-rendering.js";

globalThis.document = new EventTarget();
let renders = 0, updates = 0;
const originalStep = () => renders++;
const game = { loop: { callback: originalStep }, headlessStep() { updates++; }, scale: new EventEmitter(), renderer: new EventEmitter() };
const scene = () => ({ game, events: new EventEmitter() });
const parentScene = scene(), childScene = scene();
const first = suspendPauseRendering(parentScene);
game.loop.callback(0, 16); game.loop.callback(16, 16); game.loop.callback(32, 16);
assert.equal(renders, 1); assert.equal(updates, 2);
const second = suspendPauseRendering(childScene);
game.loop.callback(48, 16); game.loop.callback(64, 16);
assert.equal(renders, 2); assert.equal(updates, 3);
first.dispose(); // El padre puede terminar antes que el menú hijo.
game.loop.callback(80, 16); game.loop.callback(96, 16);
assert.equal(renders, 3); assert.equal(updates, 4);
game.scale.emit("resize"); game.loop.callback(112, 16); game.loop.callback(128, 16);
assert.equal(renders, 4); assert.equal(updates, 5);
second.dispose(); assert.equal(game.loop.callback, originalStep);
assert.equal(game.scale.listenerCount("resize"), 0);
assert.equal(game.renderer.listenerCount("restorewebgl"), 0);
const closing = suspendPauseRendering(parentScene);
parentScene.events.emit("shutdown"); closing.dispose();
assert.equal(game.loop.callback, originalStep);
delete globalThis.document;
console.log("Renderizado en espera: un frame inicial, invalidación, menús anidados y limpieza verificados.");
