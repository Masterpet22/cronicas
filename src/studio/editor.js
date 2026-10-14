/**
 * Controlador visual de Crónicas Studio.
 * Une calibración, autoría por fotogramas clave, timeline, historial y exportación.
 */
import {
  PUPPET_JOINTS as JOINTS,
  PUPPET_JOINT_PARENTS as PARENTS,
  PUPPET_PART_JOINTS as PART_JOINTS,
  PUPPET_TARGETS
} from "../animations/rig.js?v=0.45.3";
import { animationEase } from "../animations/runtime.js?v=0.45.3";
import {
  createStudioProject,
  normalizeStudioProject,
  parseStudioProject,
  serializeStudioProject,
  STUDIO_EASES,
  validateStudioProject
} from "../animations/studio-format.js?v=0.45.3";
import { sampleStudioAnimation } from "../animations/studio-runtime.js?v=0.45.3";
import { collectPsdLayers, normalizeLayerId, uniquePartId } from "./psd-layers.js?v=0.47.1";

const $ = (id) => document.getElementById(id);
const BASE_SCALE = 0.32;
const STORAGE_KEY = "cronicas-studio:project";
const MAX_SPRITE_FILE_SIZE = 25 * 1024 * 1024;
const MAX_SPRITE_DIMENSION = 4096;
const MAX_PSD_MEMORY = 256 * 1024 * 1024;
const TARGETS = [...new Set(["rig", "torso", ...Object.keys(JOINTS)])];
const LABELS = {
  rig: "Torso",
  torso: "Pieza del torso",
  neck: "Cuello",
  shoulderRight: "Hombro derecho",
  elbowRight: "Codo derecho",
  wristRight: "Muñeca derecha",
  shoulderLeft: "Hombro izquierdo",
  elbowLeft: "Codo izquierdo",
  wristLeft: "Muñeca izquierda",
  hipRight: "Cadera derecha",
  kneeRight: "Rodilla derecha",
  ankleRight: "Tobillo derecho",
  hipLeft: "Cadera izquierda",
  kneeLeft: "Rodilla izquierda",
  ankleLeft: "Tobillo izquierdo"
};
const TREE = [{ id: "rig", children: [
  { id: "neck" },
  { id: "shoulderRight", children: [{ id: "elbowRight", children: [{ id: "wristRight" }] }] },
  { id: "shoulderLeft", children: [{ id: "elbowLeft", children: [{ id: "wristLeft" }] }] },
  { id: "hipRight", children: [{ id: "kneeRight", children: [{ id: "ankleRight" }] }] },
  { id: "hipLeft", children: [{ id: "kneeLeft", children: [{ id: "ankleLeft" }] }] }
]}];
const PRESET = [
  ["pie_derecho", -175.526, 732.316], ["brazo_izquierdo", 161.481, -174.474, "brazo_derecho"],
  ["mano_derecha", -291.203, 251.237], ["muslo_izquierdo", 117.315, 255.895],
  ["torso", -41, -72.5], ["muslo_derecho", -93.789, 261.869],
  ["pie_izquierdo", 153.763, 715.421], ["pierna_derecha", -140.026, 527.974],
  ["pierna_izquierda", 151.263, 520.474], ["brazo_derecho", -242.955, -164.184, "brazo_izquierdo"],
  ["antebrazo_derecho", -315.639, 62.658], ["antebrazo_izquierdo", 278.403, 24.447],
  ["mano_izquierda", 355.423, 215.474], ["cabeza", -10.737, -498.684]
];
const TRANSFORM_FIELDS = {
  x: "key-x", y: "key-y", angle: "key-angle", alpha: "key-alpha",
  scaleX: "key-scale-x", scaleY: "key-scale-y"
};

const freshParts = () => PRESET.map(([id, x, y, assetId], z) => ({
  id, x, y, assetId: assetId || id, rotation: 0, scaleX: 1, scaleY: 1, visible: true, z
}));
const freshProject = () => ({ version: 2, fps: 24, parts: freshParts(), clip: createStudioProject() });
const label = (id) => LABELS[id] || id.replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase());
const partLabel = (itemOrId) => {
  const item = typeof itemOrId === "string" ? project.parts.find((candidate) => candidate.id === itemOrId) : itemOrId;
  return item?.displayName || label(item?.id || itemOrId);
};

let project = freshProject();
let mode = "animador";
let leftTab = "skeleton";
let rightTab = "inspector";
let tool = "select";
let selectedTarget = "rig";
let selectedPart = "torso";
let selectedParts = new Set(["torso"]);
let partSelectionAnchor = "torso";
let selectedKeys = new Set();
let keyClipboard = [];
let hiddenTargets = new Set();
let lockedTargets = new Set();
let lockedParts = new Set();
let time = 0;
let zoom = 1;
let timelineZoom = 1;
let offsetX = 0;
let offsetY = 0;
let playing = false;
let lastTick = 0;
let animationFrame = 0;
let interaction = null;
let dragKey = null;
let undoHistory = [];
let historyIndex = -1;

const canvas = $("canvas");
const context = canvas.getContext("2d");
const previewCanvas = $("preview-canvas");
const previewContext = previewCanvas.getContext("2d");
const images = {};

function status(message) { $("status").textContent = message; }
function duration() { return project.clip.animation.duration; }
function fps() { return Number(project.fps || 24); }
function part() { return project.parts.find((item) => item.id === selectedPart); }
function selectedPartItems() { return project.parts.filter((item) => selectedParts.has(item.id)); }
function pose(at = time) { return sampleStudioAnimation(project.clip, at, PUPPET_TARGETS); }
function snapshot() { return JSON.stringify(project); }

function visibleLayerItems() {
  const search = $("search").value.trim().toLocaleLowerCase();
  return [...project.parts]
    .sort((left, right) => right.z - left.z)
    .filter((item) => partLabel(item).toLocaleLowerCase().includes(search));
}

function selectSinglePart(id) {
  selectedPart = id;
  selectedParts = new Set([id]);
  partSelectionAnchor = id;
}

function syncPartSelection() {
  const available = new Set(project.parts.map((item) => item.id));
  selectedParts = new Set([...selectedParts].filter((id) => available.has(id)));
  if (!available.has(selectedPart)) selectedPart = selectedParts.values().next().value || project.parts[0]?.id || "torso";
  if (!selectedParts.size && available.has(selectedPart)) selectedParts.add(selectedPart);
  if (!available.has(partSelectionAnchor)) partSelectionAnchor = selectedPart;
}

function selectPartRange(toId) {
  const items = visibleLayerItems();
  const anchorIndex = Math.max(0, items.findIndex((item) => item.id === partSelectionAnchor));
  const targetIndex = items.findIndex((item) => item.id === toId);
  if (targetIndex < 0) return;
  const [start, end] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  selectedParts = new Set(items.slice(start, end + 1).map((item) => item.id));
  selectedPart = toId;
}

function handlePartSelection(item, event) {
  if (event.shiftKey) {
    selectPartRange(item.id);
  } else if (event.ctrlKey || event.metaKey) {
    if (selectedParts.has(item.id) && selectedParts.size > 1) selectedParts.delete(item.id);
    else selectedParts.add(item.id);
    selectedPart = selectedParts.has(item.id) ? item.id : selectedParts.values().next().value;
    partSelectionAnchor = item.id;
  } else {
    selectSinglePart(item.id);
  }
  refresh();
}

function setToolbarMore(open) {
  const button = $("toolbar-more");
  const panel = $("toolbar-more-panel");
  panel.classList.toggle("open", open);
  button.setAttribute("aria-expanded", String(open));
  button.querySelector("span").textContent = open ? "▴" : "▾";
}

function normalizeLoadedProject(candidate) {
  if (candidate?.clip) {
    if (!Array.isArray(candidate.parts)) throw new Error("El proyecto no contiene piezas");
    const clip = parseStudioProject(JSON.stringify(candidate.clip), { allowedTargets: PUPPET_TARGETS });
    return { version: 2, fps: Number(candidate.fps || 24), parts: candidate.parts, clip };
  }
  const clip = parseStudioProject(JSON.stringify(candidate), { allowedTargets: PUPPET_TARGETS });
  return { version: 2, fps: 24, parts: freshParts(), clip };
}

function loadInitialProject() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (stored) return normalizeLoadedProject(stored);
    const legacy = JSON.parse(localStorage.getItem("cronicas-studio:calibration:male") || "null");
    if (legacy?.version === 2 && Array.isArray(legacy.parts)) {
      const next = freshProject();
      const byId = new Map(legacy.parts.map((item) => [item.id, item]));
      next.parts.forEach((item) => Object.assign(item, byId.get(item.id) || {}));
      return next;
    }
  } catch (error) {
    console.warn("Se ignoró una copia local inválida", error);
  }
  return freshProject();
}

