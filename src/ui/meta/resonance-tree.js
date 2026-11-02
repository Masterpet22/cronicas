import { LOCKED_SKILL_COLOR, characterCoreColors, skillRegionColor } from "../../skills/colors.js?v=1.0.0";
import { axialToPixel, buildSkillTree, hexDistance } from "../../skills/definitions.js?v=1.0.0";
import { resonancePoints, skillLevel, skillState, skillTreeNodes } from "../../skills/progression.js?v=1.0.0";

import { hexBoundarySegments } from "../../skills/hex-boundaries.js?v=1.0.0";

import { characterResonanceSymbol } from "../../skills/character-symbol.js?v=1.0.0";

const PATHS = {
  strike: "M-13 12 10-11M2-13l12 1-1 12M-14-1l15 15M-9 4l-5 10 10-5",
  burst: "M0-17 4-6 15-10 9 0 18 5 6 7 3 18-3 8-15 12-9 1-18-5-5-6Z",
  shield: "M0-16 14-10v11c0 9-14 17-14 17S-14 10-14 1v-11Z M0-10v20",
  seal: "M0-16v7M0 9v7M-16 0h7M9 0h7M-11-11l5 5M6 6l5 5M-11 11l5-5M6-6l5-5M7 0a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  flame: "M0-18c4 10 14 13 13 23C12 21-12 21-13 6c0-5 2-8 6-12-2 8 1 9 3 9 5-4 7-12 4-21Z",
  step: "M-15 10h14M-11 16H4M-8-7l9-6 7 6-6 8 12 5M1-13l-4 12-10 5M8-7l8-1",
  bind: "M-4-8-8-12a7 7 0 0 0-10 10l9 9a7 7 0 0 0 10 0M4 8l4 4A7 7 0 0 0 18 2L9-7A7 7 0 0 0-1-7M-6-6 6 6",
  crown: "M-16-9-11 11h22l5-20L6 0 0-15-6 0ZM-10 16h20",
  target: "M15 0a15 15 0 1 1-15-15M7 0a7 7 0 1 1-7-7M0 0 16-16M8-16h8v8",
  eye: "M-19 0S-11-12 0-12 19 0 19 0 11 12 0 12-19 0-19 0ZM6 0A6 6 0 1 1-6 0 6 6 0 0 1 6 0"
};
export const hexPoints = (radius = 41) => Array.from({ length: 6 }, (_,i) => `${Math.cos(i*Math.PI/3)*radius},${Math.sin(i*Math.PI/3)*radius}`).join(" ");
const SKILL_LAYOUT_BRIDGES = ["affinity-1-2","affinity-2-3","affinity-1-3"];
const labels = { locked: "BLOQUEADA", available: "DISPONIBLE", unlocked: "APRENDIDA", upgraded: "MEJORADA" };

export function treeBounds(nodes) {
  const positions = nodes.map(n => axialToPixel(n.q,n.r));
  const left = Math.min(...positions.map(p => p.x))-56;
  const right = Math.max(...positions.map(p => p.x))+56;
  const top = Math.min(...positions.map(p => p.y))-56;
  const bottom = Math.max(...positions.map(p => p.y))+76;
  return { x:left, y:top, width:right-left, height:bottom-top };
}
export const viewBox = view => `${view.x} ${view.y} ${view.width} ${view.height}`;

