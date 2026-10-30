// Texturas pequeñas con alfa real: el recorte funciona igual en Canvas y WebGL,
// sin máscaras geométricas y sin deformar los extremos al perder recursos.
// Usamos fotogramas del atlas: setCrop de Phaser 4 puede corromper otros sprites
// del mismo lote WebGL, incluso cuando las barras parecen dibujarse bien.
export function createResourceLayer(scene, x, y, width, height, color, alpha = 1, { direction = "ltr", gloss = false } = {}) {
  const density = 3;
  const textureFor = tint => {
    const key = `resource-pill-${width}-${height}-${tint}-${gloss}`;
    if (!scene.textures.exists(key)) {
      const texture = scene.textures.createCanvas(key, width * density, height * density);
      const context = texture.context;
      context.scale(density, density);
      context.beginPath();
      context.roundRect(0, 0, width, height, height / 2);
      context.clip();
      context.fillStyle = `#${tint.toString(16).padStart(6, "0")}`;
      context.fillRect(0, 0, width, height);
      if (gloss) {
        const gradient = context.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "rgba(240,255,248,.32)");
        gradient.addColorStop(.42, "rgba(255,255,255,.04)");
        gradient.addColorStop(1, "rgba(0,24,35,.36)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }
      texture.refresh();
    }
    return key;
  };
  const image = scene.add.image(x, y, textureFor(color)).setOrigin(0, .5).setDisplaySize(width, height).setAlpha(alpha);
  let visibleWidth = width;
  const crop = value => {
    visibleWidth = Math.max(0, Math.min(width, Number(value) || 0));
    image.setVisible(visibleWidth > 0);
    const pixels = Math.max(1, Math.round(visibleWidth * density));
    const cropX = direction === "rtl" ? width * density - pixels : 0;
    const frame = `pill-${cropX}-${pixels}`;
    const texture = image.texture;
    if (!texture.has(frame)) texture.add(frame, 0, cropX, 0, pixels, height * density);
    image.setFrame(frame).setDisplaySize(pixels / density, height);
    image.setX(direction === "rtl" ? x + width - pixels / density : x);
    return image;
  };
  Object.defineProperty(image, "fillWidth", { get: () => visibleWidth, set: crop });
  image.setFillWidth = crop;
  image.setFillStyle = (tint, opacity = 1) => {
    image.setTexture(textureFor(tint)).setDisplaySize(width, height).setAlpha(opacity);
    return crop(visibleWidth);
  };
  return image;
}
