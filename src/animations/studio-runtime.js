/** Crónicas Studio v1: sampler puro para editor y adaptadores de Phaser. */
export const STUDIO_SCHEMA = "cronicas-studio/v1";
export function validateStudioAnimation(project, allowedTargets = null) {
  if (!project || project.schema !== STUDIO_SCHEMA || !project.animation) throw new Error("Proyecto de Studio incompatible");
  const clip=project.animation;
  if(typeof clip.id!=="string"||!clip.id.trim())throw new Error("ID de clip inválido");
  if(!Number.isFinite(clip.duration)||clip.duration<100||clip.duration>60000)throw new Error("Duración inválida");
  if(!clip.keys||typeof clip.keys!=="object"||Array.isArray(clip.keys))throw new Error("Claves inválidas");
  for(const [id,frames] of Object.entries(clip.keys)){
    if(allowedTargets&&!allowedTargets.includes(id))throw new Error("Hueso desconocido: "+id);
    if(!Array.isArray(frames))throw new Error("Pista inválida: "+id);
    for(const k of frames)if(!Number.isFinite(k.t)||k.t<0||k.t>clip.duration||!Number.isFinite(k.angle))throw new Error("Fotograma inválido: "+id);
  }
  return clip;
}
export function sampleStudioAnimation(project,time,targets=null) {
  const clip=validateStudioAnimation(project,targets);
  const t=clip.loop?((time%clip.duration)+clip.duration)%clip.duration:Math.max(0,Math.min(clip.duration,time));
  const pose={};
  for(const [id,original] of Object.entries(clip.keys)){
    const keys=[...original].sort((a,b)=>a.t-b.t);
    if(!keys.length)continue;
    let angle=keys[0].angle;
    if(t>=keys[keys.length-1].t)angle=keys[keys.length-1].angle;
    else if(t>keys[0].t){
      for(let i=1;i<keys.length;i++)if(t<=keys[i].t){
        const a=keys[i-1],b=keys[i],p=(t-a.t)/(b.t-a.t||1);
        angle=a.angle+(b.angle-a.angle)*p;break;
      }
    }
    pose[id]={angle};
  }
  return pose;
}