export function resonanceTreeMarkup(save,deps,selectedId,view) {
  const escape = deps.escapeHtml;
  const nodes = skillTreeNodes(save);
  const cells = nodes;
  const selected = nodes.find(node => node.id===selectedId);
  const colorOf = cell => skillRegionColor(save,cell);
  const bounds = treeBounds(cells);
  const regionColors = new Map();
  const regions = [
    { id:"physical",nodes:cells.filter(node => node.category === "physical") },
    ...[0,1,2].map(slot => ({ id:`affinity-${slot+1}`,nodes:cells.filter(node => node.category === "affinity" && node.slot===slot) })),
    ...SKILL_LAYOUT_BRIDGES.map(id => ({ id,nodes:cells.filter(node => node.bridge===id),hybrid:true }))
  ].map(region => {
    const active=region.nodes.some(node => skillState(save,node)!=="locked");
    const color = active ? colorOf(region.nodes[0]) : LOCKED_SKILL_COLOR;
    regionColors.set(region.id,color);
    const outline = hexBoundarySegments(region.nodes).map(e => `M${e.x1},${e.y1}L${e.x2},${e.y2}`).join(" ");
    return `<g class="resonance-region ${region.hybrid ? "is-hybrid-region" : ""}" ${region.hybrid ? "data-bridge-region" : "data-region"}="${region.id}" data-region-color="${color}" style="--region-color:${color}" aria-hidden="true"><path class="resonance-region-shadow" d="${outline}"/><path class="resonance-region-border" d="${outline}"/></g>`;
  }).join("");
  const graph = [{ id:"core",q:0,r:0 },...nodes];
  const lines = graph.flatMap((node,i) => graph.slice(i+1).filter(other => hexDistance(node,other)===1).map(other => {
    const a=axialToPixel(node.q,node.r), b=axialToPixel(other.q,other.r);
    const developed=(node.id === "core" || skillLevel(save,node)) && skillLevel(save,other);
    return `<line class="resonance-link ${developed ? "is-developed" : ""}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
  })).join("");
  const renderedCells = nodes.map(node => {
    const cell = cells.find(cell => cell.id===node.cellId);
    const state=skillState(save,node), level=skillLevel(save,node);
    const { x,y }=axialToPixel(node.q,node.r), color=state === "locked" ? LOCKED_SKILL_COLOR : colorOf(cell);
    const physicalSlot=(save.taijutsuLoadout || []).indexOf(node.id), slot=save.loadout.indexOf(node.id);
    const equipped=physicalSlot>=0 || slot>=0;
    const status=physicalSlot>=0 ? `EN COMBATE · TAIJUTSU ${physicalSlot+1}` : slot>=0 ? `EN COMBATE · RANURA ${slot+1}` : labels[state];
    const stamps=node.affinityIds.map((id,i) => `<image class="resonance-element-stamp" href="${deps.elementIcon(id)}" x="${node.affinityIds.length>1 ? -17+i*14 : -8}" y="-31" width="16" height="16" aria-hidden="true"/>`).join("");
    return `<g class="resonance-node is-${state} ${cell.category === "hybrid" ? "is-hybrid" : ""} ${selected?.cellId===cell.id ? "is-selected" : ""}" transform="translate(${x} ${y})" style="--node-color:${color}" role="button" tabindex="0" aria-pressed="${selected?.cellId===cell.id}" aria-label="${escape(node.name)}. ${status}. Nivel ${level} de ${node.maxLevel}" data-skill-select="${node.id}" data-cell-id="${cell.id}" data-q="${node.q}" data-r="${node.r}" data-category="${cell.category}" data-slot="${cell.slot ?? ""}" data-bridge="${cell.bridge || ""}" data-state="${state}" data-node-color="${color}"><title>${escape(node.name)} · ${status}</title><polygon class="resonance-hex-outline" points="${hexPoints(44)}"/><polygon class="resonance-hex" points="${hexPoints()}" stroke="${color}"/><polygon class="resonance-hex-inset" points="${hexPoints(35)}"/>${stamps}<path class="resonance-glyph" d="${PATHS[node.icon] || PATHS.seal}" stroke="${color}"/>${state === "locked" ? '<g class="resonance-lock" transform="translate(17 15)"><rect x="-5" y="0" width="10" height="9" rx="1"/><path d="M-3 0v-3a3 3 0 0 1 6 0v3"/></g>' : `<text class="resonance-level" x="0" y="28" text-anchor="middle">${level ? `${level}/${node.maxLevel}` : "+"}</text>`}${equipped ? '<circle class="resonance-equipped" cx="25" cy="-19" r="5"/>' : ""}<text class="skill-state" aria-hidden="true">${escape(status)}</text></g>`;
  }).join("");
  const identity=characterResonanceSymbol(save.character);
  const coreColors=characterCoreColors(save.character);
  const emblem=identity.month ? `<text class="resonance-month-kanji ${identity.symbol.length>1 ? "is-double" : ""}" text-anchor="middle" y="12" data-core-kanji>${identity.symbol}</text>`
    : '<g class="resonance-yinyang" aria-hidden="true"><circle class="yin-disc" r="22"/><path class="yin-dark" d="M0-22A22 22 0 0 1 0 22Z"/><circle class="yin-dark" cy="-11" r="11"/><circle class="yin-light" cy="11" r="11"/><circle class="yin-light" cy="-11" r="3"/><circle class="yin-dark" cy="11" r="3"/></g>';
  const core=`<g class="resonance-core ${selectedId === "core" ? "is-selected" : ""}" role="button" tabindex="0" aria-label="Núcleo de ${escape(save.character.name)}. ${escape(identity.label)}. Centrar el árbol" data-tree-core data-core-color="${coreColors.fill}" style="--core-color:${coreColors.fill};--core-ink:${coreColors.ink}" data-character-symbol="${identity.symbol}"><title>${escape(save.character.name)} · ${escape(identity.label)}</title><polygon points="${hexPoints(44)}"/>${emblem}<text class="resonance-core-label" text-anchor="middle" y="33">PERSONAJE</text></g>`;
  const categories=[
    [regionColors.get("physical"),"Físicas"],
    ...[0,1,2].map(slot => [regionColors.get(`affinity-${slot+1}`),`A${slot+1}${save.character.affinities[slot] ? ` · ${deps.elementName(save.character.affinities[slot])}` : ""}`]),
    ...SKILL_LAYOUT_BRIDGES.map(id => [regionColors.get(id),id.replace("affinity-", "A").replace("-"," + A")])
  ].map(([color,label]) => `<span><i style="background:${color}"></i>${escape(label)}</span>`).join("");
  const developed=nodes.filter(n => skillLevel(save,n)>0 && skillState(save,n)!=="locked").length;
  return `<section class="resonance-tree skill-tree" aria-label="Árbol de habilidades de Resonancia"><header class="resonance-heading"><div><p class="eyebrow">EL CAMINO DEL SHINOBI</p><h3>Núcleo de Resonancia</h3></div><span class="resonance-points"><b data-resonance-points>${resonancePoints(save)}</b><span>PUNTOS<br>DISPONIBLES</span></span></header><div class="resonance-viewport"><svg class="resonance-canvas" viewBox="${viewBox(view || bounds)}" aria-label="Panal de 39 celdas. Tab recorre, Enter selecciona, flechas desplazan y más o menos amplían." data-tree-canvas><g aria-hidden="true">${lines}</g>${regions}${renderedCells}${core}</svg><nav class="resonance-controls" aria-label="Navegación del árbol"><button type="button" data-tree-zoom="out" aria-label="Alejar árbol">−</button><button type="button" data-tree-zoom="in" aria-label="Acercar árbol">+</button><button type="button" data-tree-fit aria-label="Mostrar árbol completo">⛶</button><button type="button" data-tree-center aria-label="Centrar en Resonancia">◎</button></nav><span class="resonance-navigation-hint">Arrastra para explorar · Rueda para ampliar</span></div><footer><div class="resonance-category-legend">${categories}</div><div class="resonance-legend"><span><i class="locked"></i>Bloqueada</span><span><i class="available"></i>Disponible</span><span><i class="unlocked"></i>Aprendida</span><span><i class="upgraded"></i>Mejorada</span><small>${developed}/38 habilidades · Personaje central</small></div></footer></section>`;
}

export function mountResonanceNavigation(host,scope,callbacks) {
  let drag = null;
  let dragged = false;
  const svg = () => host.querySelector("[data-tree-canvas]");
  const bounds = () => treeBounds(buildSkillTree(callbacks.getSave().character.affinities,callbacks.getSave().campaign.elementRank));
  const current = () => callbacks.getView() || bounds();
  const update = view => { callbacks.setView(view); svg()?.setAttribute("viewBox",viewBox(view)); };
  const point = event => {
    const canvas = svg();
    return new DOMPoint(event.clientX,event.clientY).matrixTransform(canvas.getScreenCTM().inverse());
  };
  const zoom = (factor,anchor) => {
    const view = current(), full = bounds();
    const width = Math.max(full.width/3,Math.min(full.width*1.6,view.width*factor));
    const scale = width/view.width;
    const center = anchor || { x:view.x+view.width/2, y:view.y+view.height/2 };
    update({ x:center.x+(view.x-center.x)*scale, y:center.y+(view.y-center.y)*scale, width, height:view.height*scale });
  };
  scope.listen(host,"wheel",event => {
    if (!event.target.closest(".resonance-viewport")) return;
    event.preventDefault(); zoom(event.deltaY > 0 ? 1.12 : .89,point(event));
  },{ passive:false });
  scope.listen(host,"pointerdown",event => {
    if (!event.target.closest("[data-tree-canvas]") || event.button !== 0) return;
    const p = point(event);
    drag = { id:event.pointerId, x:p.x,y:p.y,clientX:event.clientX,clientY:event.clientY,view:{ ...current() } };
    dragged = false;
    // Capture only after movement, so ordinary clicks and hover stay native.
  });
  scope.listen(host,"pointermove",event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (Math.hypot(event.clientX-drag.clientX,event.clientY-drag.clientY)<5 && !dragged) return;
    if (!dragged) { svg().setPointerCapture(event.pointerId); dragged = true; }
    const canvas = svg(), matrix = canvas.getScreenCTM();
    update({ ...drag.view, x:drag.view.x-(event.clientX-drag.clientX)/matrix.a, y:drag.view.y-(event.clientY-drag.clientY)/matrix.d });
  });
  const end = event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (svg()?.hasPointerCapture(event.pointerId)) svg().releasePointerCapture(event.pointerId);
    drag = null;
  };
  scope.listen(host,"pointerup",end);
  scope.listen(host,"pointercancel",end);
  scope.listen(host,"click",event => {
    if (dragged && event.target.closest("[data-tree-canvas]")) { dragged = false; return; }
    const target = event.target.closest("[data-skill-select],[data-tree-core],[data-tree-zoom],[data-tree-fit],[data-tree-center]");
    if (!target) return;
    if (target.dataset.skillSelect) callbacks.onInspect(target.dataset.skillSelect);
    else if (target.hasAttribute("data-tree-fit")) update(bounds());
    else if (target.hasAttribute("data-tree-core") || target.hasAttribute("data-tree-center")) {
      const view = current(); update({ ...view,x:-view.width/2,y:-view.height/2 }); callbacks.onCore();
    } else zoom(target.dataset.treeZoom === "in" ? .8 : 1.25);
  });
  scope.listen(host,"pointerover",event => {
    if (drag) return;
    const node = event.target.closest("[data-skill-select]");
    if (node && !node.contains(event.relatedTarget)) callbacks.onHover(node.dataset.skillSelect);
  });
  scope.listen(host,"pointerout",event => {
    if (event.target.closest("[data-tree-canvas]") && !event.relatedTarget?.closest?.("[data-tree-canvas]")) callbacks.onHover(null);
  });
  scope.listen(host,"focusin",event => {
    const node = event.target.closest("[data-skill-select]");
    if (node) callbacks.onInspect(node.dataset.skillSelect);
  });
  scope.listen(host,"keydown",event => {
    if (!event.target.closest("[data-tree-canvas]")) return;
    if (["Enter"," "].includes(event.key)) { event.preventDefault(); event.target.closest("[role=button]")?.dispatchEvent(new MouseEvent("click",{ bubbles:true })); }
    else if (["+","=","-"].includes(event.key)) { event.preventDefault(); zoom(event.key === "-" ? 1.25 : .8); }
    else if (event.key === "Home") { event.preventDefault(); update(bounds()); }
    else if (event.key.startsWith("Arrow")) {
      event.preventDefault(); const view = current(), step = view.width*.08;
      update({ ...view,x:view.x+(event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),y:view.y+(event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) });
    }
  });
  scope.onCleanup(() => { drag = null; });
}
