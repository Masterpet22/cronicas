/** Crónicas Studio v1: sampler puro para editor y adaptadores de Phaser. */
import { sampleKeyframeAnimationPose } from "./runtime.js?v=0.45.4";
import { assertValidStudioProject, normalizeStudioProject, STUDIO_SCHEMA } from "./studio-format.js?v=0.45.4";

export { STUDIO_SCHEMA };

export function validateStudioAnimation(project, allowedTargets = null) {
  assertValidStudioProject(project, { allowedTargets, mode: "project" });
  return normalizeStudioProject(project).animation;
}

export function sampleStudioAnimation(project,time,targets=null) {
  const clip=validateStudioAnimation(project,targets);
  return sampleKeyframeAnimationPose(clip,time);
}
