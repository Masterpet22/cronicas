/** Crónicas Studio v1: sampler puro para editor y adaptadores de Phaser. */
import { animationEase, TRANSFORM_PROPERTIES } from "./runtime.js";
import { assertValidStudioProject, normalizeStudioProject, STUDIO_SCHEMA } from "./studio-format.js";

export { STUDIO_SCHEMA };

export function validateStudioAnimation(project, allowedTargets = null) {
  assertValidStudioProject(project, { allowedTargets, mode: "project" });
  return normalizeStudioProject(project).animation;
}

function sampleProperty(frames, property, time) {
  const keys = frames.filter((frame) => Number.isFinite(frame[property]));
  if (!keys.length) return undefined;
  if (time <= keys[0].t) return keys[0][property];
  if (time >= keys[keys.length - 1].t) return keys[keys.length - 1][property];
  for (let index = 1; index < keys.length; index += 1) {
    const next = keys[index];
    if (time > next.t) continue;
    const previous = keys[index - 1];
    const rawProgress = (time - previous.t) / (next.t - previous.t || 1);
    const progress = next.ease && next.ease !== "Linear"
      ? animationEase(rawProgress, next.ease)
      : rawProgress;
    return previous[property] + (next[property] - previous[property]) * progress;
  }
  return keys[keys.length - 1][property];
}

export function sampleStudioAnimation(project,time,targets=null) {
  const clip=validateStudioAnimation(project,targets);
  const t=clip.loop?((time%clip.duration)+clip.duration)%clip.duration:Math.max(0,Math.min(clip.duration,time));
  const pose={};
  for(const [id,original] of Object.entries(clip.keys)){
    const keys=[...original].sort((a,b)=>a.t-b.t);
    if(!keys.length)continue;
    const transform={};
    TRANSFORM_PROPERTIES.forEach((property)=>{
      const value=sampleProperty(keys,property,t);
      if(value!==undefined)transform[property]=value;
    });
    if(Object.keys(transform).length)pose[id]=transform;
  }
  return pose;
}
