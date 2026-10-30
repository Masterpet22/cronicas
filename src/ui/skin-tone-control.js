import { normalizeSkinTone, SKIN_TONES } from "../skin-tones.js?v=0.119.0";

export function skinToneControlMarkup(selected) {
  return `<div class="skin-tone-control"><span class="cosmetic-label">Tono de piel</span><div class="skin-tone-options" role="radiogroup" aria-label="Tono de piel">${SKIN_TONES.map(tone => `<label class="skin-tone-option" style="--skin-swatch:${tone.color}"><input type="radio" name="skinTone" value="${tone.id}" ${tone.id === normalizeSkinTone(selected) ? "checked" : ""}><span class="skin-tone-swatch" aria-hidden="true"></span><span>${tone.name}</span><b aria-hidden="true">✓</b></label>`).join("")}</div></div>`;
}