function saveLocal(message = null) {
  project.clip = normalizeStudioProject(project.clip);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    if (message) status(message);
    return true;
  } catch (error) {
    console.warn("No se pudo guardar la copia local", error);
    status("El navegador no permitió guardar la copia local; exporta el proyecto para no perder cambios");
    return false;
  }
}

function checkpoint(changeLabel = "Estado actualizado") {
  const current = snapshot();
  if (undoHistory[historyIndex]?.snapshot === current) return;
  undoHistory.splice(historyIndex + 1);
  undoHistory.push({ snapshot: current, label: changeLabel });
  if (undoHistory.length > 80) undoHistory.shift();
  historyIndex = undoHistory.length - 1;
  updateHistoryButtons();
}

function commit(message) {
  const saved = saveLocal();
  checkpoint(message || "Estado actualizado");
  if (message && saved) status(message);
}

function restoreHistory(index) {
  if (index < 0 || index >= undoHistory.length) return;
  const previousIndex = historyIndex;
  const previousEntry = undoHistory[previousIndex];
  historyIndex = index;
  const entry = undoHistory[historyIndex];
  project = JSON.parse(entry.snapshot);
  project.clip = normalizeStudioProject(project.clip);
  syncPartSelection();
  time = Math.min(time, duration());
  ensureImages();
  const saved = saveLocal();
  refresh();
  updateHistoryButtons();
  if (!saved) return;
  if (index === previousIndex - 1) status(`Deshecho: ${previousEntry.label}`);
  else if (index === previousIndex + 1) status(`Rehecho: ${entry.label}`);
  else status(`Restaurado: ${entry.label}`);
}

function updateHistoryButtons() {
  const cannotUndo = historyIndex <= 0;
  const cannotRedo = historyIndex >= undoHistory.length - 1;
  ["undo", "history-undo"].forEach((id) => { $(id).disabled = cannotUndo; });
  ["redo", "history-redo"].forEach((id) => { $(id).disabled = cannotRedo; });
  renderChangeHistory();
}

function renderChangeHistory() {
  const host = $("change-history");
  host.replaceChildren();
  [...undoHistory].reverse().forEach((entry, reverseIndex) => {
    const index = undoHistory.length - reverseIndex - 1;
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.className = `history-entry${index === historyIndex ? " current" : ""}${index > historyIndex ? " future" : ""}`;
    button.type = "button";
    button.title = `Volver a: ${entry.label}`;
    button.setAttribute("aria-current", index === historyIndex ? "step" : "false");
    const step = document.createElement("span");
    step.className = "history-step";
    step.textContent = String(index + 1).padStart(2, "0");
    const change = document.createElement("span");
    change.className = "history-label";
    change.textContent = entry.label;
    button.append(step, change);
    button.onclick = () => restoreHistory(index);
    item.append(button);
    host.append(item);
  });
}

function ensureImages() {
  project.parts.forEach((item) => {
    const source = item.sprite?.dataUrl || `./assets/modular/man_sprites/runtime/${encodeURIComponent(item.assetId || item.id)}.png`;
    const sourceKey = item.sprite?.key || (item.sprite?.dataUrl
      ? `${item.sprite.name}:${item.sprite.dataUrl.length}:${item.sprite.dataUrl.slice(-24)}`
      : item.assetId);
    if (images[item.id]?.dataset.sourceKey === sourceKey) return;
    const image = new Image();
    image.dataset.sourceKey = sourceKey;
    image.src = source;
    image.onload = draw;
    images[item.id] = image;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("El PNG no contiene una imagen válida"));
    image.src = source;
  });
}

function validateSpriteDimensions(width, height) {
  if (!width || !height) throw new Error("El sprite está vacío");
  if (width > MAX_SPRITE_DIMENSION || height > MAX_SPRITE_DIMENSION) {
    throw new Error(`El sprite supera ${MAX_SPRITE_DIMENSION} px por lado`);
  }
}

async function decodeSpriteFile(file) {
  if (file.size > MAX_SPRITE_FILE_SIZE) throw new Error("El archivo supera el límite de 25 MB");
  const extension = file.name.split(".").pop()?.toLocaleLowerCase();
  if (extension === "png" || file.type === "image/png") {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    validateSpriteDimensions(image.naturalWidth, image.naturalHeight);
    return { type: "single", dataUrl, width: image.naturalWidth, height: image.naturalHeight, format: "PNG" };
  }
  if (extension !== "psd" && file.type !== "image/vnd.adobe.photoshop") {
    throw new Error("Selecciona un archivo PNG o PSD");
  }
  if (!window.agPsd?.readPsd) throw new Error("El lector de PSD no está disponible");
  const psd = window.agPsd.readPsd(await file.arrayBuffer(), {
    skipCompositeImageData: true,
    skipThumbnail: true,
    skipLinkedFilesData: true,
    totalMemoryLimit: MAX_PSD_MEMORY
  });
  validateSpriteDimensions(psd.width, psd.height);
  const layers = collectPsdLayers(psd.children);
  if (!layers.length) throw new Error("El PSD no contiene capas de imagen utilizables");
  layers.forEach((layer) => validateSpriteDimensions(layer.width, layer.height));
  return { type: "layers", width: psd.width, height: psd.height, format: "PSD", layers };
}

