const HAIR_COLORS = ["#302a35", "#4a2f3c", "#183d49", "#5b382c", "#202735"];
const WEAPON_MAP = { kunai: "kunai", tanto: "sword", staff: "staff" };

// Caja del SVG del combatiente. El punto (0, 0) es el centro del torso.
export const FIGHTER_VIEWBOX = { x: -115, y: -150, width: 230, height: 285 };

// Apariencia del jugador compartida por el Dojo y el combate.
export function playerFighterAppearance(save) {
  const character = save.character;
  return {
    ...character,
    weapon: save.equipment?.weapon === null ? "none" : WEAPON_MAP[save.equipment?.weapon] || "kunai",
    clothColor: character.appearance,
    accentColor: "#25344d"
  };
}

function clampVariant(value, max) {
  return Math.min(max, Math.max(1, Math.floor(Number(value) || 1)));
}

function colorHex(value, fallback) {
  if (typeof value === "number") return `#${value.toString(16).padStart(6, "0")}`;
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
}

export function resolveFighterAppearance(appearance = {}) {
  const hair = clampVariant(appearance.hair, 5);
  return {
    bodyType: appearance.bodyType === "female" ? "female" : "male",
    face: clampVariant(appearance.face, 3),
    hair,
    top: clampVariant(appearance.top, 3),
    bottom: clampVariant(appearance.bottom, 3),
    shoes: clampVariant(appearance.shoes, 2),
    weapon: ["kunai", "sword", "staff", "dagger", "none"].includes(appearance.weapon) ? appearance.weapon : "kunai",
    cloth: colorHex(appearance.clothColor ?? appearance.cloth, "#3f6ea8"),
    accent: colorHex(appearance.accentColor ?? appearance.accent, "#25344d"),
    hairColor: HAIR_COLORS[hair - 1],
    skin: appearance.bodyType === "female" ? "#efbd94" : "#e5ad82",
    ink: "#111722"
  };
}

function weaponSvg(weapon, ink) {
  if (weapon === "none") return "";
  if (weapon === "staff") return `<g transform="rotate(18 70 5)"><rect x="66" y="-82" width="8" height="190" rx="4" fill="#8b613c" stroke="${ink}" stroke-width="4"/></g>`;
  if (weapon === "sword") return `<g transform="rotate(28 65 4)"><path d="M62 -55 L76 -55 L72 65 L66 82 L59 65 Z" fill="#d8e2ec" stroke="${ink}" stroke-width="4"/><rect x="52" y="-62" width="34" height="8" rx="3" fill="#d6a64b" stroke="${ink}" stroke-width="3"/><rect x="62" y="-92" width="14" height="32" rx="4" fill="#68442f" stroke="${ink}" stroke-width="3"/></g>`;
  const length = weapon === "dagger" ? 54 : 44;
  return `<g transform="rotate(26 70 28)"><path d="M67 ${28 - length} L78 28 L70 44 L59 28 Z" fill="#b9c7d6" stroke="${ink}" stroke-width="4"/><circle cx="69" cy="48" r="8" fill="none" stroke="${ink}" stroke-width="5"/></g>`;
}

function hairSvg(style, color, ink) {
  const base = `<path d="M-48 -78 Q-43 -132 0 -137 Q45 -133 49 -78 L35 -91 L24 -69 L11 -96 L-3 -70 L-18 -98 L-32 -72 Z" fill="${color}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`;
  if (style === 2) return `<path d="M-50 -78 Q-52 -132 0 -139 Q52 -130 52 -76 L47 9 L28 -8 L18 -62 L0 -72 L-20 -58 L-31 4 L-50 17 Z" fill="${color}" stroke="${ink}" stroke-width="5"/>${base}`;
  if (style === 3) return `<path d="M-49 -83 L-62 -107 L-37 -104 L-42 -132 L-16 -119 L-4 -145 L10 -122 L34 -142 L35 -114 L61 -119 L47 -85 L31 -96 L19 -70 L5 -98 L-8 -72 L-23 -99 L-35 -73 Z" fill="${color}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`;
  if (style === 4) return `<ellipse cx="43" cy="-121" rx="25" ry="34" fill="${color}" stroke="${ink}" stroke-width="5"/><path d="M48 -100 Q75 -51 48 2 L31 -19 L35 -83 Z" fill="${color}" stroke="${ink}" stroke-width="5"/>${base}`;
  if (style === 5) return `${base}<path d="M-43 -103 Q0 -116 43 -103 L40 -88 Q0 -99 -40 -88 Z" fill="#75849a" stroke="${ink}" stroke-width="4"/><path d="M42 -99 L68 -82 L49 -66 Z" fill="#75849a" stroke="${ink}" stroke-width="4"/>`;
  return base;
}

