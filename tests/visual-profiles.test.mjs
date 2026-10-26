import assert from "node:assert/strict";
import { BATTLE_VISUAL_PROFILES, battleVisualProfile, validateBattleVisualProfiles } from "../src/battle/visual-profiles.js";

// runtime.js solo necesita este valor para exponer el catálogo real de arenas en Node.
globalThis.window = { Phaser: {} };
const { BATTLE_ARENAS } = await import("../src/battle/runtime.js");
delete globalThis.window;
assert.deepEqual(validateBattleVisualProfiles(BATTLE_ARENAS), []);
assert.deepEqual(BATTLE_ARENAS.map((arena) => battleVisualProfile(arena).id), ["dusk-pass", "mist-marsh", "moon-shrine"]);
assert.ok(Object.isFrozen(BATTLE_VISUAL_PROFILES["bg-marsh"].particles));
assert.throws(() => battleVisualProfile({ texture: "unknown" }), /Falta el perfil/);
const bad = structuredClone(BATTLE_VISUAL_PROFILES);
bad["bg-marsh"].cameraIntensity = NaN;
bad["bg-marsh"].fog.alpha = 2;
bad["bg-marsh"].particles.maxParticles = 300;
bad["bg-marsh"].particles.speedX = [8, -3];
bad["bg-moon"].id = bad["bg-marsh"].id;
assert.equal(validateBattleVisualProfiles(BATTLE_ARENAS, bad).length, 5);
bad["bg-moon"].grounding.scaleX = 0;
assert.ok(validateBattleVisualProfiles(BATTLE_ARENAS, bad).some((error) => error.includes("contacto con el suelo")));
delete bad["bg-moon"];
assert.ok(validateBattleVisualProfiles(BATTLE_ARENAS, bad).some((error) => error.includes("perfil ausente")));
console.log("Perfiles visuales declarativos de las tres arenas validados.");
