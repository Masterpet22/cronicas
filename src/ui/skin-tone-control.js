import { skinTone, skinToneIndex, SKIN_TONES } from "../skin-tones.js?v=0.135.0";

export function skinToneControlMarkup(selected) {
  const tone = skinTone(selected), index = skinToneIndex(tone.id);
  const gradient = SKIN_TONES.map((entry, position) => `${entry.color} ${(position / (SKIN_TONES.length - 1) * 100).toFixed(2)}%`).join(",");
  return `<div class="skin-tone-control" style="--skin-swatch:${tone.color};--skin-gradient:linear-gradient(90deg,${gradient})"><label class="cosmetic-label" for="skin-tone-range">Tono de piel</label><div class="skin-tone-slider"><span aria-hidden="true">CLARO</span><input id="skin-tone-range" type="range" name="skinTone" min="0" max="${SKIN_TONES.length - 1}" step="1" value="${index}" aria-label="Tono de piel" aria-valuetext="${tone.name}"><span aria-hidden="true">OSCURO</span><output data-skin-tone-name for="skin-tone-range"><i class="skin-tone-swatch" aria-hidden="true"></i>${tone.name}</output></div></div>`;
}

export function syncSkinToneControl(control, value) {
  const tone = skinTone(value), input = control?.querySelector('[name="skinTone"]');
  if (!input) return tone.id;
  input.value = String(skinToneIndex(tone.id));
  input.setAttribute("aria-valuetext", tone.name);
  control.style.setProperty("--skin-swatch", tone.color);
  const output = control.querySelector("[data-skin-tone-name]");
  if (output) output.innerHTML = `<i class="skin-tone-swatch" aria-hidden="true"></i>${tone.name}`;
  return tone.id;
}
