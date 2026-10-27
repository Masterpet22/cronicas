export const TELEPORT_OBJECTS = Object.freeze([
  Object.freeze({ id: "log", name: "Tronco", texture: "teleport-object-log", file: "assets/vfx/substitution-log-runtime.png?v=0.64.0", width: 140, height: 94 }),
  Object.freeze({ id: "dog", name: "Perrito", texture: "teleport-object-dog", file: "assets/vfx/teleport-dog.svg?v=1.0.0", width: 92, height: 104 }),
  Object.freeze({ id: "chair", name: "Silla", texture: "teleport-object-chair", file: "assets/vfx/teleport-chair.svg?v=1.0.0", width: 88, height: 118 })
]);

export const teleportObject = id => TELEPORT_OBJECTS.find(object => object.id === id) || TELEPORT_OBJECTS[0];
