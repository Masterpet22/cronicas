import assert from "node:assert/strict";
import { RENDER_PROFILES, calculateRenderResolution, configureRenderResolution, selectRenderProfile } from "../src/battle/render-resolution.js";

assert.equal(selectRenderProfile({ deviceMemory: 2, hardwareConcurrency: 8 }).id, "economy");
assert.equal(selectRenderProfile({ deviceMemory: 8, hardwareConcurrency: 2 }).id, "economy");
assert.equal(selectRenderProfile({ deviceMemory: 4, hardwareConcurrency: 12 }).id, "low");
assert.equal(selectRenderProfile({ deviceMemory: 16, hardwareConcurrency: 4 }).id, "low");
assert.equal(selectRenderProfile({ deviceMemory: 8, hardwareConcurrency: 8 }).id, "high");
assert.equal(selectRenderProfile({}).id, "balanced", "Las capacidades ocultas deben usar un límite conservador");

const highDprLowDevice = calculateRenderResolution({ width: 1920, height: 1080, devicePixelRatio: 3, profile: RENDER_PROFILES.low });
assert.deepEqual({ width: highDprLowDevice.width, height: highDprLowDevice.height, scale: highDprLowDevice.scale }, { width: 1200, height: 675, scale: 1.25 });
assert.ok(highDprLowDevice.width * highDprLowDevice.height <= RENDER_PROFILES.low.maxPixels);

const nativeLogical = calculateRenderResolution({ width: 960, height: 540, devicePixelRatio: 1, profile: RENDER_PROFILES.high });
assert.deepEqual({ width: nativeLogical.width, height: nativeLogical.height, scale: nativeLogical.scale }, { width: 960, height: 540, scale: 1 });

const runtime = {};
const configured = configureRenderResolution({ getBoundingClientRect: () => ({ width: 1600, height: 900 }) }, runtime, {
  devicePixelRatio: 2,
  navigator: { deviceMemory: 8, hardwareConcurrency: 8 }
});
assert.equal(configured.profile.id, "high");
assert.deepEqual({ width: configured.width, height: configured.height, scale: configured.scale }, { width: 1920, height: 1080, scale: 2 });
assert.equal(runtime.renderResolution, 2);
assert.equal(runtime.textTextureResolution, 2);
assert.equal(runtime.renderProfile.id, "high");

console.log("Perfiles adaptativos de resolución verificados.");
