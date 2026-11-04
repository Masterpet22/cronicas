import { VILLAGE_CONTOURS } from "./village-contours.js?v=0.133.0";

// Coordenadas del dibujo original (1678 × 937). El SVG y el fondo escalan juntos.
export const VILLAGE_LIGHTING = Object.freeze({
  headquarters: { windows: "M819 193H891V204H819Z M721 297H748V309H721Z M785 297H825V309H785Z M916 302H952V313H916Z M718 365H746V399H718Z M979 366H993V400H979Z", lamps: [[807,377,18,26],[930,377,18,26],[785,440,21,28],[977,440,21,28]], entrance: [863,393,24,34] },
  dojo: { windows: "", lamps: [[508,503,18,23],[603,491,16,22]], entrance: [567,480,24,30] },
  archive: { windows: "M42 356L99 353V386L42 389Z M145 355L234 359V389L145 386Z M42 437L96 433V464L42 468Z M24 440H34V462H24Z", lamps: [[139,472,16,24],[236,474,16,24]], entrance: [190,471,21,29] },
  shop: { windows: "", lamps: [[1083,456,20,25],[1220,457,20,25]], entrance: [1165,484,22,24] },
  tower: { windows: "M1463 111H1479V125H1463Z M1463 147H1480V161H1463Z M1463 183H1481V197H1463Z M1463 219H1482V234H1463Z M1463 256H1482V272H1463Z M1462 299H1482V311H1462Z M1459 358H1478V372H1459Z", lamps: [[1425,364,13,18],[1534,368,13,18]], entrance: [1466,365,15,22] },
  arena: { windows: "", lamps: [[1267,566,29,26],[1217,716,32,27],[1458,607,22,23],[1600,698,28,28],[1532,748,33,28]], entrance: [1413,820,32,16] },
  inn: { windows: "M146 718L181 715V735L146 739Z M256 719H276V734H256Z M311 713L350 706V725L311 732Z M382 704L402 698V718L382 725Z M63 768L105 778V798L63 787Z M256 786L279 783V809L256 814Z M403 773L427 767V791L403 797Z", lamps: [[221,790,13,20],[383,777,13,20]], entrance: [332,810,24,29] },
  missions: { windows: "", lamps: [[650,790,19,28],[831,795,19,28]], entrance: [744,795,27,24] },
  event: { windows: "", lamps: [[775,614,21,28],[982,615,21,28]], entrance: [862,655,30,16] }
});

export function villageMapHotspots(locations, imageUrl, escapeHtml, missionTargetIds = []) {
  const missionTargets = new Set(missionTargetIds);
  const clips = locations.map(place => `<clipPath id="village-clip-${place.id}"><path d="${VILLAGE_CONTOURS[place.id]}"/></clipPath>`).join("");
  return `<defs>${clips}<radialGradient id="village-lamp-glow"><stop stop-color="#fff3b8" stop-opacity=".85"/><stop offset=".3" stop-color="#ffc75a" stop-opacity=".52"/><stop offset="1" stop-color="#ffb337" stop-opacity="0"/></radialGradient></defs>
    <g class="village-building-light" data-building-light aria-hidden="true" pointer-events="none"><image href="${imageUrl}" width="1678" height="937" preserveAspectRatio="none"/></g>
    ${locations.filter(place => missionTargets.has(place.id)).map(place => `<g class="village-mission-light" data-mission-light="${place.id}" clip-path="url(#village-clip-${place.id})" aria-hidden="true" pointer-events="none"><image href="${imageUrl}" width="1678" height="937" preserveAspectRatio="none"/></g>`).join("")}
    ${locations.map(place => {
      const light = VILLAGE_LIGHTING[place.id], [x, y, rx, ry] = light.entrance;
      const isMissionTarget = missionTargets.has(place.id);
      const locked = place.unlocked === false;
      const targetClass = locked ? " is-locked" : isMissionTarget ? " is-mission-target" : "";
      const targetLabel = locked ? `. Bloqueado. ${escapeHtml(place.reason)}` : isMissionTarget ? ". Destino de misión pendiente" : "";
      return `<g class="village-hotspot hotspot-${place.id}${targetClass}" data-go="${place.id}"${locked ? ' aria-disabled="true"' : ""}${isMissionTarget ? " data-mission-target" : ""} role="button" tabindex="0" aria-label="${escapeHtml(place.name)}: ${escapeHtml(place.description)}${targetLabel}"><path class="hotspot-shape" d="${place.path}"/><g class="hotspot-lighting" aria-hidden="true" pointer-events="none"><path class="hotspot-windows" d="${light.windows}"/>${light.lamps.map(([lx, ly, lrx, lry]) => `<ellipse cx="${lx}" cy="${ly}" rx="${lrx}" ry="${lry}" fill="url(#village-lamp-glow)"/>`).join("")}</g><path class="hotspot-contour" d="${VILLAGE_CONTOURS[place.id]}" aria-hidden="true" pointer-events="none"/><g class="hotspot-entry" aria-hidden="true" pointer-events="none" style="transform-origin:${x}px ${y}px"><ellipse class="hotspot-entry-flash" cx="${x}" cy="${y}" rx="${rx * 2}" ry="${ry * 2}" fill="url(#village-lamp-glow)"/><ellipse class="hotspot-entry-ring" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/></g></g>`;
    }).join("")}`;
}

