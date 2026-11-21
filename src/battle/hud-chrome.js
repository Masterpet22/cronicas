import { HUD_ART } from './hud-art.js?v=0.171.0';

const BRASS = {
  edge: 0x9d7445, dark: 0x4c3525, face: 0xae8450, light: 0xe0bd82, cut: 0x634629
};

// The same cast corner plate is rendered in the canvas and in the DOM.
const CORNER = [
  { path: [['M', 1, 12], ['L', 12, 1], ['L', 27, 1], ['L', 27, 5], ['L', 15, 5], ['L', 5, 15], ['L', 5, 27], ['L', 1, 27], ['Z']], fill: BRASS.face, stroke: BRASS.dark, width: .9 },
  { path: [['M', 2, 13], ['L', 13, 2], ['L', 26, 2]], stroke: BRASS.light, width: .8 },
  { path: [['M', 4, 24], ['L', 4, 15], ['L', 15, 4], ['L', 23, 4]], stroke: BRASS.cut, width: .8 },
  { path: [['M', 8, 10], ['L', 10, 8], ['L', 12, 10], ['L', 10, 12], ['Z']], fill: BRASS.dark, stroke: BRASS.light, width: .6 }
];

export function chromePath(g, commands, { x = 0, y = 0, sx = 1, sy = 1, fill = null, stroke = HUD_ART.gold, width = 1, alpha = 1 } = {}) {
  const points = [];
  let px = 0, py = 0;
  let closed = false;
  const point = (u, v) => points.push({ x: x + u * sx, y: y + v * sy });
  for (const [command, ...v] of commands) {
    if (command === 'M' || command === 'L') { [px, py] = v; point(px, py); }
    if (command === 'C') {
      const ax = px, ay = py;
      for (let step = 1; step <= 16; step += 1) {
        const t = step / 16, s = 1 - t;
        point(s ** 3 * ax + 3 * s * s * t * v[0] + 3 * s * t * t * v[2] + t ** 3 * v[4],
          s ** 3 * ay + 3 * s * s * t * v[1] + 3 * s * t * t * v[3] + t ** 3 * v[5]);
      }
      [px, py] = v.slice(4);
    }
    if (command === 'Q') {
      const ax = px, ay = py;
      for (let step = 1; step <= 12; step += 1) {
        const t = step / 12, s = 1 - t;
        point(s * s * ax + 2 * s * t * v[0] + t * t * v[2], s * s * ay + 2 * s * t * v[1] + t * t * v[3]);
      }
      [px, py] = v.slice(2);
    }
    if (command === 'Z') closed = true;
  }
  if (fill !== null) g.fillStyle(fill, alpha).fillPoints(points, true);
  if (stroke !== null) g.lineStyle(width, stroke, alpha).strokePoints(points, closed);
}

function drawCorner(g, x, y, sx, sy) {
  for (const { path, ...paint } of CORNER) chromePath(g, path, { x, y, sx, sy, ...paint });
}

export function hudPanelOrnaments() {
  const hex = value => value == null ? "none" : `#${value.toString(16).padStart(6, '0')}`;
  const paths = CORNER.map(({ path, fill, stroke, width }) =>
    `<path d="${path.map(command => command.join(' ')).join(' ')}" fill="${hex(fill)}" stroke="${hex(stroke)}" stroke-width="${width}"/>`).join('');
  return ['nw', 'ne', 'sw', 'se'].map(corner =>
    `<svg class="combat-panel-corner ${corner}" viewBox="0 0 28 28" aria-hidden="true">${paths}</svg>`).join('');
}

export function drawStatusPanel(g, x, y, w, h) {
  const outline = [['M', 34, 0], ['L', w - 12, 0], ['L', w, 12], ['L', w, h - 12], ['L', w - 12, h],
    ['L', 87, h], ['L', 79, h - 4], ['L', 70, h - 12], ['L', 38, h - 12], ['Q', 0, h - 12, 0, h - 44], ['L', 0, 34], ['Q', 0, 6, 34, 0], ['Z']];
  chromePath(g, outline, { x, y: y + 2, fill: 0x02050a, stroke: null, alpha: .65 });
  chromePath(g, outline, { x, y, fill: HUD_ART.inkDeep, stroke: BRASS.edge, width: 1.3 });
  chromePath(g, outline, { x: x + 3, y: y + 3, sx: (w - 6) / w, sy: (h - 6) / h, stroke: BRASS.light, width: .65, alpha: .4 });
  drawCorner(g, x + w, y, -.86, .86);
  drawCorner(g, x + w, y + h, -.86, -.86);
}