function importPsdLayers(decoded, file) {
  const reserved = new Set(project.parts.map((item) => item.id));
  const assigned = new Set();
  const topZ = Math.max(0, ...project.parts.map((item) => Number(item.z) || 0));
  let imported = 0;
  let skipped = 0;
  let firstPartId = null;

  decoded.layers.forEach((layer, index) => {
    const normalizedId = normalizeLayerId(layer.name);
    let current = project.parts.find((item) => item.id === normalizedId && !assigned.has(item.id));
    if (current && lockedParts.has(current.id)) {
      skipped += 1;
      return;
    }
    const isNew = !current;
    const importedOnly = isNew || current?.sprite?.removable === true;
    if (isNew) {
      current = {
        id: uniquePartId(layer.name, reserved),
        assetId: normalizedId,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      };
      project.parts.push(current);
    } else {
      assigned.add(current.id);
    }
    const original = importedOnly ? null : {
      x: current.x,
      y: current.y,
      z: current.z,
      rotation: current.rotation,
      scaleX: current.scaleX,
      scaleY: current.scaleY,
      visible: current.visible,
      displayName: current.displayName || null
    };
    current.displayName = layer.name;
    current.x = layer.left + layer.width / 2 - decoded.width / 2;
    current.y = layer.top + layer.height / 2 - decoded.height / 2;
    current.z = topZ + decoded.layers.length - index;
    current.rotation = 0;
    current.scaleX = 1;
    current.scaleY = 1;
    current.visible = !layer.hidden;
    current.sprite = {
      dataUrl: layer.canvas.toDataURL("image/png"),
      width: layer.width,
      height: layer.height,
      format: "PSD",
      name: layer.name,
      source: `${file.name} › ${layer.path}`,
      removable: importedOnly,
      original,
      key: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${file.lastModified}-${index}`
    };
    delete images[current.id];
    firstPartId ||= current.id;
    imported += 1;
  });

  if (!imported) throw new Error("Todas las capas coincidentes están bloqueadas");
  selectSinglePart(firstPartId);
  ensureImages();
  const skippedText = skipped ? `; ${skipped} bloqueada(s) omitida(s)` : "";
  commit(`${imported} capa(s) de ${file.name} importada(s)${skippedText}`);
}

async function importSprite(file) {
  const current = part();
  if (!current) throw new Error("Selecciona una pieza antes de importar");
  status(`Importando ${file.name}…`);
  const decoded = await decodeSpriteFile(file);
  if (decoded.type === "layers") {
    importPsdLayers(decoded, file);
    refresh();
    return;
  }
  current.sprite = {
    ...decoded,
    name: file.name,
    key: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${file.lastModified}`
  };
  ensureImages();
  commit(`${file.name} importado en ${partLabel(current)}`);
  refresh();
}

const multiply = (left, right) => [
  left[0] * right[0] + left[2] * right[1], left[1] * right[0] + left[3] * right[1],
  left[0] * right[2] + left[2] * right[3], left[1] * right[2] + left[3] * right[3],
  left[0] * right[4] + left[2] * right[5] + left[4], left[1] * right[4] + left[3] * right[5] + left[5]
];
const translate = (x = 0, y = 0) => [1, 0, 0, 1, x, y];
const rotate = (angle = 0) => {
  const radians = angle * Math.PI / 180;
  return [Math.cos(radians), Math.sin(radians), -Math.sin(radians), Math.cos(radians), 0, 0];
};
const scale = (x = 1, y = x) => [x, 0, 0, y, 0, 0];
const point = (matrix, x, y) => ({ x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] });
function localDelta(matrix, x, y) {
  const determinant = matrix[0] * matrix[3] - matrix[1] * matrix[2];
  if (Math.abs(determinant) < 1e-8) return { x, y };
  return {
    x: (matrix[3] * x - matrix[2] * y) / determinant,
    y: (-matrix[1] * x + matrix[0] * y) / determinant
  };
}
function transformMatrix(transform = {}) {
  return multiply(
    multiply(translate(transform.x || 0, transform.y || 0), rotate(transform.angle || 0)),
    scale(1 + (transform.scaleX || 0), 1 + (transform.scaleY || 0))
  );
}

function parentMatrixForTarget(target, state) {
  if (target === "rig") return [1, 0, 0, 1, 0, 0];
  if (target === "torso") return state.root;
  const parent = PARENTS[target];
  return parent ? state.joints[parent] : state.root;
}

function matrices(at = time) {
  const sampled = pose(at);
  const root = transformMatrix(sampled.rig);
  const memo = {};
  function joint(id) {
    if (memo[id]) return memo[id];
    const parent = PARENTS[id];
    const current = JOINTS[id];
    const from = parent ? JOINTS[parent] : { x: 0, y: 0 };
    const parentMatrix = parent ? joint(parent) : root;
    return (memo[id] = multiply(multiply(parentMatrix, translate(current.x - from.x, current.y - from.y)), transformMatrix(sampled[id])));
  }
  Object.keys(JOINTS).forEach(joint);
  return { joints: memo, pose: sampled, root };
}

function resizeCanvas(target, targetContext) {
  const box = target.getBoundingClientRect();
  const ratio = devicePixelRatio || 1;
  const width = Math.max(1, Math.round(box.width * ratio));
  const height = Math.max(1, Math.round(box.height * ratio));
  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
  targetContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  targetContext.imageSmoothingEnabled = false;
}

function origin() {
  const viewScale = BASE_SCALE * zoom;
  return { x: canvas.clientWidth / 2 + offsetX, y: canvas.clientHeight / 2 - 80 * viewScale + offsetY };
}

function toWorld(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const base = origin();
  const viewScale = BASE_SCALE * zoom;
  return { x: (clientX - box.left - base.x) / viewScale, y: (clientY - box.top - base.y) / viewScale };
}

function targetHidden(partId) {
  if (hiddenTargets.has("rig")) return true;
  const target = PART_JOINTS[partId] || (partId === "torso" ? "torso" : null);
  return target ? hiddenTargets.has(target) : false;
}

function renderFigure(targetContext, at, { alpha = 1, tint = false } = {}) {
  const state = matrices(at);
  targetContext.save();
  targetContext.globalAlpha *= alpha;
  [...project.parts].sort((left, right) => left.z - right.z).forEach((item) => {
    if (!item.visible || targetHidden(item.id)) return;
    const image = images[item.id];
    if (!image?.complete || !image.naturalWidth) return;
    const jointId = PART_JOINTS[item.id];
    const targetId = jointId || (item.id === "torso" ? "torso" : "rig");
    const matrix = jointId
      ? state.joints[jointId]
      : multiply(state.root, targetId === "torso" ? transformMatrix(state.pose.torso) : [1, 0, 0, 1, 0, 0]);
    const anchor = jointId ? JOINTS[jointId] : { x: 0, y: 0 };
    const visibility = Math.max(0, Math.min(1, 1 + (state.pose.rig?.alpha || 0) + (state.pose[targetId]?.alpha || 0)));
    targetContext.save();
    targetContext.globalAlpha *= visibility;
    targetContext.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
    targetContext.translate(item.x - anchor.x, item.y - anchor.y);
    targetContext.rotate(item.rotation * Math.PI / 180);
    targetContext.scale(item.scaleX, item.scaleY);
    targetContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    if (tint) {
      targetContext.globalCompositeOperation = "source-atop";
      targetContext.globalAlpha = 0.45;
      targetContext.fillStyle = "#79b8ef";
      targetContext.fillRect(-image.naturalWidth / 2, -image.naturalHeight / 2, image.naturalWidth, image.naturalHeight);
    }
    targetContext.restore();
  });
  targetContext.restore();
}

function drawGrid(width, height, base, viewScale) {
  if (!$("grid").checked) return;
  const left = -base.x / viewScale;
  const right = (width - base.x) / viewScale;
  const top = -base.y / viewScale;
  const bottom = (height - base.y) / viewScale;
  context.strokeStyle = "#1e3449";
  context.lineWidth = 1 / viewScale;
  context.beginPath();
  for (let x = Math.ceil(left / 50) * 50; x < right; x += 50) { context.moveTo(x, top); context.lineTo(x, bottom); }
  for (let y = Math.ceil(top / 50) * 50; y < bottom; y += 50) { context.moveTo(left, y); context.lineTo(right, y); }
  context.stroke();
  context.strokeStyle = "#325979";
  context.beginPath();
  context.moveTo(0, top); context.lineTo(0, bottom); context.moveTo(left, 0); context.lineTo(right, 0); context.stroke();
}

function drawBones(at) {
  if (!$("bones").checked) return;
  const state = matrices(at);
  Object.entries(state.joints).forEach(([id, matrix]) => {
    const parent = PARENTS[id];
    const parentMatrix = parent ? state.joints[parent] : state.root;
    context.strokeStyle = selectedTarget === id ? "#efbd67" : "#63c9ff";
    context.fillStyle = selectedTarget === id ? "#ffd68e" : "#83d9ff";
    context.lineWidth = 3 / (BASE_SCALE * zoom);
    context.beginPath();
    context.moveTo(parentMatrix[4], parentMatrix[5]);
    context.lineTo(matrix[4], matrix[5]);
    context.stroke();
    context.beginPath();
    context.arc(matrix[4], matrix[5], 7 / (BASE_SCALE * zoom), 0, Math.PI * 2);
    context.fill();
  });
}

function drawPreview() {
  resizeCanvas(previewCanvas, previewContext);
  const width = previewCanvas.clientWidth;
  const height = previewCanvas.clientHeight;
  previewContext.clearRect(0, 0, width, height);
  previewContext.fillStyle = "#091522";
  previewContext.fillRect(0, 0, width, height);
  previewContext.save();
  previewContext.translate(width / 2, height / 2 - 8);
  previewContext.scale(0.105, 0.105);
  previewContext.translate(0, -85);
  renderFigure(previewContext, mode === "animador" ? time : 0);
  previewContext.restore();
}

function draw() {
  resizeCanvas(canvas, context);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  context.clearRect(0, 0, width, height);
  const gradient = context.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, Math.max(width, height));
  gradient.addColorStop(0, "#0d2236");
  gradient.addColorStop(1, "#06111d");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  const base = origin();
  const viewScale = BASE_SCALE * zoom;
  context.save();
  context.translate(base.x, base.y);
  context.scale(viewScale, viewScale);
  drawGrid(width, height, base, viewScale);
  if (mode === "animador" && $("ghost").checked) {
    const step = Math.max(1000 / fps() * 4, duration() / 10);
    const ghostAlpha = Number($("ghost-alpha").value) / 100;
    renderFigure(context, Math.max(0, time - step), { alpha: ghostAlpha, tint: true });
    renderFigure(context, Math.min(duration(), time + step), { alpha: ghostAlpha, tint: true });
  }
  renderFigure(context, mode === "animador" ? time : 0);
  drawBones(mode === "animador" ? time : 0);
  context.restore();
  $("zoom-label").textContent = `${Math.round(zoom * 100)} %`;
  $("zoom").value = Math.round(zoom * 100);
  $("canvas-status").textContent = `Zoom: ${Math.round(zoom * 100)} % · ${label(mode)} · ${Math.round(time)} ms`;
  drawPreview();
}

function exactKey(target = selectedTarget, at = Math.round(time)) {
  return (project.clip.animation.keys[target] || []).find((frame) => frame.t === at) || null;
}

function appendTreeNode(node, depth, search) {
  const visible = label(node.id).toLocaleLowerCase().includes(search) || (node.children || []).some((child) => label(child.id).toLocaleLowerCase().includes(search));
  if (!visible) return;
  const row = document.createElement("div");
  row.className = `tree-row${selectedTarget === node.id ? " active" : ""}`;
  row.setAttribute("role", "option");
  row.style.paddingLeft = `${depth * 17}px`;
  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = node.children?.length ? "◇" : "○";
  const button = document.createElement("button");
  button.className = "tree-select";
  button.textContent = label(node.id);
  button.onclick = () => { selectedTarget = node.id; selectedKeys.clear(); refresh(); };
  const toggle = document.createElement("button");
  toggle.className = "tree-toggle";
  toggle.textContent = hiddenTargets.has(node.id) ? "○" : "◉";
  toggle.title = "Mostrar u ocultar en el lienzo";
  toggle.onclick = () => { hiddenTargets.has(node.id) ? hiddenTargets.delete(node.id) : hiddenTargets.add(node.id); renderTree(); draw(); };
  const lock = document.createElement("button");
  lock.className = "tree-toggle";
  lock.textContent = lockedTargets.has(node.id) ? "◆" : "◇";
  lock.title = lockedTargets.has(node.id) ? "Desbloquear edición" : "Bloquear edición";
  lock.onclick = () => {
    lockedTargets.has(node.id) ? lockedTargets.delete(node.id) : lockedTargets.add(node.id);
    selectedKeys.clear();
    refresh();
  };
  row.append(icon, button, toggle, lock);
  $("tree").append(row);
  (node.children || []).forEach((child) => appendTreeNode(child, depth + 1, search));
}

