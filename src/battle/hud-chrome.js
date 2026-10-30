import { HUD_ART } from './hud-art.js?v=0.114.0';

// Shared scrollwork for the Canvas frames and the projected native skill rail.
const SCROLLS = [
  [['M', 1, 23], ['C', 0, 15, 4, 10, 12, 7], ['C', 23, 3, 24, 9, 18, 12], ['C', 12, 15, 10, 8, 16, 8], ['C', 20, 8, 18, 11, 16, 10]],
  [['M', 3, 17], ['C', 11, 22, 15, 16, 10, 13], ['C', 5, 10, 2, 16, 7, 17]],
  [['M', 8, 6], ['C', 5, 0, 12, -1, 15, 3], ['C', 18, 7, 11, 9, 11, 4]],
  [['M', 1, 8], ['L', 4, 3], ['L', 10, 1]]
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

export function drawScroll(g, x, y, sx = 1, sy = 1) {
  SCROLLS.forEach(commands => chromePath(g, commands, { x, y, sx, sy, width: 1.15 }));
}

export function skillFrameSvg() {
  const scroll = SCROLLS.map(commands => `<path d="${commands.map(c => c.join(' ')).join(' ')}"/>`).join('');
  const corners = [[2, 2, .7, .7], [178, 2, -.7, .7], [2, 406, .7, -.7], [178, 406, -.7, -.7]]
    .map(([x, y, sx, sy]) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${scroll}</g>`).join('');
  const joints = [68, 136, 204, 272, 340].map(y => `<path d="M173 ${y - 5}q-5 0-5 5h8m-3 5q-5 0-5-5"/>`).join('');
  return `<svg class="combat-skill-ornaments" viewBox="0 0 180 408" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path opacity=".65" d="M5 20V12Q5 5 14 5H166Q175 5 175 14V394Q175 403 166 403H14Q5 403 5 394V20"/>${corners}${joints}</g></svg>`;
}

export function drawStatusPanel(g, x, y, w, h, mirrored = false) {
  const outline = [['M', 34, 0], ['L', w - 24, 0], ['Q', w, 0, w, 20], ['L', w, h - 22], ['Q', w, h - 7, w - 24, h],
    ['L', 87, h], ['L', 79, h - 4], ['L', 70, h - 12], ['L', 38, h - 12], ['Q', 0, h - 12, 0, h - 44], ['L', 0, 34], ['Q', 0, 6, 34, 0], ['Z']];
  const transform = { x: mirrored ? x + w : x, y, sx: mirrored ? -1 : 1 };
  chromePath(g, outline, { ...transform, y: y + 2, stroke: 0x02050a, width: 4, fill: 0x02050a, alpha: .6 });
  chromePath(g, outline, { ...transform, fill: HUD_ART.inkDeep, width: 1.2, alpha: .97 });
  chromePath(g, outline, { x: mirrored ? x + w - 3 : x + 3, y: y + 3, sx: (mirrored ? -1 : 1) * (w - 6) / w, sy: (h - 6) / h, width: .6, alpha: .6 });
  const edgeX = mirrored ? x + 1 : x + w - 1;
  const sign = mirrored ? 1 : -1;
  drawScroll(g, edgeX, y + 1, sign * .8, .8);
  drawScroll(g, edgeX, y + h - 2, sign * .9, -.9);
  drawScroll(g, mirrored ? x + w - 67 : x + 67, y + h - 12, mirrored ? -.65 : .65, -.65);
}

export function drawCloudPlate(g, x, y, w, h, fill = HUD_ART.wine) {
  const p = [['M', 18, 0], ['L', w - 18, 0], ['Q', w - 10, 0, w - 8, 7], ['L', w, h / 2], ['L', w - 8, h - 7],
    ['Q', w - 10, h, w - 18, h], ['L', 18, h], ['Q', 10, h, 8, h - 7], ['L', 0, h / 2], ['L', 8, 7], ['Q', 10, 0, 18, 0], ['Z']];
  chromePath(g, p, { x, y: y + 2, fill: 0x02050a, stroke: null, alpha: .5 });
  chromePath(g, p, { x, y, fill, width: 1.5 });
  chromePath(g, p, { x: x + 3, y: y + 2, sx: (w - 6) / w, sy: (h - 4) / h, width: .6, alpha: .65 });
  drawScroll(g, x + 6, y + 2, .85, .78 * h / 28);
  drawScroll(g, x + w - 6, y + h - 2, -.85, -.78 * h / 28);
}

export function drawInitiativeFrame(g, x, y, w, h) {
  const p = [['M', 0, h / 2], ['L', 20, 5], ['Q', 33, 0, 54, 0], ['L', w - 54, 0], ['Q', w - 33, 0, w - 20, 5],
    ['L', w, h / 2], ['L', w - 20, h - 5], ['Q', w - 33, h, w - 54, h], ['L', 54, h], ['Q', 33, h, 20, h - 5], ['Z']];
  chromePath(g, p, { x, y: y + 2, fill: 0x00030b, stroke: null, alpha: .55 });
  chromePath(g, p, { x, y, fill: HUD_ART.inkDeep, width: 1.4, alpha: .96 });
  chromePath(g, p, { x: x + 5, y: y + 3, sx: (w - 10) / w, sy: (h - 6) / h, width: .6, alpha: .65 });
  for (const [cx, sign] of [[x + 13, 1], [x + w - 13, -1]]) {
    chromePath(g, [['M', 0, -9], ['L', -5, -4], ['L', 0, 0], ['L', -5, 4], ['L', 0, 9]], { x: cx, y: y + h / 2, sx: sign, width: 1.3 });
  }
}

export function drawTimelineTail(g, x, y) {
  const p = [['M', 20, 0], ['C', 12, 0, 12, -9, 5, -9], ['C', -6, -13, -14, -3, -7, 6],
    ['C', -1, 15, 12, 10, 9, 3], ['C', 6, -4, -2, 0, 1, 4]];
  chromePath(g, p, { x, y, stroke: 0x2e100d, width: 7 });
  chromePath(g, p, { x, y, width: 3.3 });
  chromePath(g, [['M', -8, -6], ['L', -12, -4], ['L', -8, -1]], { x, y, width: 2 });
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

export function drawBeveledTag(g, width = 68, height = 15) {
  chromePath(g, [['M', -width / 2 + 4, -height / 2], ['L', width / 2 - 4, -height / 2], ['L', width / 2, -height / 2 + 3],
    ['L', width / 2, height / 2 - 2], ['L', width / 2 - 3, height / 2], ['L', -width / 2, height / 2], ['L', -width / 2, -height / 2 + 3], ['Z']],
  { fill: HUD_ART.inkDeep, width: .8 });
}