export function mountVillageMap(root, scope, deps) {
  const map = root.querySelector(".village-map");
  if (!map) return;
  const hotspots = [...map.querySelectorAll(".village-hotspot")];
  const labels = [...map.querySelectorAll("[data-map-label]")];
  const light = map.querySelector("[data-building-light]");
  let hovered = null, focused = null, entering = false, token = 0;
  const highlight = id => {
    if (entering) return;
    hotspots.forEach(button => button.classList.toggle("is-highlighted", button.dataset.go === id));
    labels.forEach(label => label.classList.toggle("visible", label.dataset.mapLabel === id));
    light.classList.toggle("visible", Boolean(id));
    if (id) light.setAttribute("clip-path", `url(#village-clip-${id})`);
  };
  const clearEntry = () => {
    entering = false; token += 1;
    map.classList.remove("is-entering"); map.removeAttribute("aria-busy");
    hotspots.forEach(button => { button.classList.remove("is-entering"); if (!button.classList.contains("is-locked")) button.removeAttribute("aria-disabled"); });
  };
  const enter = async button => {
    if (entering || button.classList.contains("is-locked")) return;
    const id = button.dataset.go;
    highlight(id); entering = true; const entry = ++token;
    deps.warmLocationAssets(id);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.classList.add("is-entering"); map.setAttribute("aria-busy", "true");
    button.classList.add("is-entering");
    hotspots.forEach(hotspot => hotspot.setAttribute("aria-disabled", "true"));
    if (!reduced && !await scope.delay(380)) return;
    if (!scope.isCurrent() || entry !== token) return;
    deps.onNavigate(id);
    root.querySelector("[data-location-stage]")?.classList.add("village-arrival");
  };
  hotspots.forEach(button => {
    const id = button.dataset.go;
    const warm = () => { if (!button.classList.contains("is-locked")) deps.warmLocationAssets(id); };
    scope.listen(button, "mouseenter", () => { hovered = id; highlight(id); });
    scope.listen(button, "mouseleave", () => { hovered = null; highlight(focused); });
    scope.listen(button, "focus", () => { focused = id; highlight(id); });
    scope.listen(button, "blur", () => { focused = null; highlight(hovered); });
    scope.listen(button, "mouseenter", warm, { once: true });
    scope.listen(button, "focus", warm, { once: true });
    scope.listen(button, "click", () => enter(button));
    scope.listen(button, "keydown", event => {
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault(); if (!event.repeat) enter(button);
    });
  });
  scope.listen(map, "keydown", event => { if (event.key === "Escape" && entering) { clearEntry(); highlight(focused || hovered); } });
  scope.onCleanup(() => { clearEntry(); });
}
