export const TELEPORT_OBJECTS = Object.freeze([
  Object.freeze({ id: "log", name: "Tronco", texture: "teleport-object-log", file: "assets/vfx/substitution-log-runtime.png?v=0.64.0", width: 140, height: 94 }),
  Object.freeze({ id: "dog", name: "Perrito", texture: "teleport-object-dog", file: "assets/vfx/teleport-dog.webp?v=1.1.0", width: 92, height: 104 }),
  Object.freeze({ id: "puppet", name: "Marioneta", texture: "teleport-object-puppet", file: "assets/vfx/teleport-puppet.webp?v=1.1.0", width: 160, height: 44 })
]);

// La silla de las partidas anteriores ahora utiliza la marioneta.
export const teleportObject = id => TELEPORT_OBJECTS.find(object => object.id === (id === "chair" ? "puppet" : id)) || TELEPORT_OBJECTS[0];
