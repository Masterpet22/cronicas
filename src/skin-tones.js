export const DEFAULT_SKIN_TONE = "claro";
const HIGHLIGHT = [255, 239, 218];
const mix = (from, to, weight) => from.map((channel, index) => Math.round(channel + (to[index] - channel) * weight));
const paletteFor = base => Object.freeze([
  [0, 0, 0], ...[.12, .28, .46, .65, .82, 1].map(weight => mix([0, 0, 0], base, weight)),
  mix(base, HIGHLIGHT, .45), mix(base, HIGHLIGHT, .72)
].map(rgb => Object.freeze(rgb)));
const tone = (id, name, color, base) => Object.freeze({ id, name, color, colors: paletteFor(base) });

// Nueve pasos ofrecen una gama amplia sin introducir valores arbitrarios en el guardado.
export const SKIN_TONES = Object.freeze([
  tone("muy-claro", "Muy claro", "#f8cdae", [248,205,174]),
  tone("claro", "Claro", "#e2ae84", [226,174,132]),
  tone("dorado", "Dorado", "#cd9260", [205,146,96]),
  tone("medio", "Medio", "#b7794c", [183,121,76]),
  tone("oliva", "Oliva", "#9d6641", [157,102,65]),
  tone("canela", "Canela", "#845031", [132,80,49]),
  tone("moreno", "Moreno", "#6d4028", [109,64,40]),
  tone("oscuro", "Oscuro", "#4f2d1f", [79,45,31]),
  tone("ebano", "Ébano", "#341e18", [52,30,24])
]);
export function skinTone(id) {
  const numeric = Number(id);
  if ((typeof id === "number" || typeof id === "string" && /^\d+$/.test(id)) && Number.isInteger(numeric)) return SKIN_TONES[numeric] || SKIN_TONES.find(entry => entry.id === DEFAULT_SKIN_TONE);
  return SKIN_TONES.find(entry => entry.id === id) || SKIN_TONES.find(entry => entry.id === DEFAULT_SKIN_TONE);
}
export const normalizeSkinTone = id => skinTone(id).id;
export const skinToneIndex = id => SKIN_TONES.findIndex(entry => entry.id === normalizeSkinTone(id));

export function skinPalette(id) {
  const colors = skinTone(id).colors;
  return Array.from({ length: 256 }, (_, value) => {
    const position = value / 255 * (colors.length - 1), index = Math.min(colors.length - 2, Math.floor(position));
    const weight = position - index;
    return colors[index].map((channel, component) => Math.round(channel + (colors[index + 1][component] - channel) * weight));
  });
}
const palettes = new Map(SKIN_TONES.map(entry => [entry.id, skinPalette(entry.id)]));
export function colorizeSkinPixels(pixels, id) {
  const palette = palettes.get(normalizeSkinTone(id));
  for (let index = 0; index < pixels.length; index += 4) {
    if (!pixels[index + 3]) continue;
    const luminance = Math.round(pixels[index] * .2126 + pixels[index + 1] * .7152 + pixels[index + 2] * .0722);
    [pixels[index], pixels[index + 1], pixels[index + 2]] = palette[luminance];
  }
  return pixels;
}

export function ensureSkinToneFilters() {
  if (typeof document === "undefined" || document.getElementById("skin-tone-filters")) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "skin-tone-filters";
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
  svg.style.cssText = "position:absolute;pointer-events:none;overflow:hidden";
  svg.innerHTML = `<defs>${SKIN_TONES.map(entry => `<filter id="skin-tone-${entry.id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/><feComponentTransfer>${["R", "G", "B"].map((channel, index) => `<feFunc${channel} type="table" tableValues="${palettes.get(entry.id).map(rgb => (rgb[index] / 255).toFixed(6)).join(" ")}"/>`).join("")}</feComponentTransfer></filter>`).join("")}</defs>`;
  document.body.append(svg);
}
