import { basicRequirements, elementIcon, elementIconParts } from "../elements.js?v=0.20.0";

export function queueElementIcons(scene, elements) {
  for (const id of new Set(elements.flatMap(basicRequirements))) {
    const key = `element-${id}`;
    if (!scene.textures.exists(key)) scene.load.image(key, elementIcon(id));
  }
}

export function composeElementIcons(scene, elements) {
  for (const id of new Set(elements)) {
    const key = `element-${id}`;
    if (scene.textures.exists(key)) continue;
    const parts = elementIconParts(id);
    if (!parts.length) continue;
    const texture = scene.textures.createCanvas(key, 512, 512);
    for (const part of parts) {
      const source = scene.textures.get(`element-${part.id}`).getSourceImage();
      texture.context.drawImage(source, part.x, part.y, part.size, part.size);
    }
    texture.refresh();
  }
}
