// Recorre también las piezas de las marionetas y los elementos dentro de contenedores.
export function sceneObjects(scene) {
  const objects = new Set();
  const visit = (object) => {
    if (!object || objects.has(object)) return;
    objects.add(object);
    if (Array.isArray(object.list)) object.list.forEach(visit);
  };
  (scene.children?.list || []).forEach(visit);
  return [...objects];
}

export function sceneFilterLists(scene, objects = sceneObjects(scene)) {
  const lists = new Set();
  [...objects, ...(scene.cameras?.cameras || [])].forEach((owner) => {
    [owner.filters?.internal, owner.filters?.external].forEach((list) => {
      if (Array.isArray(list?.list)) lists.add(list);
    });
  });
  return [...lists];
}

export function sceneResourceUsage(scene) {
  const objects = sceneObjects(scene);
  const emitters = objects.filter((object) => typeof object.getAliveParticleCount === "function");
  return {
    objects: objects.length,
    emitters: emitters.length,
    particles: emitters.reduce((total, emitter) => total + emitter.getAliveParticleCount(), 0),
    filters: sceneFilterLists(scene, objects).reduce((total, list) => total + list.list.length, 0)
  };
}

export function clearSceneFilters(scene) {
  sceneFilterLists(scene).forEach((list) => list.clear());
}

export function clearSceneParticles(scene) {
  sceneObjects(scene).filter((object) => typeof object.getAliveParticleCount === "function")
    .forEach((emitter) => emitter.destroy());
}
