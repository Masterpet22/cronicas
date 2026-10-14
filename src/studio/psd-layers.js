/** Utilidades puras para convertir el árbol de capas de un PSD en sprites del Studio. */
export function normalizeLayerId(name) {
  return name.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "capa";
}

export function collectPsdLayers(children = [], parents = [], parentHidden = false) {
  return children.flatMap((layer, index) => {
    const name = layer.name?.trim() || `Capa ${index + 1}`;
    const path = [...parents, name];
    const hidden = parentHidden || layer.hidden === true;
    if (layer.children?.length) return collectPsdLayers(layer.children, path, hidden);
    const width = layer.canvas?.width || 0;
    const height = layer.canvas?.height || 0;
    if (!width || !height) return [];
    return [{
      name,
      path: path.join(" / "),
      canvas: layer.canvas,
      width,
      height,
      left: Number(layer.left || 0),
      top: Number(layer.top || 0),
      hidden
    }];
  });
}

export function uniquePartId(name, reserved) {
  const base = normalizeLayerId(name);
  let candidate = base;
  let suffix = 2;
  while (reserved.has(candidate)) candidate = `${base}_${suffix++}`;
  reserved.add(candidate);
  return candidate;
}
