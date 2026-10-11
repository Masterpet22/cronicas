import assert from "node:assert/strict";
import { PUPPET_TARGETS } from "../src/animations/rig.js";
import {
  createStudioProject,
  parseStudioProject,
  serializeStudioProject,
  STUDIO_SCHEMA,
  validateStudioProject
} from "../src/animations/studio-format.js";
import { sampleStudioAnimation, validateStudioAnimation } from "../src/animations/studio-runtime.js";

const legacyProject = {
  schema: STUDIO_SCHEMA,
  rig: "humanoid",
  anatomy: "male",
  animation: {
    id: "legacy_punch",
    duration: 1000,
    loop: false,
    keys: {
      shoulderRight: [
        { t: 1000, angle: -45 },
        { t: 0, angle: 0 }
      ]
    }
  }
};

assert.deepEqual(validateStudioProject(legacyProject), [], "Los JSON del prototipo deben seguir siendo importables");
const migrated = parseStudioProject(JSON.stringify(legacyProject), { allowedTargets: PUPPET_TARGETS });
assert.equal(migrated.animation.status, "draft");
assert.equal(migrated.animation.state, "action");
assert.deepEqual(migrated.animation.requires, ["shoulderRight"]);
assert.deepEqual(migrated.animation.keys.shoulderRight.map(({ t }) => t), [0, 1000]);
assert.equal(sampleStudioAnimation(legacyProject, 500).shoulderRight.angle, -22.5, "La migración debe conservar la interpolación lineal anterior");

const project = createStudioProject({
  id: "attack_export_test",
  label: "Ataque de prueba",
  description: "Comprueba el contrato entre Studio y el juego.",
  category: "ataque",
  state: "action",
  duration: 1000
});
project.animation.requires = ["shoulderRight", "rig"];
project.animation.keys.shoulderRight = [
  { t: 1000, angle: -60, x: 10, ease: "Cubic.out" },
  { t: 0, angle: 0, x: 0 }
];
project.animation.keys.rig = [
  { t: 0, y: 0, scaleX: 0, scaleY: 0, alpha: 0 },
  { t: 1000, y: -10, scaleX: 0.1, scaleY: -0.1, alpha: -1, ease: "Linear" }
];
project.animation.spriteEvents = [{ t: 400, slot: "handRight", variant: "grip" }];

assert.deepEqual(validateStudioProject(project, { mode: "game" }), [], "Un proyecto completo debe superar la validación de exportación");
const serialized = serializeStudioProject(project, { mode: "game" });
const roundTrip = parseStudioProject(serialized, { mode: "game" });
assert.equal(serializeStudioProject(roundTrip, { mode: "game" }), serialized, "Importar y volver a exportar no debe alterar el archivo");
assert.ok(serialized.indexOf('"t": 0') < serialized.indexOf('"t": 1000'), "Los fotogramas deben serializarse en orden temporal");

const pose = sampleStudioAnimation(roundTrip, 500);
assert.equal(pose.shoulderRight.angle, -52.5, "El muestreador debe compartir la curva nominal con el runtime");
assert.equal(pose.shoulderRight.x, 8.75, "El formato debe admitir más transformaciones que el ángulo");
assert.deepEqual(pose.rig, { y: -5, scaleX: 0.05, scaleY: -0.05, alpha: -0.5 }, "Todas las transformaciones relativas deben interpolarse de forma determinista");
assert.equal(validateStudioAnimation(roundTrip).id, "attack_export_test");

const empty = createStudioProject();
assert.ok(validateStudioProject(empty, { mode: "game" }).some((error) => error.includes("al menos una pista")), "Un borrador vacío no debe marcarse como publicable");

const broken = structuredClone(project);
broken.animation.keys.shoulderRight.push({ t: 1000, rotation: 20 });
const brokenErrors = validateStudioProject(broken, { mode: "game" });
assert.ok(brokenErrors.some((error) => error.includes("tiempo duplicado")));
assert.ok(brokenErrors.some((error) => error.includes("propiedad desconocida")));
assert.ok(brokenErrors.some((error) => error.includes("falta una transformación")));

assert.throws(
  () => parseStudioProject("{not-json}"),
  /JSON de Studio inválido/,
  "La importación debe explicar los JSON mal formados"
);

console.log("Pruebas del contrato de Crónicas Studio superadas.");
