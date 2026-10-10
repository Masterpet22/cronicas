import { PUPPET_TARGETS } from "./rig.js";
import { TRANSFORM_PROPERTIES } from "./runtime.js";

const STATUSES = new Set(["draft", "integrated"]);

export function validateAnimationCatalog(catalog, priorities) {
  const errors = [];
  const knownTargets = new Set(PUPPET_TARGETS);
  const knownProperties = new Set(TRANSFORM_PROPERTIES);

  Object.entries(catalog).forEach(([key, clip]) => {
    const at = `clip "${key}"`;
    if (!clip || typeof clip !== "object") return errors.push(`${at}: debe ser un objeto`);
    if (clip.id !== key) errors.push(`${at}: id debe coincidir con la clave`);
    for (const field of ["label", "description", "category", "state", "status"]) {
      if (typeof clip[field] !== "string" || !clip[field].trim()) errors.push(`${at}: falta ${field}`);
    }
    if (!(clip.state in priorities)) errors.push(`${at}: estado desconocido ${clip.state}`);
    if (!STATUSES.has(clip.status)) errors.push(`${at}: status debe ser draft o integrated`);
    if (typeof clip.loop !== "boolean") errors.push(`${at}: loop debe ser booleano`);
    if (clip.restore !== undefined && typeof clip.restore !== "boolean") errors.push(`${at}: restore debe ser booleano`);
    if (!Array.isArray(clip.requires) || !clip.requires.length) errors.push(`${at}: requires debe declarar el rig necesario`);
    const required = new Set(clip.requires || []);
    required.forEach((target) => {
      if (!knownTargets.has(target)) errors.push(`${at}: requisito desconocido ${target}`);
    });
    if (!Array.isArray(clip.tracks) || !clip.tracks.length) errors.push(`${at}: debe incluir pistas`);
    (clip.tracks || []).forEach((track, index) => {
      const trackAt = `${at}, pista ${index}`;
      if (!knownTargets.has(track.target)) errors.push(`${trackAt}: target desconocido ${track.target}`);
      if (!required.has(track.target)) errors.push(`${trackAt}: ${track.target} no está declarado en requires`);
      if (!Number.isFinite(track.duration) || track.duration <= 0) errors.push(`${trackAt}: duration debe ser positivo`);
      if (track.delay !== undefined && (!Number.isFinite(track.delay) || track.delay < 0)) errors.push(`${trackAt}: delay inválido`);
      if (!track.to || typeof track.to !== "object" || !Object.keys(track.to).length) errors.push(`${trackAt}: falta to`);
      for (const pose of [track.from, track.to]) {
        Object.entries(pose || {}).forEach(([property, value]) => {
          if (!knownProperties.has(property)) errors.push(`${trackAt}: propiedad desconocida ${property}`);
          if (!Number.isFinite(value)) errors.push(`${trackAt}: ${property} debe ser numérica`);
        });
      }
    });
  });

  return errors;
}

export function assertValidAnimationCatalog(catalog, priorities) {
  const errors = validateAnimationCatalog(catalog, priorities);
  if (errors.length) throw new Error(`Catálogo de animaciones inválido:\n${errors.join("\n")}`);
  return catalog;
}