function drawInlaidStud(g, x, y, scale = 1) {
  const bezel = [['M', -10, 0], ['L', -5, -7], ['L', 5, -7], ['L', 10, 0], ['L', 5, 7], ['L', -5, 7], ['Z']];
  chromePath(g, bezel, { x, y, sx: scale, sy: scale, fill: BRASS.dark, stroke: BRASS.face, width: .9 });
  chromePath(g, [['M', -7, 0], ['L', 0, -4.5], ['L', 7, 0], ['L', 0, 4.5], ['Z']],
    { x, y, sx: scale, sy: scale, fill: BRASS.face, stroke: BRASS.light, width: .65 });
  chromePath(g, [['M', -4, 0], ['L', 0, -2.5], ['L', 4, 0], ['L', 0, 2.5], ['Z']],
    { x, y, sx: scale, sy: scale, fill: 0x151a24, stroke: BRASS.cut, width: .65 });
}

export function drawTurnPlaque(g, x, y, w, h, fill = HUD_ART.wine) {
  const plate = [['M', 10, 0], ['L', w - 10, 0], ['L', w, 10], ['L', w, h - 10], ['L', w - 10, h],
    ['L', 10, h], ['L', 0, h - 10], ['L', 0, 10], ['Z']];
  chromePath(g, plate, { x, y: y + 2, fill: 0x02050a, stroke: null, alpha: .65 });
  chromePath(g, plate, { x, y, fill: BRASS.dark, stroke: BRASS.edge, width: 1.2 });
  chromePath(g, plate, { x: x + 3, y: y + 3, sx: (w - 6) / w, sy: (h - 6) / h, fill, stroke: BRASS.light, width: .7 });
  g.lineStyle(.7, BRASS.light, .75).lineBetween(x + 11, y + 1, x + w - 11, y + 1);
  for (const center of [x + 16, x + w - 16]) drawInlaidStud(g, center, y + h / 2, .8);
}

export function drawInitiativeFrame(g, x, y, w, h) {
  const plate = [['M', 0, h / 2], ['L', 12, 9], ['L', 28, 0], ['L', w - 28, 0], ['L', w - 12, 9], ['L', w, h / 2],
    ['L', w - 12, h - 9], ['L', w - 28, h], ['L', 28, h], ['L', 12, h - 9], ['Z']];
  chromePath(g, plate, { x, y: y + 2, fill: 0x00030b, stroke: null, alpha: .65 });
  chromePath(g, plate, { x, y, fill: BRASS.dark, stroke: BRASS.edge, width: 1.2 });
  chromePath(g, plate, { x: x + 4, y: y + 3, sx: (w - 8) / w, sy: (h - 6) / h, fill: HUD_ART.inkDeep, stroke: BRASS.light, width: .7 });
  for (const [center, sign] of [[x + 27, 1], [x + w - 27, -1]]) {
    drawInlaidStud(g, center, y + h / 2, 1.35);
    for (const offset of [-9, 9]) {
      g.fillStyle(BRASS.dark, 1).fillCircle(center + sign * 15, y + h / 2 + offset, 2.4);
      g.lineStyle(.75, BRASS.light, .85).strokeCircle(center + sign * 15, y + h / 2 + offset, 1.6);
    }
  }
}

export function drawResourceEmblem(scene, kind, x, y) {
  const g = scene.add.graphics().setPosition(x, y).setDepth(25);
  if (kind === 'health') {
    const heart = [['M', 0, 7], ['C', -3, 4, -10, 0, -8, -5], ['C', -6, -10, -1, -8, 0, -5],
      ['C', 3, -10, 10, -8, 9, -3], ['C', 8, 1, 3, 5, 0, 7], ['Z']];
    chromePath(g, heart, { y: 1, fill: 0x02050b, stroke: 0x02050b, width: 2.2 });
    chromePath(g, heart, { fill: 0xee3637, stroke: 0x9d151c, width: 1 });
    chromePath(g, [['M', -7, -1], ['Q', -2, 6, 0, 7], ['Q', 6, 3, 8, -1], ['Q', 1, 3, -7, -1], ['Z']], { fill: 0xa91822, stroke: null, alpha: .65 });
    g.fillStyle(0xffc7ac, .85).fillEllipse(-4, -5, 4.5, 2.5);
  } else {
    g.fillStyle(0x020814, 1).fillCircle(0, 0, 9).lineStyle(1, 0x144570, 1).strokeCircle(0, 0, 8.5);
    const swirl = [['M', 2, -7], ['C', -6, -9, -10, 0, -4, 5], ['C', 2, 11, 10, 3, 5, -2], ['C', 1, -6, -4, -1, -1, 2], ['C', 2, 5, 5, 1, 2, 0]];
    chromePath(g, swirl, { stroke: 0x0872bf, width: 4.5 });
    chromePath(g, swirl, { stroke: 0x26b9f3, width: 2.6 });
    chromePath(g, [['M', -6, -3], ['Q', -3, -8, 1, -7]], { stroke: 0xa7f4ff, width: 1.1 });
    g.fillStyle(0x77dcff, 1).fillTriangle(4, -9, 7, -5, 2, -6);
  }
  return g;
}
