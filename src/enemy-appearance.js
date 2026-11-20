// Visual identity only: these definitions never feed damage, AI or progression.
const uniforms = {
  bandits: { cloth: '#626445', trim: '#af8154' },
  crow: { cloth: '#554359', trim: '#a78c70' },
  kurogane: { cloth: '#71343c', trim: '#b6a188' },
  reeds: { cloth: '#426e55', trim: '#b6a36f' },
  stone: { cloth: '#6c695b', trim: '#aea393' },
  ash: { cloth: '#884936', trim: '#d3a36d' },
  venom: { cloth: '#666286', trim: '#c4b8d4' }
};
const look = (faction, bodyType, skinTone, hair, face = 1, commander = null) => Object.freeze({
  bodyType, skinTone, hair, face,
  uniform: Object.freeze({ id: faction, style: commander ? 'commander' : 'troop', ...uniforms[faction], ...commander })
});

export const ENEMY_APPEARANCES = Object.freeze({
  tutorial_bandit: look('bandits', 'male', 'canela', 1, 2),
  tutorial_bandit_second: look('bandits', 'female', 'claro', 4),
  bandit_pathfinder: look('bandits', 'female', 'oscuro', 1),
  bandit_lieutenant: look('crow', 'male', 'oliva', 0, 2),
  boss_varek: look('bandits', 'male', 'claro', 0, 2, { cloth: '#803f30', trim: '#c8a26a' }),
  boss_akumori: look('crow', 'male', 'moreno', 4, 2, { cloth: '#49405e', trim: '#b99b78' }),
  boss_raizen: look('crow', 'male', 'oliva', 1, 2, { cloth: '#3d243e', trim: '#dcc58b' }),
  gate_guard: look('crow', 'female', 'canela', 4),
  ash_adept: look('ash', 'female', 'medio', 1, 2),
  reed_bandit: look('reeds', 'male', 'ebano', 4),
  stone_hunter: look('stone', 'male', 'claro', 0, 2),
  venom_medic: look('venom', 'female', 'muy-claro', 4),
  kurogane_scout: look('kurogane', 'female', 'oliva', 4, 2),
  kurogane_raider: look('kurogane', 'male', 'moreno', 1, 2),
  kurogane_sentry: look('kurogane', 'female', 'claro', 0),
  kurogane_renji: look('kurogane', 'male', 'medio', 4, 1, { cloth: '#2c445c', trim: '#b9c8cb' }),
  kurogane_tatsu: look('kurogane', 'male', 'claro', 1, 2, { cloth: '#842f34', trim: '#d1a26a' })
});

export function uniformTextureSuffix(uniform) {
  return uniform ? `${uniform.style}-${uniform.id}-${uniform.cloth.replace('#', '')}-${uniform.trim.replace('#', '')}` : '';
}

// Keep the ink and neutral metal. The source cloth is blue-grey and trim warm tan.
export function colorizeUniformPixels(pixels, uniform) {
  const rgb = hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  const cloth = rgb(uniform.cloth), trim = rgb(uniform.trim);
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    const [r, g, b] = pixels.subarray(i, i + 3);
    if (Math.max(r, g, b) < 24) continue;
    const palette = b > r * 1.045 && b >= g ? cloth : r > g * 1.08 && r > b * 1.2 ? trim : null;
    if (!palette) continue;
    const light = (r * .2126 + g * .7152 + b * .0722) / (palette === cloth ? 85 : 120);
    for (let c = 0; c < 3; c++) pixels[i + c] = Math.min(255, Math.round(palette[c] * light));
  }
  return pixels;
}
