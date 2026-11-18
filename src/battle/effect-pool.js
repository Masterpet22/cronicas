const scenePools = new WeakMap();
const MAX_IDLE_PER_EFFECT = 4;

function poolFor(scene) {
  let pool = scenePools.get(scene);
  if (pool) return pool;
  pool = { idle: new Map(), objects: new Set(), closed: false };
  scenePools.set(scene, pool);
  const close = () => {
    pool.closed = true;
    scenePools.delete(scene);
    scene.events.off("shutdown", close);
    scene.events.off("destroy", close);
    for (const object of pool.objects) {
      if (object.scene) object.destroy();
    }
    pool.objects.clear();
    pool.idle.clear();
  };
  scene.events.once("shutdown", close);
  scene.events.once("destroy", close);
  return pool;
}

export function acquireEffect(scene, kind, create) {
  const pool = poolFor(scene);
  if (!pool.idle.has(kind)) pool.idle.set(kind, []);
  const idle = pool.idle.get(kind);
  const objects = idle.pop() || create();
  for (const object of objects) {
    pool.objects.add(object);
    object.setActive(true).setVisible(true).addToDisplayList();
  }

  let released = false;
  return {
    objects,
    release() {
      if (released || pool.closed) return;
      released = true;
      if (idle.length === MAX_IDLE_PER_EFFECT || objects.some(object => !object.scene)) {
        for (const object of objects) {
          pool.objects.delete(object);
          if (object.scene) object.destroy();
        }
        return;
      }
      for (const object of objects) object.setActive(false).setVisible(false).removeFromDisplayList();
      idle.push(objects);
    }
  };
}
