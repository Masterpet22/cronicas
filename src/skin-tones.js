const tone = (id, name, color, colors) => Object.freeze({ id, name, color, colors: Object.freeze(colors.map(rgb => Object.freeze(rgb))) });
// Las dos paletas conservan tinta negra y progresan de sombra a luz natural.
export const SKIN_TONES = Object.freeze([
  tone("claro", "Claro", "#deb28b", [[0,0,0],[24,16,13],[66,41,29],[118,75,50],[174,117,81],[214,160,117],[239,192,149],[251,218,181],[255,239,211]]),
  tone("moreno", "Moreno", "#956141", [[0,0,0],[15,10,8],[37,23,17],[65,38,26],[100,59,39],[137,86,56],[173,117,80],[208,158,115],[235,198,156]])
]);
export const DEFAULT_SKIN_TONE = "claro";
export const skinTone = id => SKIN_TONES.find(entry => entry.id === id) || SKIN_TONES[0];
export const normalizeSkinTone = id => skinTone(id).id;

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
