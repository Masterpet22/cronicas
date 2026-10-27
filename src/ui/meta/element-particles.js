// Deterministic positions keep the preview populated immediately, with no timers.
export function elementParticlesMarkup(element) {
  const affinity = ["fuego", "agua", "tierra", "viento"].includes(element) ? element : "fuego";
  const particles = Array.from({ length: 36 }, (_, index) => {
    const seed = index + 1;
    const x = 8 + (seed * 37 % 85);
    const y = 12 + (seed * 29 % 79);
    const size = 3 + (seed * 5 % 7);
    return `<i class="element-particle" style="--particle-x:${x}%;--particle-y:${y}%;--particle-size:${size}px;--particle-drift:${seed * 17 % 75 - 37}px;--particle-rise:${65 + seed * 23 % 95}px;--particle-duration:${4 + seed * 13 % 35 / 10}s;--particle-delay:-${seed * 19 % 80 / 10}s;--particle-turn:${seed * 47 % 180}deg"></i>`;
  }).join("");
  return `<div class="creator-element-particles" data-affinity-particles data-element="${affinity}" aria-hidden="true">${particles}</div>`;
}
