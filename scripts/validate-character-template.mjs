import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { createPlayerFighter, queuePlayerFighterTextures, MAN_SPRITE_JOINTS, WOMAN_SPRITE_JOINTS } from "../src/fighters.js";
import { PUPPET_ANIMATION_CLIPS } from "../src/animations/clips.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const round = (n) => Math.round(n * 10000) / 10000;
const identity = [1, 0, 0, 1, 0, 0];
function multiply(a, b) {
  return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
}
function transform(x, y, angle = 0, sx = 1, sy = sx) {
  const r = angle * Math.PI / 180;
  return [Math.cos(r)*sx, Math.sin(r)*sx, -Math.sin(r)*sy, Math.cos(r)*sy, x, y];
}
function bounds(layers) {
  const points = layers.flatMap(({ matrix: m, width, height }) => [[-width/2,-height/2],[width/2,-height/2],[-width/2,height/2],[width/2,height/2]]
    .map(([x,y]) => [m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]));
  return { left: Math.min(...points.map(([x]) => x)), right: Math.max(...points.map(([x]) => x)),
    top: Math.min(...points.map(([,y]) => y)), bottom: Math.max(...points.map(([,y]) => y)) };
}
export function compareLayerGeometry(runtime, dojo, tolerance = 0.1) {
  const differences = runtime.flatMap((part) => {
    const other = dojo.find(({ id }) => id === part.id);
    if (!other) return [{ id: part.id, error: "missing-dojo-layer" }];
    const error = Math.max(...part.matrix.map((value, index) => Math.abs(value - other.matrix[index])), Math.abs(part.width-other.width),Math.abs(part.height-other.height));
    return !Number.isFinite(error) || error > tolerance || part.asset !== other.asset ? [{ id: part.id, error: Number.isFinite(error) ? round(error) : "invalid-transform", assetMatches: part.asset === other.asset }] : [];
  });
  return [...differences, ...dojo.filter((part) => !runtime.some(({id}) => id === part.id)).map(({id})=>({id,error:"extra-dojo-layer"}))];
}
export function validateTemplateContract(contract) {
  const errors = [];
  if (contract.schemaVersion !== 1 || contract.canvas?.length !== 2 || contract.canvas.some((n) => !Number.isInteger(n) || n <= 0)) errors.push("invalid-canvas-or-version");
  if (!Number.isFinite(contract.groundY) || !Number.isFinite(contract.headTopY) || contract.groundY <= contract.headTopY) errors.push("invalid-height");
  const validProportionInputs = [contract.headHeight, contract.bodyHeadRatio].every((value) => Number.isFinite(value) && value > 0);
  if (!validProportionInputs || Math.abs((contract.groundY-contract.headTopY)/contract.headHeight-contract.bodyHeadRatio)>0.001) errors.push("invalid-proportions");
  for (const key of ["HEAD","NECK","SHOULDER_R","SHOULDER_L","HAND_R","HAND_L","WAIST","FOOT_R","FOOT_L","WEAPON_HAND"]) {
    const p = contract.anchors?.[key];
    if (!Array.isArray(p) || p.length !== 2 || p.some((n,i) => !Number.isFinite(n) || n < 0 || n > contract.canvas[i])) errors.push(`invalid-anchor:${key}`);
  }
  if (contract.anchors?.SHOULDER_R?.[0] >= contract.anchors?.SHOULDER_L?.[0]) errors.push("anatomical-sides-reversed");
  if (!contract.exportRules?.artReviewRequired || contract.status !== "technical-candidate-art-pending") errors.push("art-review-must-not-be-assumed");
  return errors;
}
function arrayFromSource(source, name) {
  const start = source.indexOf(`const ${name} = Object.freeze(`);
  const arrayStart = source.indexOf("[", start);
  const end = source.indexOf("\n]);", arrayStart);
  if (start < 0 || end < 0) throw new Error(`No se encuentra el catálogo del Dojo: ${name}`);
  // Evalúa únicamente el literal local del catálogo, sin imports, DOM ni acceso a Node.
  return runInNewContext(`(${source.slice(arrayStart, end+2)})`, Object.create(null), { timeout: 2000 });
}
function dojoLayers(source, character) {
  const context = { PUPPET_PREVIEW_LAYERS: arrayFromSource(source,"PUPPET_PREVIEW_LAYERS"), FEMALE_PUPPET_PREVIEW_LAYERS: arrayFromSource(source,"FEMALE_PUPPET_PREVIEW_LAYERS") };
  const start = source.indexOf("function rasterCharacterPreviewMarkup(");
  const end = source.length;
  if (start < 0 || end < 0) throw new Error("No se encuentra la vista raster del Dojo");
  const render = runInNewContext(`(${source.slice(start,end)})`, context, { timeout: 2000 });
  return [...render({ character }, "validation").matchAll(/<img\b[^>]+>/g)].map(([tag]) => {
    const src = tag.match(/src="([^"]+)"/)[1].split("?")[0];
    const value = (name) => Number(tag.match(new RegExp(`--puppet-${name}:([-\\d.]+)`))?.[1] || 0);
    const id = tag.includes("puppet-preview-hair") ? `hair-${character.hair === 1 ? "corto" : "coleta"}`
      : context[character.bodyType === "female" ? "FEMALE_PUPPET_PREVIEW_LAYERS" : "PUPPET_PREVIEW_LAYERS"][value("z")].id;
    return { id, asset: src, width: value("w")*11, height: value("h")*16,
      matrix: transform(value("x")*11-550,value("y")*16-800,value("rotation")) };
  });
}
async function pngInfo(asset) {
  const bytes = await readFile(resolve(root,asset));
  if (bytes.subarray(0,8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`PNG inválido: ${asset}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), rgba: bytes[25] === 6,
    sha256: createHash("sha256").update(bytes).digest("hex"), uri: `data:image/png;base64,${bytes.toString("base64")}` };
}
async function assemble(character, images) {
  const textures = new Map();
  queuePlayerFighterTextures({ textures: { exists: () => false }, load: { image: (key, asset) => textures.set(key,asset.split("?")[0]) } },character);
  for (const asset of textures.values()) if (!images.has(asset)) images.set(asset,await pngInfo(asset));
  const node = (x=0,y=0,key=null) => ({ x,y,key,angle:0,scaleX:1,scaleY:1,children:[],
    add(child) { this.children.push(child);return this; },setDepth(){return this;},
    setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;},setAngle(a){this.angle=a;return this;},
    setDisplaySize(w,h){const p=images.get(textures.get(this.key));this.scaleX=w/p.width;this.scaleY=h/p.height;return this;}
  });
  const scene = {add:{ellipse:(x,y)=>node(x,y),container:(x,y)=>node(x,y),image:(x,y,key)=>node(x,y,key)},textures:{get:()=>({setFilter(){}})},tweens:{add:()=>({stop(){}})}};
  const fighter = createPlayerFighter(scene,0,0,character);
  fighter.animations.stop({reset:true});
  const layers = [];
  const visit = (part,parent=identity) => {
    const m=multiply(parent,transform(part.x,part.y,part.angle,part.scaleX,part.scaleY));
    if (part.key) {
      const asset=textures.get(part.key), image=images.get(asset);
      // Escalas de la imagen dentro de la matriz, dimensiones nativas para el SVG.
      const width=image.width*part.scaleX,height=image.height*part.scaleY;
      const normalized=multiply(parent,transform(part.x,part.y,part.angle));
      layers.push({id:part.name,asset,width,height,matrix:normalized});
    }
    part.children.forEach((child)=>visit(child,m));
  };
  fighter.rig.children.forEach((child)=>visit(child));
  return {layers,joints:character.bodyType === "female" ? WOMAN_SPRITE_JOINTS : MAN_SPRITE_JOINTS,
    supportedClips:Object.values(PUPPET_ANIMATION_CLIPS).filter((clip)=>fighter.animations.supports(clip.id)).map(({id})=>id)};
}
export async function analyzeCharacterTemplate() {
  const contract = JSON.parse(await readFile(resolve(root,"assets/reference/character-template-v1.json"),"utf8"));
  const source = await readFile(resolve(root,"src/ui/meta/character-preview.js"),"utf8");
  const manifest = JSON.parse((await readFile(resolve(root,"assets/modular/manifest.json"),"utf8")).replace(/^\uFEFF/,""));
  const images=new Map(), variants=[];
  for (const bodyType of ["male","female"]) for (const hair of [0,1,4]) {
    const runtime=await assemble({bodyType,hair},images), dojo=dojoLayers(source,{bodyType,hair});
    const differences=compareLayerGeometry(runtime.layers,dojo,contract.tolerances.dojoTransformPx);
    const bodyBounds=bounds(runtime.layers.filter(({id})=>!id.startsWith("hair-")));
    const head=runtime.layers.find(({id})=>id==="cabeza");
    const runtimeOrder=runtime.layers.map(({id})=>id),dojoOrder=dojo.map(({id})=>id);
    variants.push({bodyType,hair,bodyBounds:Object.fromEntries(Object.entries(bodyBounds).map(([k,v])=>[k,round(v)])),
      geometricHeadHeight:round(head.height),bodyHeadRatio:round((bodyBounds.bottom-bodyBounds.top)/head.height),
      maxTransformError:round(Math.max(...runtime.layers.flatMap((part)=>{const d=dojo.find(({id})=>id===part.id);return d?[...part.matrix.map((v,i)=>Math.abs(v-d.matrix[i])),Math.abs(part.width-d.width),Math.abs(part.height-d.height)]:[Infinity];}))),
      geometryDifferences:differences,layerOrderMatches:JSON.stringify(runtimeOrder)===JSON.stringify(dojoOrder),runtimeOrder,dojoOrder,
      supportedClips:runtime.supportedClips,layers:runtime.layers,dojoLayers:dojo,joints:runtime.joints});
  }
  const male=variants.find((v)=>v.bodyType==="male"&&v.hair===0),female=variants.find((v)=>v.bodyType==="female"&&v.hair===0);
  const integrityErrors=[...validateTemplateContract(contract),...[...images].filter(([,image])=>!image.rgba).map(([asset])=>`missing-alpha:${asset}`),
    ...variants.flatMap((variant)=>variant.geometryDifferences.map((difference)=>`${variant.bodyType}/${variant.hair}/${difference.id}:${difference.error}`))];
  const assetManifest=[...images].map(([asset,{uri,...image}])=>({asset,...image}));
  const report={schemaVersion:1,generatedAt:new Date().toISOString(),technicalIntegrity:{passed:integrityErrors.length===0,errors:integrityErrors},
    productionApproval:{approved:false,status:"art-not-ready",reasons:["No hay exportaciones maestras de ambos cuerpos registradas a la plantilla común.","El manifiesto experimental usa 768×768; el contrato común usa 2048×2048.","Los cuerpos actuales tienen distintas alturas y líneas de suelo en el mismo espacio de rig.","El orden de capas del Dojo masculino difiere del ensamblado jerárquico de combate.","Faltan rostro, prendas, calzado y arma ilustrados compatibles y una revisión artística de silueta/estilo."]},
    contractId:contract.id,experimentalCanvas:manifest.canvas,commonCanvas:contract.canvas,
    measurements:{groundDelta:round(Math.abs(male.bodyBounds.bottom-female.bodyBounds.bottom)),headTopDelta:round(Math.abs(male.bodyBounds.top-female.bodyBounds.top))},
    variants:variants.map(({layers,dojoLayers,joints,...variant})=>variant),assets:assetManifest};
  return {report,contract,variants,images};
}
const escape=(s)=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
function renderLayers(layers,symbols,joints={}) {
  return `<svg viewBox="-550 -820 1100 1660" xmlns="http://www.w3.org/2000/svg">${layers.map((p)=>`<use href="#${symbols.get(p.asset)}" width="${p.width}" height="${p.height}" x="${-p.width/2}" y="${-p.height/2}" transform="matrix(${p.matrix.join(" ")})"/>`).join("")}
    <g class="guides" fill="#49f4e8" stroke="#02121d" stroke-width="4">${Object.entries(joints).map(([id,p])=>`<circle cx="${p.x}" cy="${p.y}" r="12"><title>${escape(id)}</title></circle>`).join("")}</g></svg>`;
}
function templateSvg(contract) {
  const a=contract.anchors;
  const line=(from,to)=>`<line x1="${a[from][0]}" y1="${a[from][1]}" x2="${a[to][0]}" y2="${a[to][1]}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 2048 2048"><rect width="2048" height="2048" fill="#f5f0e7"/><defs><pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="#d4d3cd"/></pattern></defs><rect width="2048" height="2048" fill="url(#grid)"/>
    <text x="90" y="110" font-family="sans-serif" font-size="48" fill="#152b3b">PLANTILLA COMÚN v1 · CONTRATO TÉCNICO</text><text x="90" y="170" font-family="sans-serif" font-size="26" fill="#7c4936">Candidata para producción · ilustraciones y revisión artística pendientes</text>
    <g stroke="#b75836" stroke-width="3" stroke-dasharray="14 8"><path d="M100 ${contract.headTopY}H1948M100 ${contract.groundY}H1948M1024 230V1900"/></g>
    <g fill="none" stroke="#466d82" stroke-width="8"><ellipse cx="1024" cy="540" rx="170" ry="210"/>${line("NECK","WAIST")}${line("SHOULDER_R","SHOULDER_L")}${line("SHOULDER_R","HAND_R")}${line("SHOULDER_L","HAND_L")}${line("WAIST","FOOT_R")}${line("WAIST","FOOT_L")}</g>
    ${Object.entries(a).map(([id,[x,y]])=>{
      const left=id.endsWith("_R")||["HEAD","WAIST","WEAPON_HAND"].includes(id);
      return `<circle cx="${x}" cy="${y}" r="12" fill="#ba533b"/><text x="${x+(left?-24:24)}" y="${y+(id==="WEAPON_HAND"?60:-18)}" text-anchor="${left?"end":"start"}" font-family="monospace" font-size="26" fill="#152b3b">${id} (${x},${y})</text>`;
    }).join("")}
    <text x="90" y="1940" font-family="sans-serif" font-size="28" fill="#152b3b">PNG maestro RGBA 2048×2048 · suelo y coronilla compartidos · 3,5 cabezas · laterales anatómicos</text></svg>`;
}
export async function writeCharacterTemplateAudit(output=resolve(root,"artifacts/character-template")) {
  const result=await analyzeCharacterTemplate();
  await mkdir(output,{recursive:true});
  await writeFile(resolve(output,"validation.json"),JSON.stringify(result.report,null,2)+"\n");
  await writeFile(resolve(root,"assets/reference/character-template-v1.svg"),templateSvg(result.contract));
  const symbols=new Map([...result.images.keys()].map((asset,index)=>[asset,`part-${index}`]));
  const definitions=`<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden;pointer-events:none"><defs>${[...result.images].map(([asset,image])=>`<symbol id="${symbols.get(asset)}" viewBox="0 0 ${image.width} ${image.height}" preserveAspectRatio="none"><image href="${image.uri}" width="${image.width}" height="${image.height}"/></symbol>`).join("")}</defs></svg>`;
  const cards=result.variants.map((v)=>`<article><h2>${v.bodyType} · cabello ${v.hair}</h2><p>Δ geometría: ${v.maxTransformError} u · orden: ${v.layerOrderMatches?"coincide":"DIFIERE"} · ${v.bodyHeadRatio} cabezas</p><div class="pair"><section><h3>Combate — constructor real</h3>${renderLayers(v.layers,symbols,v.joints)}</section><section><h3>Dojo — markup real</h3>${renderLayers(v.dojoLayers,symbols,v.joints)}</section></div></article>`).join("");
  await writeFile(resolve(output,"comparison.html"),`<!doctype html><html lang="es"><meta charset="utf-8"><title>Validación de la plantilla artística</title><style>body{margin:0;padding:28px;background:#101722;color:#edf1e6;font:16px/1.5 system-ui}h1,h2,h3{margin:.3em 0}header{max-width:1150px}button{font:inherit;padding:8px}main{display:grid;grid-template-columns:repeat(3,minmax(340px,1fr));gap:18px;margin-top:20px}article{padding:14px;border:1px solid #607481;border-radius:8px;background:#172330}p{font-size:13px;color:#d2dce0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}section{background:#283844;border-radius:5px;padding:6px}h3{font-size:12px}svg{display:block;width:100%;height:auto}.hide-guides .guides{display:none}@media(max-width:1100px){main{grid-template-columns:1fr 1fr}}@media(max-width:700px){main{grid-template-columns:1fr}}</style>${definitions}<header><h1>Plantilla artística común · validación</h1><p>Auditoría geométrica de los recursos actuales. No representa aprobación de prendas ni del estilo definitivo. Los puntos turquesa son pivotes del rig; todas las tarjetas conservan la misma escala y origen. La línea inferior del lienzo no se desplaza para disimular la diferencia entre cuerpos.</p><p>Δ suelo masculino/femenino: ${result.report.measurements.groundDelta} u · Δ coronilla: ${result.report.measurements.headTopDelta} u. Estado: arte definitivo pendiente.</p><button onclick="document.body.classList.toggle('hide-guides')">Mostrar / ocultar pivotes</button></header><main>${cards}</main></html>`);
  return result.report;
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=await writeCharacterTemplateAudit();
  console.log(JSON.stringify({technicalIntegrity:report.technicalIntegrity,productionApproval:report.productionApproval,measurements:report.measurements},null,2));
  if (!report.technicalIntegrity.passed || process.argv.includes("--strict") && !report.productionApproval.approved) process.exitCode=1;
}
