import { PHYSICAL_COLOR, axialToPixel, buildSkillTree, hexDistance } from "../../skills/definitions.js?v=1.0.0";
import { resonancePoints, skillLevel, skillState, skillTreeNodes } from "../../skills/progression.js?v=1.0.0";

import { hexBoundarySegments } from "../../skills/hex-boundaries.js?v=1.0.0";

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
const colorFor = (deps,id) => id ? `#${deps.elements[id].color.toString(16).padStart(6,"0")}` : "#68727d";
const labels = { locked: "BLOQUEADA", available: "DISPONIBLE", unlocked: "APRENDIDA", upgraded: "MEJORADA" };

export function treeBounds(nodes) {
  const positions = nodes.map(n => axialToPixel(n.q,n.r));
  const left = Math.min(...positions.map(p => p.x))-60;
  const right = Math.max(...positions.map(p => p.x))+60;
  const top = Math.min(...positions.map(p => p.y))-90;
  const bottom = Math.max(...positions.map(p => p.y))+100;
  return { x:left, y:top, width:right-left, height:bottom-top };
}
export const viewBox = view => `${view.x} ${view.y} ${view.width} ${view.height}`;

export function resonanceTreeMarkup(save, deps, selectedId, view) {
  const escape = deps.escapeHtml;
  const affinities = save.character.affinities;
  const nodes = skillTreeNodes(save);
  const bounds = treeBounds(nodes);
  const colors = node => node.category === "physical" ? [PHYSICAL_COLOR,PHYSICAL_COLOR] : [colorFor(deps,node.affinityIds[0]),colorFor(deps,node.affinityIds[1] || node.affinityIds[0])];
  const gradients = nodes.map(node => {
    const [a,b] = colors(node);
    return `<linearGradient id="res-${node.id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  }).join("");
  const regions = [
    { id:"physical", color:PHYSICAL_COLOR, nodes:nodes.filter(node => node.category === "physical") },
    ...Array.from({ length:3 },(_,slot) => ({ id:`affinity-${slot+1}`, color:colorFor(deps,affinities[slot]), nodes:nodes.filter(node => node.category === "affinity" && node.slot === slot) }))
  ].map(region => {
    const edges = hexBoundarySegments(region.nodes);
    const outline = edges.map(edge => `M${edge.x1},${edge.y1}L${edge.x2},${edge.y2}`).join(" ");
    return `<g class="resonance-region" data-region="${region.id}" data-region-color="${region.color}" style="--region-color:${region.color}" aria-hidden="true"><path class="resonance-region-shadow" d="${outline}"/><path class="resonance-region-border" d="${outline}"/></g>`;
  }).join("");
  const graph = [{ id:"core", q:0,r:0 }, ...nodes];
  const lines = graph.flatMap((node,i) => graph.slice(i+1).filter(other => hexDistance(node,other) === 1).map(other => {
    const a = axialToPixel(node.q,node.r), b = axialToPixel(other.q,other.r);
    const developed = (node.id === "core" || skillLevel(save,node)) && skillLevel(save,other);
    const available = [node,other].some(n => n.id !== "core" && skillState(save,n) === "available");
    return `<line class="resonance-link ${developed ? "is-developed" : available ? "is-available" : ""}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
  })).join("");
  const cells = nodes.map(node => {
    const { x,y } = axialToPixel(node.q,node.r);
    const state = skillState(save,node), level = skillLevel(save,node);
    const physicalSlot = (save.taijutsuLoadout || []).indexOf(node.id);
    const equippedSlot = physicalSlot >= 0 ? physicalSlot : save.loadout.indexOf(node.id);
    const status = physicalSlot >= 0 ? `EN COMBATE · TAIJUTSU ${physicalSlot+1}` : equippedSlot >= 0 ? `EN COMBATE · RANURA ${equippedSlot+1}` : labels[state];
    const [a] = colors(node);
    const stamps = node.affinityIds.map((id,i) => `<image class="resonance-element-stamp" href="${deps.elementIcon(id)}" x="${node.affinityIds.length > 1 ? -17+i*14 : -8}" y="-31" width="16" height="16" aria-hidden="true"/>`).join("");
    return `<g class="resonance-node is-${state} ${node.category === "hybrid" ? "is-hybrid" : ""} ${selectedId === node.id ? "is-selected" : ""}" transform="translate(${x} ${y})" style="--node-color:${a}" role="button" tabindex="0" aria-pressed="${selectedId === node.id}" aria-label="${escape(node.name)}. ${status}. Nivel ${level} de ${node.maxLevel}" data-skill-select="${node.id}" data-category="${node.category}" data-slot="${node.slot ?? ""}" data-state="${state}"><title>${escape(node.name)} · ${status}</title><polygon class="resonance-hex-outline" points="${hexPoints(44)}"/><polygon class="resonance-hex" points="${hexPoints()}" stroke="url(#res-${node.id})"/><polygon class="resonance-hex-inset" points="${hexPoints(35)}"/>${stamps}<path class="resonance-glyph" d="${PATHS[node.icon] || PATHS.seal}" stroke="url(#res-${node.id})"/>${state === "locked" ? '<g class="resonance-lock" transform="translate(17 15)"><rect x="-5" y="0" width="10" height="9" rx="1"/><path d="M-3 0v-3a3 3 0 0 1 6 0v3"/></g>' : `<text class="resonance-level" x="0" y="28" text-anchor="middle">${level ? `${level}/${node.maxLevel}` : "+"}</text>`}${equippedSlot >= 0 ? '<circle class="resonance-equipped" cx="25" cy="-19" r="5"/>' : ""}<text class="skill-state" aria-hidden="true">${escape(status)}</text></g>`;
  }).join("");
  const positions = nodes.map(n => ({ ...axialToPixel(n.q,n.r), node:n }));
  const topLabel = Math.min(...positions.map(p => p.y))-65;
  const bottomLabel = Math.max(...positions.map(p => p.y))+65;
  const captions = [
    `<g class="resonance-caption physical" style="fill:${PHYSICAL_COLOR}" transform="translate(0 ${topLabel})"><text text-anchor="middle">FÍSICAS</text><text class="resonance-caption-sub" y="18" text-anchor="middle">CUERPO · DISCIPLINA</text></g>`,
    ...affinities.concat(Array(3).fill(null)).slice(0,3).map((id,i) => {
      const branch = positions.filter(p => p.node.slot === i || p.node.advanced && (i === 0 ? p.node.q < -2 : i === 1 ? p.node.q > 2 && p.y < 0 : false));
      const captionPositions = [[-240,Math.min(...branch.map(p => p.y))-58],[240,Math.min(...branch.map(p => p.y))-58],[0,bottomLabel]];
      return `<g class="resonance-caption" style="fill:${colorFor(deps,id)}" transform="translate(${captionPositions[i][0]} ${captionPositions[i][1]})"><text text-anchor="middle">AFINIDAD ${i+1}</text><text class="resonance-caption-sub" text-anchor="middle" y="18">${id ? escape(deps.elementName(id).toUpperCase()) : "POR DESCUBRIR"}</text></g>`;
    })
  ].join("");
  const developed = nodes.filter(n => skillLevel(save,n)>0 && skillState(save,n) !== "locked").length;
  return `<section class="resonance-tree skill-tree" aria-label="Árbol de habilidades de Resonancia"><header class="resonance-heading"><div><p class="eyebrow">EL CAMINO DEL SHINOBI</p><h3>Núcleo de Resonancia</h3></div><span class="resonance-points"><b data-resonance-points>${resonancePoints(save)}</b><span>PUNTOS<br>DISPONIBLES</span></span></header><div class="resonance-viewport"><svg class="resonance-canvas" viewBox="${viewBox(view || bounds)}" aria-label="Panal de habilidades. Usa Tab para recorrer, Enter para seleccionar; flechas para desplazar y más o menos para ampliar." data-tree-canvas><defs>${gradients}<radialGradient id="res-core"><stop stop-color="#5f5139"/><stop offset="1" stop-color="#171917"/></radialGradient></defs><g class="resonance-guides" aria-hidden="true"><circle r="63"/><circle r="224"/><path d="M0-340V340M-310 0H310"/></g><g aria-hidden="true">${lines}</g>${regions}${cells}<g class="resonance-core ${selectedId === "core" ? "is-selected" : ""}" role="button" tabindex="0" aria-label="Núcleo de Resonancia. Centrar el árbol" data-tree-core><polygon points="${hexPoints(45)}"/><circle r="30"/><path d="M0-22a22 22 0 0 1 0 44A11 11 0 0 1 0 0a11 11 0 0 0 0-22Z"/><circle cy="-11" r="3"/><circle cy="11" r="3"/><text text-anchor="middle" y="35">RESONANCIA</text></g>${captions}</svg><nav class="resonance-controls" aria-label="Navegación del árbol"><button type="button" data-tree-zoom="out" aria-label="Alejar árbol">−</button><button type="button" data-tree-zoom="in" aria-label="Acercar árbol">+</button><button type="button" data-tree-fit aria-label="Mostrar árbol completo" title="Mostrar árbol completo">⛶</button><button type="button" data-tree-center aria-label="Centrar en Resonancia" title="Centrar en Resonancia">◎</button></nav><span class="resonance-navigation-hint">Arrastra para explorar · Rueda para ampliar</span></div><footer class="resonance-legend"><span><i class="locked"></i>Bloqueada</span><span><i class="available"></i>Disponible</span><span><i class="unlocked"></i>Aprendida</span><span><i class="upgraded"></i>Mejorada</span><small>${developed}/${nodes.length} nodos</small></footer></section>`;
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