export function fighterPreviewSvg(appearance, { shadow = true, scale = 0 } = {}) {
  const a = resolveFighterAppearance(appearance);
  const box = FIGHTER_VIEWBOX;
  const size = scale ? ` width="${box.width * scale}" height="${box.height * scale}"` : "";
  const torsoWidth = a.bodyType === "female" ? 66 : 76;
  const eye = a.face === 2 ? "M-22 -77 L-7 -73 M7 -73 L22 -77" : a.face === 3 ? "M-22 -76 Q-14 -68 -6 -76 M6 -76 Q14 -68 22 -76" : "M-21 -76 Q-14 -83 -7 -76 M7 -76 Q14 -83 21 -76";
  const mouth = a.face === 2 ? "M-8 -55 L8 -55" : a.face === 3 ? "M-9 -57 Q0 -49 9 -57" : "M-7 -55 Q0 -52 7 -55";
  const legWidth = a.bottom === 2 ? 29 : a.bottom === 3 ? 24 : 21;
  const shoeHeight = a.shoes === 2 ? 24 : 17;
  const collar = a.top === 3 ? `<path d="M-20 -31 L0 -13 L20 -31 L15 -44 L-15 -44 Z" fill="${a.accent}" stroke="${a.ink}" stroke-width="4"/>` : "";
  const vest = a.top === 2 ? `<path d="M-${torsoWidth / 2 + 8} -34 L-${torsoWidth / 2} -49 L-${torsoWidth / 2 - 5} -17 Z M${torsoWidth / 2 + 8} -34 L${torsoWidth / 2} -49 L${torsoWidth / 2 - 5} -17 Z" fill="${a.accent}" stroke="${a.ink}" stroke-width="4"/>` : "";
  return `<svg viewBox="${box.x} ${box.y} ${box.width} ${box.height}"${size} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Combatiente geométrico personalizado">
    ${shadow ? `<ellipse cx="0" cy="117" rx="68" ry="10" fill="#05070a" opacity=".35"/>` : ""}
    ${a.hair === 2 || a.hair === 4 ? hairSvg(a.hair, a.hairColor, a.ink) : ""}
    <path d="M-${legWidth + 5} 36 L-5 36 L-${legWidth - 2} 101 L-${legWidth + 20} 101 Z" fill="${a.accent}" stroke="${a.ink}" stroke-width="5"/>
    <path d="M5 36 L${legWidth + 5} 36 L${legWidth + 20} 101 L${legWidth - 2} 101 Z" fill="${a.accent}" stroke="${a.ink}" stroke-width="5"/>
    <path d="M-${legWidth + 23} ${98 - shoeHeight / 2} Q-${legWidth + 25} 114 -${legWidth + 2} 115 L-5 115 L-7 ${98 - shoeHeight / 2} Z" fill="#293242" stroke="${a.ink}" stroke-width="5"/>
    <path d="M7 ${98 - shoeHeight / 2} L${legWidth + 23} ${98 - shoeHeight / 2} Q${legWidth + 25} 114 ${legWidth + 2} 115 L5 115 Z" fill="#293242" stroke="${a.ink}" stroke-width="5"/>
    <rect x="-${torsoWidth / 2}" y="-44" width="${torsoWidth}" height="88" rx="18" fill="${a.cloth}" stroke="${a.ink}" stroke-width="5"/>
    ${vest}${collar}<path d="M-${torsoWidth / 2 - 8} -37 L${torsoWidth / 2 - 8} 34 M${torsoWidth / 2 - 8} -37 L-${torsoWidth / 2 - 8} 34" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="4"/>
    <rect x="-${torsoWidth / 2 + 6}" y="25" width="${torsoWidth + 12}" height="15" rx="5" fill="${a.accent}" stroke="${a.ink}" stroke-width="4"/>
    <g transform="rotate(10 -43 -20)"><rect x="-54" y="-32" width="22" height="70" rx="11" fill="${a.cloth}" stroke="${a.ink}" stroke-width="5"/><circle cx="-43" cy="39" r="11" fill="${a.skin}" stroke="${a.ink}" stroke-width="4"/></g>
    <g transform="rotate(-10 43 -20)"><rect x="32" y="-32" width="22" height="70" rx="11" fill="${a.cloth}" stroke="${a.ink}" stroke-width="5"/><circle cx="43" cy="39" r="11" fill="${a.skin}" stroke="${a.ink}" stroke-width="4"/></g>
    <rect x="-10" y="-58" width="20" height="22" rx="7" fill="${a.skin}" stroke="${a.ink}" stroke-width="4"/>
    <ellipse cx="0" cy="-86" rx="43" ry="49" fill="${a.skin}" stroke="${a.ink}" stroke-width="5"/>
    <path d="${eye}" fill="none" stroke="${a.ink}" stroke-width="5" stroke-linecap="round"/><path d="${mouth}" fill="none" stroke="#7d3c3e" stroke-width="3" stroke-linecap="round"/>
    ${a.hair === 2 || a.hair === 4 ? hairSvg(1, a.hairColor, a.ink) : hairSvg(a.hair, a.hairColor, a.ink)}
    ${weaponSvg(a.weapon, a.ink)}
  </svg>`;
}