function renderLayers(search) {
  visibleLayerItems().forEach((item) => {
    const row = document.createElement("div");
    const isSelected = selectedParts.has(item.id);
    row.className = `tree-row${isSelected ? " active" : ""}${selectedPart === item.id ? " focused" : ""}`;
    row.dataset.partId = item.id;
    row.setAttribute("role", "option");
    const icon = document.createElement("span");
    icon.className = "tree-icon";
    icon.textContent = "◇";
    const button = document.createElement("button");
    button.className = "tree-select";
    button.textContent = partLabel(item);
    button.title = `Seleccionar ${partLabel(item)}`;
    button.onclick = (event) => handlePartSelection(item, event);
    row.onclick = (event) => {
      if (event.target === row || event.target === icon) handlePartSelection(item, event);
    };
    const toggle = document.createElement("button");
    toggle.className = "tree-toggle";
    toggle.textContent = item.visible ? "◉" : "○";
    toggle.onclick = () => { item.visible = !item.visible; commit("Visibilidad actualizada"); refresh(); };
    const lock = document.createElement("button");
    lock.className = "tree-toggle";
    lock.textContent = lockedParts.has(item.id) ? "◆" : "◇";
    lock.title = lockedParts.has(item.id) ? "Desbloquear edición" : "Bloquear edición";
    lock.onclick = () => {
      lockedParts.has(item.id) ? lockedParts.delete(item.id) : lockedParts.add(item.id);
      refresh();
    };
    const duplicate = document.createElement("button");
    duplicate.className = "tree-action duplicate";
    duplicate.textContent = "⧉";
    duplicate.title = `Duplicar ${partLabel(item)}`;
    duplicate.setAttribute("aria-label", `Duplicar ${partLabel(item)}`);
    duplicate.disabled = lockedParts.has(item.id);
    duplicate.onclick = () => duplicatePart(item);
    const remove = document.createElement("button");
    remove.className = "tree-action delete";
    remove.textContent = "×";
    remove.title = `Eliminar ${partLabel(item)}`;
    remove.setAttribute("aria-label", `Eliminar ${partLabel(item)}`);
    remove.disabled = lockedParts.has(item.id) || project.parts.length <= 1;
    remove.onclick = () => deletePart(item);
    row.setAttribute("aria-selected", String(isSelected));
    row.append(icon, button, toggle, lock, duplicate, remove);
    $("tree").append(row);
  });
}

function duplicatePart(source) {
  duplicateParts(source ? [source] : []);
}

