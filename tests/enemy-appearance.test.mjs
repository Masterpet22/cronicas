import assert from 'node:assert/strict';
import { ENEMY_ROSTER } from '../src/data.js';
import { ENEMY_APPEARANCES, colorizeUniformPixels, uniformTextureSuffix } from '../src/enemy-appearance.js';
import { enemyFighterAppearance, playerFighterAppearance } from '../src/character.js';
import { fighterAtlasKey } from '../src/fighters.js';

assert.deepEqual(Object.keys(ENEMY_APPEARANCES).sort(), Object.keys(ENEMY_ROSTER).sort(), 'Cada rival tiene una identidad explícita');
const looks = Object.entries(ENEMY_ROSTER).map(([id, profile]) => enemyFighterAppearance(profile, id));
assert.ok(looks.filter(look => look.bodyType === 'female').length >= 6);
assert.ok(new Set(looks.map(look => look.skinTone)).size >= 6);
assert.deepEqual([...new Set(looks.map(look => look.hair))].sort(), [0, 1, 4]);
for (const [id, profile] of Object.entries(ENEMY_ROSTER)) {
  const look = enemyFighterAppearance(profile, id);
  assert.equal(look.uniform.style, profile.boss ? 'commander' : 'troop');
  assert.equal(fighterAtlasKey(look), fighterAtlasKey(enemyFighterAppearance({ ...profile, name: 'Copia de Dojo' }, id)));
  assert.match(look.uniform.cloth, /^#[0-9a-f]{6}$/);
  assert.match(look.uniform.trim, /^#[0-9a-f]{6}$/);
}
assert.equal(uniformTextureSuffix(looks[0].uniform), uniformTextureSuffix(looks[1].uniform), 'La tropa de una facción comparte uniforme');
const bosses = Object.values(ENEMY_ROSTER).filter(profile => profile.boss).map(profile => uniformTextureSuffix(enemyFighterAppearance(profile).uniform));
assert.equal(new Set(bosses).size, bosses.length, 'Cada jefe tiene una combinación propia');
const player = playerFighterAppearance({ character: { bodyType: 'male', skinTone: 'claro', appearance: '#123456' }, equipment: {} });
assert.equal(fighterAtlasKey(player), 'fighter-atlas-male-claro', 'La ropa del jugador conserva su atlas anterior');
const pixels = new Uint8ClampedArray([0,0,0,255, 44,51,64,255, 120,90,60,128, 70,70,70,255, 99,99,99,0]);
colorizeUniformPixels(pixels, looks[0].uniform);
assert.deepEqual([...pixels.slice(0,4)], [0,0,0,255]);
assert.notDeepEqual([...pixels.slice(4,7)], [44,51,64]);
assert.equal(pixels[11], 128, 'Los bordes conservan su transparencia');
assert.deepEqual([...pixels.slice(12)], [70,70,70,255, 99,99,99,0], 'Metal neutro y fondo intactos');
console.log('Identidades enemigas, uniformes por facción, jefes y aislamiento visual verificados.');
