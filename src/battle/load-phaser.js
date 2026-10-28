let phaserPromise = null;

export function loadPhaser() {
  if (window.Phaser) return Promise.resolve(window.Phaser);
  if (phaserPromise) return phaserPromise;
  phaserPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "assets/vendor/phaser-4.2.1.min.js";
    script.dataset.phaserRuntime = "true";
    script.async = true;
    script.onload = () => window.Phaser ? resolve(window.Phaser) : reject(new Error("Phaser se cargó sin exponer su runtime"));
    script.onerror = () => reject(new Error("No se pudo cargar Phaser 4.2.1"));
    document.body.append(script);
  }).catch((error) => {
    document.querySelector('script[data-phaser-runtime="true"]')?.remove();
    phaserPromise = null;
    throw error;
  });
  return phaserPromise;
}