function duplicateParts(sources) {
  const available = sources.filter((source) => source && !lockedParts.has(source.id));
  if (!available.length) return status("Los sprites seleccionados están bloqueados");
  const reserved = new Set(project.parts.map((item) => item.id));
  let topZ = Math.max(0, ...project.parts.map((item) => Number(item.z) || 0));
  const clones = available.map((source) => {
    const displayName = `${partLabel(source)} copia`;
    const clone = structuredClone(source);
    clone.id = uniquePartId(displayName, reserved);
    clone.displayName = displayName;
    clone.x = Number(source.x || 0) + 20;
    clone.y = Number(source.y || 0) + 20;
    clone.z = ++topZ;
    if (clone.sprite) {
      clone.sprite.name = displayName;
      clone.sprite.removable = true;
      clone.sprite.original = null;
      clone.sprite.key = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${clone.id}`;
    }
    project.parts.push(clone);
    return clone;
  });
  selectedParts = new Set(clones.map((clone) => clone.id));
  selectedPart = clones.at(-1).id;
  partSelectionAnchor = clones[0].id;
  ensureImages();
  commit(clones.length === 1 ? `${partLabel(clones[0])} duplicado` : `${clones.length} sprites duplicados`);
  refresh();
}

function deletePart(target) {
  deleteParts(target ? [target] : []);
}

function deleteParts(targets) {
  const removable = targets.filter((target) => target && !lockedParts.has(target.id));
  if (!removable.length) return status("Los sprites seleccionados están bloqueados");
  if (project.parts.length - removable.length < 1) return status("El proyecto debe conservar al menos un sprite");
  const prompt = removable.length === 1
    ? `¿Eliminar ${partLabel(removable[0])}? Puedes recuperar el sprite con Deshacer.`
    : `¿Eliminar los ${removable.length} sprites seleccionados? Puedes recuperarlos con Deshacer.`;
  if (!confirm(prompt)) return;
  const removedIds = new Set(removable.map((target) => target.id));
  const firstIndex = Math.min(...removable.map((target) => project.parts.indexOf(target)));
  removable.forEach((target) => {
    delete images[target.id];
    lockedParts.delete(target.id);
  });
  project.parts = project.parts.filter((item) => !removedIds.has(item.id));
  selectSinglePart(project.parts[Math.min(firstIndex, project.parts.length - 1)]?.id || "torso");
  commit(removable.length === 1 ? `${partLabel(removable[0])} eliminado` : `${removable.length} sprites eliminados`);
  refresh();
}

function renderMultiSelectionToolbar(layerMode) {
  const toolbar = $("multi-selection-toolbar");
  const items = selectedPartItems();
  const visible = layerMode && items.length > 1;
  toolbar.hidden = !visible;
  if (!visible) return;
  const allVisible = items.every((item) => item.visible !== false);
  const allLocked = items.every((item) => lockedParts.has(item.id));
  const editableCount = items.filter((item) => !lockedParts.has(item.id)).length;
  $("multi-selection-count").textContent = String(items.length);
  $("multi-selection-count").title = `${items.length} sprites seleccionados`;
  $("multi-visibility").textContent = allVisible ? "◉" : "○";
  $("multi-visibility").title = allVisible ? "Ocultar seleccionados" : "Mostrar seleccionados";
  $("multi-visibility").setAttribute("aria-label", $("multi-visibility").title);
  $("multi-lock").textContent = allLocked ? "◆" : "◇";
  $("multi-lock").title = allLocked ? "Desbloquear seleccionados" : "Bloquear seleccionados";
  $("multi-lock").setAttribute("aria-label", $("multi-lock").title);
  $("multi-duplicate").disabled = editableCount === 0;
  $("multi-delete").disabled = editableCount === 0 || project.parts.length - editableCount < 1;
}

function toggleSelectedVisibility() {
  const items = selectedPartItems();
  if (items.length < 2) return;
  const nextVisible = !items.every((item) => item.visible !== false);
  items.forEach((item) => { item.visible = nextVisible; });
  commit(`${items.length} sprites ${nextVisible ? "mostrados" : "ocultados"}`);
  refresh();
}

function toggleSelectedLocks() {
  const items = selectedPartItems();
  if (items.length < 2) return;
  const unlock = items.every((item) => lockedParts.has(item.id));
  items.forEach((item) => unlock ? lockedParts.delete(item.id) : lockedParts.add(item.id));
  status(`${items.length} sprites ${unlock ? "desbloqueados" : "bloqueados"}`);
  refresh();
}

function renderTree() {
  $("tree").replaceChildren();
  const search = $("search").value.trim().toLocaleLowerCase();
  const layerMode = leftTab === "layers" || mode === "calibrador" || mode === "sprites";
  $("tree").setAttribute("aria-multiselectable", String(layerMode));
  renderMultiSelectionToolbar(layerMode);
  if (layerMode) renderLayers(search);
  else if (leftTab === "tracks") {
    TARGETS.filter((target) => (project.clip.animation.keys[target] || []).length || !search)
      .filter((target) => label(target).toLocaleLowerCase().includes(search))
      .forEach((target) => appendTreeNode({ id: target }, 0, search));
  } else TREE.forEach((node) => appendTreeNode(node, 0, search));
  $("tree-meta").textContent = layerMode
    ? `${selectedParts.size} seleccionado(s) · Ctrl+clic o Shift+↑/↓`
    : `${project.clip.rig} · ${project.clip.anatomy} · ${Object.keys(project.clip.animation.keys).length} pistas`;
}

function renderInspector() {
  const calibration = mode === "calibrador" || mode === "sprites";
  $("animation-inspector").hidden = calibration;
  $("calibration-inspector").hidden = !calibration;
  $("selected-name").textContent = calibration ? partLabel(selectedPart) : label(selectedTarget);
  $("selected-type").textContent = calibration
    ? `${selectedParts.size > 1 ? `${selectedParts.size} sprites · Principal` : "Pieza"} · Capa ${part()?.z ?? 0}`
    : `Hueso · Objetivo: ${selectedTarget}`;
  if (calibration) {
    const current = part();
    if (!current) return;
    $("sprite-import-section").hidden = mode !== "sprites";
    if (mode === "sprites") {
      const imported = current.sprite;
      $("sprite-import-preview").src = images[current.id]?.src || "";
      $("sprite-import-name").textContent = imported?.name || "Sprite original";
      $("sprite-import-meta").textContent = imported
        ? `${imported.format} · ${imported.width} × ${imported.height} px${imported.source ? ` · ${imported.source}` : ""}`
        : "PNG o PSD · máximo 25 MB";
      $("reset-sprite").disabled = !imported || lockedParts.has(current.id);
      $("import-sprite").disabled = lockedParts.has(current.id);
    }
    $("part-x").value = current.x;
    $("part-y").value = current.y;
    $("part-rotation").value = current.rotation;
    $("part-scale").value = Math.abs(current.scaleX);
    ["part-x", "part-y", "part-rotation", "part-scale", "flip-part", "layer-up", "layer-down"]
      .forEach((id) => { $(id).disabled = lockedParts.has(current.id); });
    return;
  }
  const sampled = pose()[selectedTarget] || {};
  const key = exactKey();
  Object.entries(TRANSFORM_FIELDS).forEach(([property, id]) => { $(id).value = Number(key?.[property] ?? sampled[property] ?? 0).toFixed(property.startsWith("scale") || property === "alpha" ? 2 : 1); });
  $("key-ease").value = key?.ease || "Linear";
  [...Object.values(TRANSFORM_FIELDS), "key-ease", "set-key", "delete-key"]
    .forEach((id) => { $(id).disabled = lockedTargets.has(selectedTarget); });
  const clip = project.clip.animation;
  $("clip-label").value = clip.label;
  $("clip-description").value = clip.description;
  $("clip-category").value = clip.category;
  $("clip-state").value = clip.state;
  if (rightTab === "curves") drawCurve();
}

function renderPresets() {
  const host = $("preset-grid");
  host.replaceChildren();
  const presets = [
    ["Linear", "Lineal"], ["Sine.inOut", "Suave"], ["Cubic.out", "Impacto"], ["Back.out", "Rebote"]
  ];
  presets.forEach(([value, text]) => {
    const button = document.createElement("button");
    button.className = "small-button";
    button.textContent = text;
    button.onclick = () => { $("key-ease").value = value; showRightTab("curves"); };
    host.append(button);
  });
}

function drawCurve() {
  const curveCanvas = $("curve-canvas");
  const width = curveCanvas.clientWidth;
  const height = curveCanvas.clientHeight;
  // El canvas mide 0 × 0 mientras su pestaña está oculta. Además de ser un
  // trabajo inútil, usar width / 6 como incremento en ese estado produce un
  // bucle infinito (0 += 0) que termina agotando la memoria del renderer.
  if (width <= 0 || height <= 0) return;
  const curveContext = curveCanvas.getContext("2d");
  resizeCanvas(curveCanvas, curveContext);
  const ease = $("key-ease").value || "Linear";
  curveContext.clearRect(0, 0, width, height);
  curveContext.strokeStyle = "#213952";
  curveContext.lineWidth = 1;
  curveContext.beginPath();
  for (let column = 0; column <= 6; column += 1) {
    const x = column / 6 * width;
    curveContext.moveTo(x, 0);
    curveContext.lineTo(x, height);
  }
  for (let row = 0; row <= 4; row += 1) {
    const y = row / 4 * height;
    curveContext.moveTo(0, y);
    curveContext.lineTo(width, y);
  }
  curveContext.stroke();
  curveContext.strokeStyle = "#58a6ff";
  curveContext.lineWidth = 3;
  curveContext.beginPath();
  for (let index = 0; index <= 80; index += 1) {
    const progress = index / 80;
    const value = ease === "Linear" ? progress : animationEase(progress, ease);
    const x = progress * width;
    const y = height - value * height;
    if (!index) curveContext.moveTo(x, y); else curveContext.lineTo(x, y);
  }
  curveContext.stroke();
  $("curve-label").textContent = `${ease} · compartida con el runtime`;
}

function setTime(next, rebuild = false) {
  time = Math.max(0, Math.min(duration(), next));
  updateTimeDisplays();
  draw();
  if (rebuild) { renderInspector(); renderTimeline(); }
}

function updateTimeDisplays() {
  $("scrub").max = duration();
  $("scrub").value = time;
  $("clock").textContent = `${(time / 1000).toFixed(2)} / ${(duration() / 1000).toFixed(2)} s`;
  $("preview-duration").textContent = `${duration()} ms · ${fps()} fps`;
  document.querySelectorAll(".playhead").forEach((cursor) => { cursor.style.left = `${time / duration() * 100}%`; });
}

function selectKey(target, at, append = false) {
  if (!append) selectedKeys.clear();
  const key = `${target}:${at}`;
  if (append && selectedKeys.has(key)) selectedKeys.delete(key); else selectedKeys.add(key);
  selectedTarget = target;
  time = at;
  refresh();
}

function snapTime(raw) {
  const frame = 1000 / fps();
  return Math.max(0, Math.min(duration(), Math.round(raw / frame) * frame));
}

function timelineLineClick(event, line) {
  if (event.target !== line) return;
  const box = line.getBoundingClientRect();
  setTime(snapTime((event.clientX - box.left) / box.width * duration()), true);
}

function makePlayhead() {
  const cursor = document.createElement("div");
  cursor.className = "playhead";
  cursor.style.left = `${time / duration() * 100}%`;
  return cursor;
}

function makeTrackRow(target) {
  const row = document.createElement("div");
  row.className = "track-row";
  const trackLabel = document.createElement("div");
  trackLabel.className = `track-label${selectedTarget === target ? " active" : ""}`;
  const button = document.createElement("button");
  button.textContent = label(target);
  button.onclick = () => { selectedTarget = target; refresh(); };
  trackLabel.append(button);
  const line = document.createElement("div");
  line.className = "track-line";
  line.onclick = (event) => timelineLineClick(event, line);
  (project.clip.animation.keys[target] || []).forEach((frame) => {
    const marker = document.createElement("button");
    const identity = `${target}:${frame.t}`;
    marker.className = `key-marker${selectedKeys.has(identity) ? " selected" : ""}${lockedTargets.has(target) ? " locked" : ""}`;
    marker.style.left = `${frame.t / duration() * 100}%`;
    marker.title = `${frame.t} ms · ${Object.entries(frame).filter(([field]) => field !== "t" && field !== "ease").map(([field, value]) => `${field}: ${value}`).join(" ")}`;
    marker.onpointerdown = (event) => {
      event.stopPropagation();
      if (lockedTargets.has(target)) return status(`${label(target)} está bloqueado`);
      marker.setPointerCapture(event.pointerId);
      if (!event.shiftKey && !selectedKeys.has(identity)) selectedKeys.clear();
      selectedKeys.add(identity);
      selectedTarget = target;
      time = frame.t;
      marker.classList.add("selected");
      updateTimeDisplays();
      draw();
      dragKey = { marker, target, originalTime: frame.t, startX: event.clientX, width: line.clientWidth };
    };
    marker.onpointermove = (event) => {
      if (!dragKey || dragKey.marker !== marker) return;
      const delta = (event.clientX - dragKey.startX) / dragKey.width * duration();
      const next = snapTime(dragKey.originalTime + delta);
      marker.style.left = `${next / duration() * 100}%`;
      marker.dataset.nextTime = String(next);
    };
    marker.onpointerup = () => {
      if (!dragKey || dragKey.marker !== marker) return;
      const next = Number(marker.dataset.nextTime ?? dragKey.originalTime);
      const frames = project.clip.animation.keys[target];
      const moving = frames.find((item) => item.t === dragKey.originalTime);
      if (moving && next !== moving.t) {
        const occupied = frames.find((item) => item !== moving && item.t === next);
        if (occupied) Object.assign(occupied, moving);
        else moving.t = next;
        frames.sort((left, right) => left.t - right.t);
        selectedKeys = new Set([`${target}:${next}`]);
        time = next;
        commit("Fotograma desplazado");
      }
      dragKey = null;
      refresh();
    };
    marker.onclick = (event) => { event.stopPropagation(); selectKey(target, frame.t, event.shiftKey); };
    line.append(marker);
  });
  line.append(makePlayhead());
  row.append(trackLabel, line);
  return row;
}

function makeEventRow() {
  const row = document.createElement("div");
  row.className = "track-row";
  const trackLabel = document.createElement("div");
  trackLabel.className = "track-label";
  trackLabel.textContent = "⚡ Eventos de sprite";
  const line = document.createElement("div");
  line.className = "track-line";
  line.onclick = (event) => timelineLineClick(event, line);
  project.clip.animation.spriteEvents.forEach((event, index) => {
    const marker = document.createElement("button");
    marker.className = "event-marker";
    marker.style.left = `${event.t / duration() * 100}%`;
    marker.textContent = `${event.slot}: ${event.variant}`;
    marker.title = "Clic derecho para eliminar";
    marker.onclick = () => setTime(event.t, true);
    marker.oncontextmenu = (mouseEvent) => {
      mouseEvent.preventDefault();
      project.clip.animation.spriteEvents.splice(index, 1);
      commit("Evento eliminado");
      refresh();
    };
    line.append(marker);
  });
  line.append(makePlayhead());
  row.append(trackLabel, line);
  return row;
}

function makeSpriteRow() {
  const row = document.createElement("div");
  row.className = "track-row";
  const trackLabel = document.createElement("div");
  trackLabel.className = "track-label";
  trackLabel.textContent = "◇ Referencia de sprites";
  const line = document.createElement("div");
  line.className = "track-line";
  const count = Math.max(8, Math.min(24, Math.round(duration() / 80)));
  for (let index = 0; index <= count; index += 1) {
    const image = document.createElement("img");
    image.className = "sprite-frame";
    image.alt = "";
    image.src = images[selectedPart]?.src || "./assets/modular/man_sprites/runtime/torso.png";
    image.style.left = `${index / count * 100}%`;
    line.append(image);
  }
  line.append(makePlayhead());
  row.append(trackLabel, line);
  return row;
}

function renderRuler() {
  const ruler = $("ruler");
  ruler.replaceChildren();
  const frameCount = Math.max(1, Math.round(duration() / 1000 * fps()));
  const every = Math.max(1, Math.ceil(frameCount / 16));
  for (let frame = 0; frame <= frameCount; frame += every) {
    const tick = document.createElement("span");
    tick.className = "ruler-tick";
    tick.style.left = `${frame / frameCount * 100}%`;
    tick.textContent = frame;
    ruler.append(tick);
  }
  ruler.append(makePlayhead());
}

function renderTimeline() {
  $("timeline-content").style.width = `${Math.round(1000 * timelineZoom)}px`;
  renderRuler();
  const host = $("tracks");
  host.replaceChildren();
  TARGETS.forEach((target) => host.append(makeTrackRow(target)));
  host.append(makeEventRow(), makeSpriteRow());
  updateTimeDisplays();
}

function gameValidationErrors() {
  return validateStudioProject(normalizeStudioProject(project.clip), { mode: "game", allowedTargets: PUPPET_TARGETS });
}

function renderModeOverlay() {
  const overlay = $("mode-overlay");
  overlay.hidden = !["exportar", "proyecto"].includes(mode);
  if (overlay.hidden) return;
  if (mode === "exportar") {
    const errors = gameValidationErrors();
    overlay.innerHTML = `<h2>Exportar</h2><p class="muted">El proyecto conserva calibración y clip. El clip para el juego solo se descarga cuando supera el contrato.</p><div class="summary-grid"><div class="summary-card"><strong>Proyecto de Studio</strong><span>${project.parts.length} piezas · ${Object.keys(project.clip.animation.keys).length} pistas</span><div class="button-row"><button id="download-project" class="small-button primary">Descargar proyecto</button></div></div><div class="summary-card"><strong>Candidato para el juego</strong><span>${errors.length ? `${errors.length} observaciones` : "Validación superada"}</span><div class="button-row"><button id="download-clip" class="small-button primary" ${errors.length ? "disabled" : ""}>Exportar clip</button></div></div></div>${errors.length ? `<h3>Falta resolver</h3><ul class="validation-list">${errors.map((error) => `<li>${error}</li>`).join("")}</ul>` : ""}`;
    $("download-project").onclick = exportProject;
    $("download-clip").onclick = exportClip;
  } else {
    overlay.innerHTML = `<h2>Proyecto</h2><div class="summary-grid"><div class="summary-card"><strong>${project.clip.animation.label}</strong><span>ID: ${project.clip.animation.id}<br>Rig: ${project.clip.rig}<br>Anatomía: ${project.clip.anatomy}<br>Estado: ${project.clip.animation.status}</span></div><div class="summary-card"><strong>Persistencia</strong><span>Guardado local versionado y exportación explícita. No se almacenan credenciales.</span></div></div><div class="button-row"><button id="new-project" class="small-button danger">Crear proyecto nuevo</button></div>`;
    $("new-project").onclick = () => {
      if (!confirm("¿Crear un proyecto nuevo? El proyecto actual quedará reemplazado en el guardado local.")) return;
      project = freshProject();
      selectedTarget = "rig";
      selectSinglePart("torso");
      selectedKeys.clear();
      time = 0;
      ensureImages();
      commit("Proyecto nuevo creado");
      setMode("animador");
    };
  }
}

function refresh() {
  project.clip = normalizeStudioProject(project.clip);
  syncPartSelection();
  $("project-name").value = project.clip.animation.id;
  $("duration").value = duration();
  $("loop").checked = project.clip.animation.loop;
  $("fps").value = String(fps());
  renderTree();
  renderInspector();
  renderTimeline();
  renderPresets();
  renderModeOverlay();
  draw();
  updateHistoryButtons();
}

function showRightTab(next) {
  rightTab = next;
  document.querySelectorAll("[data-right-tab]").forEach((button) => button.classList.toggle("active", button.dataset.rightTab === next));
  $("inspector-panel").hidden = next !== "inspector";
  $("presets-panel").hidden = next !== "presets";
  $("curves-panel").hidden = next !== "curves";
  if (next === "curves") drawCurve();
}

function setMode(next) {
  mode = next;
  document.querySelectorAll("[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === next));
  if (next === "calibrador" || next === "sprites") leftTab = "layers";
  if (next === "animador") leftTab = "skeleton";
  document.querySelectorAll("[data-left-tab]").forEach((button) => button.classList.toggle("active", button.dataset.leftTab === leftTab));
  $("ghost").disabled = next !== "animador";
  $("viewport").classList.toggle("pan", tool === "pan");
  window.history.replaceState(null, "", `#${next}`);
  refresh();
}

function setTool(next) {
  tool = next;
  document.querySelectorAll("[data-tool]").forEach((button) => button.classList.toggle("active", button.dataset.tool === next));
  $("viewport").classList.toggle("pan", next === "pan");
}

function readTransformFields() {
  const frame = { t: Math.round(time) };
  Object.entries(TRANSFORM_FIELDS).forEach(([property, id]) => {
    const value = Number($(id).value);
    if (Number.isFinite(value)) frame[property] = value;
  });
  const ease = $("key-ease").value;
  if (ease && ease !== "Linear") frame.ease = ease;
  return frame;
}

function upsertKey(target, frame) {
  const keys = project.clip.animation.keys;
  const frames = keys[target] || [];
  const existing = frames.find((item) => item.t === frame.t);
  if (existing) Object.assign(existing, frame); else frames.push(frame);
  frames.sort((left, right) => left.t - right.t);
  keys[target] = frames;
  if (!project.clip.animation.requires.includes(target)) project.clip.animation.requires.push(target);
}

function setKey() {
  if (lockedTargets.has(selectedTarget)) return status(`${label(selectedTarget)} está bloqueado`);
  upsertKey(selectedTarget, readTransformFields());
  selectedKeys = new Set([`${selectedTarget}:${Math.round(time)}`]);
  commit(`Fotograma guardado: ${label(selectedTarget)}`);
  refresh();
}

function previewKeyFromInspector() {
  if (lockedTargets.has(selectedTarget)) return;
  const frame = readTransformFields();
  upsertKey(selectedTarget, frame);
  selectedKeys = new Set([`${selectedTarget}:${frame.t}`]);
  draw();
  status(`Vista previa del fotograma: ${label(selectedTarget)}`);
}

function commitKeyFromInspector() {
  if (lockedTargets.has(selectedTarget)) return status(`${label(selectedTarget)} está bloqueado`);
  previewKeyFromInspector();
  commit(`Fotograma actualizado: ${label(selectedTarget)}`);
  refresh();
}

function deleteSelectedKeys() {
  if (lockedTargets.has(selectedTarget) && !selectedKeys.size) return status(`${label(selectedTarget)} está bloqueado`);
  if (!selectedKeys.size) {
    const key = exactKey();
    if (key) selectedKeys.add(`${selectedTarget}:${key.t}`);
  }
  selectedKeys.forEach((identity) => {
    const separator = identity.lastIndexOf(":");
    const target = identity.slice(0, separator);
    if (lockedTargets.has(target)) return;
    const at = Number(identity.slice(separator + 1));
    const remaining = (project.clip.animation.keys[target] || []).filter((frame) => frame.t !== at);
    if (remaining.length) project.clip.animation.keys[target] = remaining;
    else {
      delete project.clip.animation.keys[target];
      project.clip.animation.requires = project.clip.animation.requires.filter((item) => item !== target);
    }
  });
  selectedKeys.clear();
  commit("Fotogramas eliminados");
  refresh();
}

function copySelectedKeys() {
  const selected = [...selectedKeys].map((identity) => {
    const separator = identity.lastIndexOf(":");
    const target = identity.slice(0, separator);
    const at = Number(identity.slice(separator + 1));
    const frame = (project.clip.animation.keys[target] || []).find((item) => item.t === at);
    return frame ? { target, frame: structuredClone(frame) } : null;
  }).filter(Boolean);
  if (!selected.length && exactKey()) selected.push({ target: selectedTarget, frame: structuredClone(exactKey()) });
  if (!selected.length) return status("Selecciona al menos una clave");
  const first = Math.min(...selected.map(({ frame }) => frame.t));
  keyClipboard = selected.map(({ target, frame }) => ({ target, frame: { ...frame, t: frame.t - first } }));
  status(`${keyClipboard.length} clave(s) copiadas`);
}

function pasteKeys(offset = time) {
  if (!keyClipboard.length) return status("No hay claves copiadas");
  selectedKeys.clear();
  keyClipboard.forEach(({ target, frame }) => {
    const pasted = { ...structuredClone(frame), t: Math.min(duration(), snapTime(offset + frame.t)) };
    upsertKey(target, pasted);
    selectedKeys.add(`${target}:${pasted.t}`);
  });
  commit(`${keyClipboard.length} clave(s) pegadas`);
  refresh();
}

function download(name, contents) {
  const blob = new Blob([contents], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportProject() {
  project.clip = normalizeStudioProject(project.clip);
  download("cronicas-studio-proyecto.json", JSON.stringify(project, null, 2));
  status("Proyecto exportado");
}

function exportClip() {
  try {
    const contents = serializeStudioProject(project.clip, { mode: "game", allowedTargets: PUPPET_TARGETS });
    const name = `${project.clip.animation.id.replace(/[^a-z0-9_-]/gi, "_")}.json`;
    download(name, contents);
    status("Clip candidato exportado");
  } catch (error) {
    status(error.message);
  }
}

function play() {
  if (playing) return;
  if (time >= duration()) time = 0;
  playing = true;
  lastTick = performance.now();
  $("preview-state").textContent = "●";
  animationFrame = requestAnimationFrame(tick);
}

function pause() {
  playing = false;
  cancelAnimationFrame(animationFrame);
  $("preview-state").textContent = "○";
}

function tick(now) {
  if (!playing) return;
  time += now - lastTick;
  lastTick = now;
  if (time >= duration()) {
    if (project.clip.animation.loop) time %= duration();
    else { time = duration(); pause(); }
  }
  updateTimeDisplays();
  draw();
  if (playing) animationFrame = requestAnimationFrame(tick);
}

function bindControls() {
  document.querySelectorAll("[data-mode]").forEach((button) => { button.onclick = () => setMode(button.dataset.mode); });
  document.querySelectorAll("[data-left-tab]").forEach((button) => {
    button.onclick = () => {
      leftTab = button.dataset.leftTab;
      document.querySelectorAll("[data-left-tab]").forEach((item) => item.classList.toggle("active", item === button));
      renderTree();
    };
  });
  document.querySelectorAll("[data-right-tab]").forEach((button) => { button.onclick = () => showRightTab(button.dataset.rightTab); });
  document.querySelectorAll("[data-tool]").forEach((button) => { button.onclick = () => setTool(button.dataset.tool); });
  $("search").oninput = renderTree;
  $("multi-visibility").onclick = toggleSelectedVisibility;
  $("multi-lock").onclick = toggleSelectedLocks;
  $("multi-duplicate").onclick = () => duplicateParts(selectedPartItems());
  $("multi-delete").onclick = () => deleteParts(selectedPartItems());
  $("toolbar-more").onclick = (event) => {
    event.stopPropagation();
    setToolbarMore(!$("toolbar-more-panel").classList.contains("open"));
  };
  $("toolbar-more-panel").onclick = (event) => event.stopPropagation();
  document.addEventListener("click", () => setToolbarMore(false));
  $("undo").onclick = () => restoreHistory(historyIndex - 1);
  $("redo").onclick = () => restoreHistory(historyIndex + 1);
  $("history-undo").onclick = () => restoreHistory(historyIndex - 1);
  $("history-redo").onclick = () => restoreHistory(historyIndex + 1);
  $("save-local").onclick = () => { saveLocal("Proyecto guardado en este navegador"); };
  $("open-file").onclick = () => $("file").click();
  $("import-sprite").onclick = () => $("sprite-file").click();
  $("reset-sprite").onclick = () => {
    const current = part();
    if (!current?.sprite || lockedParts.has(current.id)) return;
    const sprite = current.sprite;
    delete images[current.id];
    if (sprite.removable) {
      project.parts = project.parts.filter((item) => item !== current);
      selectSinglePart(project.parts.find((item) => item.id === "torso")?.id || project.parts[0]?.id || "torso");
    } else {
      if (sprite.original) {
        Object.assign(current, sprite.original);
        if (sprite.original.displayName === null) delete current.displayName;
      }
      delete current.sprite;
    }
    ensureImages();
    commit(sprite.removable ? `${partLabel(current)} eliminado` : `Sprite original restaurado en ${partLabel(current)}`);
    refresh();
  };
  $("sprite-file").onchange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importSprite(file);
    } catch (error) {
      status(`No se pudo importar el sprite: ${error.message}`);
    }
    event.target.value = "";
  };
  $("project-name").onchange = () => {
    project.clip.animation.id = $("project-name").value.trim() || "nuevo_movimiento";
    commit("ID del proyecto actualizado");
    refresh();
  };
  $("header-play").onclick = play;
  $("preview-play").onclick = () => playing ? pause() : play();
  $("play").onclick = play;
  $("pause").onclick = pause;
  $("first").onclick = () => setTime(0, true);
  $("last").onclick = () => setTime(duration(), true);
  $("scrub").oninput = () => setTime(Number($("scrub").value), true);
  $("fps").onchange = () => { project.fps = Number($("fps").value); commit("FPS de visualización actualizado"); refresh(); };
  $("duration").onchange = () => {
    const next = Number($("duration").value);
    if (!Number.isFinite(next) || next < 100 || next > 60000) return status("Duración fuera de rango");
    project.clip.animation.duration = next;
    Object.entries(project.clip.animation.keys).forEach(([target, frames]) => { project.clip.animation.keys[target] = frames.filter((frame) => frame.t <= next); });
    project.clip.animation.spriteEvents = project.clip.animation.spriteEvents.filter((event) => event.t <= next);
    time = Math.min(time, next);
    commit("Duración actualizada");
    refresh();
  };
  $("loop").onchange = () => { project.clip.animation.loop = $("loop").checked; commit("Bucle actualizado"); refresh(); };
  $("timeline-zoom").oninput = () => {
    timelineZoom = Number($("timeline-zoom").value) / 100;
    renderTimeline();
  };
  $("set-key").onclick = setKey;
  $("delete-key").onclick = deleteSelectedKeys;
  Object.values(TRANSFORM_FIELDS).forEach((id) => {
    $(id).oninput = previewKeyFromInspector;
    $(id).onchange = commitKeyFromInspector;
  });
  $("key-ease").onchange = () => {
    commitKeyFromInspector();
    if (rightTab === "curves") drawCurve();
  };
  $("add-event").onclick = () => {
    const slot = $("event-slot").value.trim();
    const variant = $("event-variant").value.trim();
    if (!slot || !variant) return status("Completa la ranura y la variante");
    project.clip.animation.spriteEvents.push({ t: Math.round(time), slot, variant });
    project.clip.animation.spriteEvents.sort((left, right) => left.t - right.t);
    commit("Evento de sprite insertado");
    refresh();
  };
  [["clip-label", "label"], ["clip-description", "description"], ["clip-category", "category"], ["clip-state", "state"]].forEach(([id, property]) => {
    $(id).onchange = () => { project.clip.animation[property] = $(id).value.trim(); commit("Metadatos actualizados"); refresh(); };
  });
  ["part-x", "part-y", "part-rotation", "part-scale"].forEach((id) => {
    $(id).onchange = () => {
      const current = part();
      if (lockedParts.has(current.id)) return status(`${partLabel(current)} está bloqueado`);
      current.x = Number($("part-x").value);
      current.y = Number($("part-y").value);
      current.rotation = Number($("part-rotation").value);
      const magnitude = Number($("part-scale").value);
      current.scaleX = Math.sign(current.scaleX || 1) * magnitude;
      current.scaleY = Math.sign(current.scaleY || 1) * magnitude;
      commit("Calibración actualizada");
      refresh();
    };
  });
  $("flip-part").onclick = () => {
    if (lockedParts.has(part().id)) return status(`${partLabel(part())} está bloqueado`);
    part().scaleX *= -1;
    commit("Pieza volteada");
    refresh();
  };
  const moveLayer = (delta) => {
    const current = part();
    if (lockedParts.has(current.id)) return status(`${partLabel(current)} está bloqueado`);
    const other = project.parts.find((item) => item.z === current.z + delta);
    if (other) { other.z = current.z; current.z += delta; commit("Orden de capas actualizado"); refresh(); }
  };
  $("layer-up").onclick = () => moveLayer(1);
  $("layer-down").onclick = () => moveLayer(-1);
  $("copy-keys").onclick = copySelectedKeys;
  $("paste-keys").onclick = () => pasteKeys();
  $("open-curves").onclick = () => showRightTab("curves");
  $("fit").onclick = () => { zoom = 1; offsetX = 0; offsetY = 0; draw(); };
  $("zoomin").onclick = () => { zoom = Math.min(2.2, zoom * 1.12); draw(); };
  $("zoomout").onclick = () => { zoom = Math.max(0.4, zoom / 1.12); draw(); };
  $("zoom").oninput = () => { zoom = Number($("zoom").value) / 100; draw(); };
  $("fullscreen").onclick = () => $("viewport").requestFullscreen?.();
  ["grid", "bones", "ghost", "ghost-alpha"].forEach((id) => { $(id).oninput = draw; });
  $("file").onchange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      project = normalizeLoadedProject(JSON.parse(await file.text()));
      selectedTarget = "rig";
      selectSinglePart(project.parts.find((item) => item.id === "torso")?.id || project.parts[0]?.id || "torso");
      selectedKeys.clear();
      time = 0;
      ensureImages();
      commit("Proyecto importado");
      refresh();
    } catch (error) {
      status(`No se pudo importar: ${error.message}`);
    }
    event.target.value = "";
  };
}

function bindCanvas() {
  canvas.onwheel = (event) => {
    event.preventDefault();
    zoom = Math.max(0.4, Math.min(2.2, zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
    draw();
  };
  canvas.onpointerdown = (event) => {
    canvas.setPointerCapture(event.pointerId);
    const world = toWorld(event.clientX, event.clientY);
    if (tool === "pan") {
      interaction = { type: "pan", x: event.clientX, y: event.clientY, offsetX, offsetY };
      return;
    }
    if (mode === "calibrador" || mode === "sprites") {
      let chosen = null;
      let distance = Infinity;
      [...project.parts].sort((left, right) => right.z - left.z).forEach((item) => {
        const image = images[item.id];
        const width = image?.naturalWidth || 120;
        const height = image?.naturalHeight || 120;
        const score = Math.hypot((world.x - item.x) / (width / 2), (world.y - item.y) / (height / 2));
        if (score < 1.4 && score < distance) { chosen = item.id; distance = score; }
      });
      if (chosen) {
        selectSinglePart(chosen);
        if (!lockedParts.has(chosen)) interaction = { type: "piece", start: world, x: part().x, y: part().y, moved: false };
        refresh();
      }
      return;
    }
    const state = matrices(time);
    let chosen = "rig";
    let distance = Math.hypot(world.x - state.root[4], world.y - state.root[5]);
    Object.entries(state.joints).forEach(([id, matrix]) => {
      const score = Math.hypot(world.x - matrix[4], world.y - matrix[5]);
      if (score < distance) { chosen = id; distance = score; }
    });
    if (distance < 60) {
      selectedTarget = chosen;
      selectedKeys.clear();
      if (!lockedTargets.has(chosen)) {
        const sampled = state.pose[chosen] || {};
        if (tool === "select") {
          interaction = {
            type: "translate",
            target: chosen,
            start: world,
            x: sampled.x || 0,
            y: sampled.y || 0,
            parentMatrix: parentMatrixForTarget(chosen, state),
            moved: false
          };
        } else if (tool === "rotate") {
          interaction = { type: "rotate", target: chosen, startX: world.x, angle: sampled.angle || 0, moved: false };
        }
      }
      refresh();
    }
  };
  canvas.onpointermove = (event) => {
    if (!interaction) return;
    const world = toWorld(event.clientX, event.clientY);
    if (interaction.type === "pan") {
      offsetX = interaction.offsetX + event.clientX - interaction.x;
      offsetY = interaction.offsetY + event.clientY - interaction.y;
      draw();
    } else if (interaction.type === "piece") {
      part().x = interaction.x + world.x - interaction.start.x;
      part().y = interaction.y + world.y - interaction.start.y;
      interaction.moved = true;
      draw();
    } else if (interaction.type === "translate") {
      const delta = localDelta(
        interaction.parentMatrix,
        world.x - interaction.start.x,
        world.y - interaction.start.y
      );
      const current = exactKey(interaction.target) || { t: Math.round(time) };
      upsertKey(interaction.target, {
        ...current,
        x: interaction.x + delta.x,
        y: interaction.y + delta.y
      });
      interaction.moved = true;
      draw();
      renderInspector();
    } else if (interaction.type === "rotate") {
      const angle = Math.max(-360, Math.min(360, interaction.angle + (world.x - interaction.startX) * 0.45));
      const current = exactKey(interaction.target) || { t: Math.round(time) };
      upsertKey(interaction.target, { ...current, angle });
      interaction.moved = true;
      draw();
      renderInspector();
    }
  };
  canvas.onpointerup = () => {
    if (interaction?.moved) {
      const message = interaction.type === "piece"
        ? "Pieza desplazada"
        : interaction.type === "translate"
          ? "Posición animada actualizada"
          : "Rotación actualizada";
      commit(message);
    }
    interaction = null;
    refresh();
  };
  canvas.onpointercancel = canvas.onpointerup;
}

function movePartSelection(direction, extend) {
  const items = visibleLayerItems();
  if (!items.length) return;
  const currentIndex = items.findIndex((item) => item.id === selectedPart);
  const originIndex = currentIndex < 0 ? (direction > 0 ? -1 : items.length) : currentIndex;
  const nextIndex = Math.max(0, Math.min(items.length - 1, originIndex + direction));
  const nextId = items[nextIndex].id;
  if (extend) selectPartRange(nextId);
  else selectSinglePart(nextId);
  refresh();
  requestAnimationFrame(() => $("tree").querySelector(`[data-part-id="${CSS.escape(nextId)}"]`)?.scrollIntoView({ block: "nearest" }));
}

function bindKeyboard() {
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $("toolbar-more-panel").classList.contains("open")) {
      setToolbarMore(false);
      $("toolbar-more").focus();
      return;
    }
    const editing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "");
    if (event.ctrlKey && event.key.toLowerCase() === "z") { event.preventDefault(); restoreHistory(historyIndex - 1); return; }
    if (event.ctrlKey && event.key.toLowerCase() === "y") { event.preventDefault(); restoreHistory(historyIndex + 1); return; }
    if (editing) return;
    const partListActive = mode === "sprites" || mode === "calibrador" || leftTab === "layers";
    if (partListActive && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      movePartSelection(event.key === "ArrowUp" ? -1 : 1, event.shiftKey);
      return;
    }
    if (partListActive && event.ctrlKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      duplicateParts(selectedPartItems());
      return;
    }
    if (partListActive && (event.key === "Delete" || event.key === "Backspace")) {
      event.preventDefault();
      deleteParts(selectedPartItems());
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === "c") { event.preventDefault(); copySelectedKeys(); }
    else if (event.ctrlKey && event.key.toLowerCase() === "v") { event.preventDefault(); pasteKeys(); }
    else if (event.ctrlKey && event.key.toLowerCase() === "d") { event.preventDefault(); copySelectedKeys(); pasteKeys(time + 1000 / fps()); }
    else if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteSelectedKeys(); }
    else if (event.key === " ") { event.preventDefault(); playing ? pause() : play(); }
    else if (event.key.toLowerCase() === "v") setTool("select");
    else if (event.key.toLowerCase() === "h") setTool("pan");
    else if (event.key.toLowerCase() === "r") setTool("rotate");
    else if (event.key === "ArrowRight") setTime(time + 1000 / fps(), true);
    else if (event.key === "ArrowLeft") setTime(time - 1000 / fps(), true);
  });
}

function initialize() {
  project = loadInitialProject();
  project.clip = normalizeStudioProject(project.clip);
  syncPartSelection();
  STUDIO_EASES.forEach((ease) => {
    const option = document.createElement("option");
    option.value = ease;
    option.textContent = ease;
    $("key-ease").append(option);
  });
  ensureImages();
  bindControls();
  bindCanvas();
  bindKeyboard();
  window.addEventListener("resize", draw);
  checkpoint("Inicio de la sesión");
  const requestedMode = location.hash.slice(1);
  setMode(["animador", "calibrador", "sprites", "exportar", "proyecto"].includes(requestedMode) ? requestedMode : "animador");
}

initialize();
