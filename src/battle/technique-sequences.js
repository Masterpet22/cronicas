const clamp = n => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => a + (b - a) * t;
const phase = (t, start, end) => clamp((t - start) / (end - start));
const lift = t => Math.sin(Math.PI * t);
const white = 0xfff4cf;
const fire = 0xff6730;
const water = 0x55ccff;
const wind = 0x97ffe0;
const earth = 0xb67b4e;
const lightning = 0x7e96ff;

function line(g, points, width, color, alpha) {
  if (alpha <= 0) return;
  g.lineStyle(width, color, alpha).beginPath().moveTo(...points[0]);
  for (const point of points.slice(1)) g.lineTo(...point);
  g.strokePath();
}

function polygon(g, points, color, alpha) {
  if (alpha <= 0) return;
  g.fillStyle(color, alpha).beginPath().moveTo(...points[0]);
  for (const point of points.slice(1)) g.lineTo(...point);
  g.closePath().fillPath();
}

function arc(g, x, y, rx, ry, start, span, width, color, alpha) {
  const points = Array.from({ length: 25 }, (_, i) => {
    const angle = start + span * i / 24;
    return [x + rx * Math.cos(angle), y + ry * Math.sin(angle)];
  });
  line(g, points, width, color, alpha);
}

function shard(g, x, y, length, height, color, alpha) {
  const tip = [x + length * .62, y];
  polygon(g, [[x - length * .38, y], [x, y - height], tip, [x, y + height]], color, alpha);
  polygon(g, [[x - length * .38, y], [x, y - height], tip], white, alpha * .72);
}

function bolt(g, start, end, width, color, alpha, offset = 0) {
  const points = Array.from({ length: 8 }, (_, i) => {
    const t = i / 7;
    const jag = i === 0 || i === 7 ? 0 : (i % 2 ? 1 : -1) * (8 + (i * 5 + offset) % 17);
    return [mix(start[0], end[0], t) + jag, mix(start[1], end[1], t) - jag * .55];
  });
  line(g, points, width * 2.6, color, alpha * .32);
  line(g, points, width, white, alpha);
}

const sequences = {
  physical_1: [240, (g, t, a) => {
    const spread = 15 + 68 * t;
    for (const y of [-20, 2, 24]) {
      line(g, [[-spread, -40 + y * .16], [spread * .38, -40 + y]], 5 - 3 * t, 0xe6b07e, a);
    }
    arc(g, -15, -40, spread, spread * .56, -.7, 1.4, 4, white, a * .75);
  }],
  physical_2: [215, (g, t, a) => {
    for (let i = 0; i < 5; i++) {
      const x = mix(-145 + i * 16, 53 + i * 9, t);
      line(g, [[x - 58, 18 - i * 9], [x, 9 - i * 11]], 2 + i * .4, 0xc1eafa, a * (i + 3) / 8);
    }
  }],
  fire_arc: [640, (g, t, a, start) => {
    const x = mix(start, 15, t);
    const y = -32 - 99 * lift(t);
    arc(g, x, y, 58, 39, -1.36 + t * .8, 2.25, 13, fire, a * .65);
    arc(g, x + 4, y, 62, 38, -1.18 + t * .8, 1.79, 4, white, a);
    for (let i = 1; i < 5; i++) shard(g, x - 20 * i, y + 7 * i, 24 - i * 3, 6, fire, a / i);
  }],
  fire_brand: [730, (g, t, a) => {
    const size = mix(81, 31, phase(t, 0, .56));
    const rotation = (1 - t) * 1.4;
    const points = Array.from({ length: 7 }, (_, i) => [
      Math.cos(rotation + i * Math.PI / 3) * size,
      -43 + Math.sin(rotation + i * Math.PI / 3) * size
    ]);
    line(g, points, 7, 0xff421f, a * .58);
    line(g, points, 2.8, 0xffcb62, a);
    for (const i of [0, 2, 4]) line(g, [[0, -43], points[i]], 3, white, a);
  }],
  fire_ring: [780, (g, t, a, _start, floor) => {
    const r = 24 + 90 * phase(t, 0, .73);
    arc(g, 0, floor - 9, r, r * .29, 0, Math.PI * 2, 9, fire, a * .65);
    arc(g, 0, floor - 10, r - 5, r * .27, 0, Math.PI * 2, 3, white, a);
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9 + t * 1.8;
      const x = r * Math.cos(angle);
      const y = floor - 9 + r * .29 * Math.sin(angle);
      polygon(g, [[x - 9, y], [x + 4, y - 35 - 20 * lift(t)], [x + 10, y - 7]], 0xff9c42, a);
    }
  }],
  fire_phoenix: [940, (g, t, a, start) => {
    const x = mix(start - 18, 36, phase(t, .04, .82));
    const y = -64 - 68 * lift(t);
    const flap = 28 + 35 * Math.sin(t * Math.PI * 4);
    for (const side of [-1, 1]) {
      polygon(g, [[x, y + 17], [x - 27, y + side * flap],
        [x - 97, y + side * (flap + 29)], [x - 62, y + side * 15], [x - 91, y]], fire, a * .85);
      line(g, [[x - 94, y + side * (flap + 25)], [x - 25, y + side * 22], [x, y]], 4, 0xffba55, a);
    }
    shard(g, x, y, 86, 12, 0xffaa43, a);
    for (let i = 1; i <= 3; i++) arc(g, x - i * 24, y + i * 8, 26 + i * 8, 13, 1.5, 2.1, 4, fire, a / i);
  }],
  water_wall: [790, (g, t, a, _start, floor) => {
    const height = 115 * phase(t, 0, .55);
    for (let i = 0; i < 4; i++) {
      const x = -74 + i * 33 + 6 * Math.sin(t * 12 + i);
      polygon(g, [[x - 17, floor], [x - 14, floor - height * .65], [x + 4, floor - height],
        [x + 23, floor - height + 13], [x + 18, floor - height * .35], [x + 27, floor]], water, a * .57);
      line(g, [[x - 11, floor], [x - 8, floor - height * .61], [x + 5, floor - height], [x + 22, floor - height + 12]], 3, 0xc6faff, a);
    }
  }],
  water_lance: [760, (g, t, a, start) => {
    const x = mix(start - 20, 32, t ** 1.46);
    shard(g, x, -43, 151, 12, 0x569ffe, a);
    for (let i = 0; i < 7; i++) {
      const sway = Math.sin(t * 14 - i * .85) * 14;
      g.fillStyle(water, a * (7 - i) / 7).fillCircle(x - i * 13, -43 + sway, 5 - i * .44);
    }
    line(g, [[x - 124, -43], [x + 86, -43]], 3, 0xe5fcff, a * .7);
  }],
  earth_spike: [830, (g, t, a, start, floor) => {
    for (let i = 0; i < 6; i++) {
      const step = phase(t, i * .08, .28 + i * .08);
      if (!step) continue;
      const x = mix(start * .72, 21, i / 5);
      const tip = floor - (36 + i * 14) * step;
      polygon(g, [[x - 18, floor], [x - 5, tip + 15], [x + 18, tip], [x + 28, floor]], earth, a);
      polygon(g, [[x - 18, floor], [x + 18, tip], [x + 8, floor]], 0xe6b685, a * .83);
    }
  }],
  earth_quake: [900, (g, t, a, _start, floor) => {
    const r = 127 * phase(t, .03, .8);
    for (const direction of [-1, 1]) {
      for (let i = 1; i <= 3; i++) {
        line(g, [[0, floor - 5], [direction * r * .32, floor - i * 7],
          [direction * r * .62, floor + 2 * i], [direction * r, floor - i * 4]], 6 - i, 0x6a3825, a);
      }
    }
    for (let i = 0; i < 8; i++) {
      const x = (i - 3.5) * r / 4;
      const y = floor - lift(phase(t, .14 + i * .022, .9)) * (35 + i % 3 * 19);
      polygon(g, [[x - 9, y], [x - 5, y - 15], [x + 6, y - 14], [x + 11, y + 4]], earth, a);
    }
  }],
  wind_step: [565, (g, t, a, start) => {
    const x = mix(start, 34, phase(t, .16, .75));
    for (let i = 0; i < 5; i++) {
      const y = -70 + i * 18;
      line(g, [[x - 100 + 7 * i, y], [x - 64, y + 6], [x - 18, y - 10], [x + 29 + 4 * i, y - 11]],
        3.5 - i * .38, wind, a * (1 - i * .1));
    }
  }],
  wind_wave: [680, (g, t, a, start) => {
    const x = mix(start * .72, 10, t);
    for (let i = 0; i < 3; i++) {
      arc(g, x - i * 16, -47, 35 + t * 55, 31 + t * 38, -.97, 1.94, 8 - i * 2, i ? wind : white, a / (1 + i * .5));
    }
  }],
  wind_needles: [670, (g, t, a, start) => {
    for (let i = 0; i < 7; i++) {
      const flight = phase(t, i * .044, .62 + i * .044);
      if (!flight) continue;
      const x = mix(start - 17 * (i % 3), 17, flight);
      const y = mix(-74 + i * 13, -36 + (i - 3) * 7, flight);
      shard(g, x, y, 35, 2.4, wind, a);
      line(g, [[x - 65, y + 4], [x - 12, y]], 2, wind, a * .57);
    }
  }],
  wind_cyclone: [980, (g, t, a, _start, floor) => {
    const height = 158 * phase(t, .03, .6);
    for (let i = 0; i < 7; i++) {
      const y = floor - height * i / 7;
      arc(g, 0, y, 20 + i * 10, 9 + i * 2, i * .64 + 13 * t, 4.9, 5 - i * .38, i % 2 ? wind : white, a * .84);
    }
  }],
  vapor_burst: [820, (g, t, a, start) => {
    const x = mix(start * .5, 0, phase(t, 0, .48));
    for (let i = 0; i < 9; i++) {
      const spread = 39 + 57 * t;
      const angle = i * 2.4 + t * .8;
      const y = -36 + Math.sin(angle) * spread * .56 - 25 * t;
      g.fillStyle(0xcadff2, a * .21).fillCircle(x + Math.cos(angle) * spread, y, 17 + 15 * t);
      arc(g, x + Math.cos(angle) * spread, y, 17 + 15 * t, 14 + 10 * t, angle, 1.4, 2, white, a * .64);
    }
  }],
  magma_forge: [910, (g, t, a, _start, floor) => {
    arc(g, 0, floor - 4, 94 * phase(t, 0, .57), 16, .08, 6, 8, 0xf45226, a);
    for (let i = 0; i < 7; i++) {
      const rise = lift(phase(t, i * .03, .75 + i * .03));
      const x = (i - 3) * (16 + 17 * t);
      const y = floor - rise * (55 + (i % 3) * 24);
      polygon(g, [[x - 9, y + 13], [x - 10, y - 5], [x + 3, y - 14], [x + 11, y + 3]], 0x913321, a);
      line(g, [[x - 9, y + 5], [x + 2, y], [x + 3, y - 13]], 4, 0xffa338, a);
    }
  }],
  lightning_spark: [470, (g, t, a, start) => {
    const x = mix(start, 8, t ** 1.17);
    bolt(g, [Math.max(start - 5, x - 101), -55], [x, -41], 4, lightning, a, Math.floor(t * 45));
    g.fillStyle(0xe6e9ff, a * .85).fillCircle(x, -41, 5);
  }],
  lightning_chain: [710, (g, t, a, start) => {
    const reach = mix(start, 35, phase(t, .02, .75));
    const junction = [(start + reach) / 2, -64];
    bolt(g, [start, -28], junction, 4, lightning, a, 3);
    bolt(g, junction, [reach, -26], 4, lightning, a, 12);
    bolt(g, junction, [reach - 20, -102], 2, lightning, a * .8, 21);
    bolt(g, junction, [reach - 51, 1], 2, lightning, a * .69, 8);
  }],
  lightning_heaven: [885, (g, t, a, _start, floor) => {
    const fall = phase(t, .14, .55);
    if (!fall) return;
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 47;
      bolt(g, [x - 15, -186], [x, mix(-186, floor - 7, fall)], 4 + (i % 2) * 5, lightning, a, i * 9);
    }
    if (fall === 1) arc(g, 0, floor - 7, 88 * t, 16, 0, Math.PI * 2, 3, 0xb9b4ff, a);
  }],
  plant_bind: [850, (g, t, a, _start, floor) => {
    const growth = phase(t, 0, .76);
    for (const direction of [-1, 1]) {
      const points = Array.from({ length: 20 }, (_, i) => {
        const p = i / 19 * growth;
        return [direction * (Math.cos(p * 12) * (39 - 14 * p) + 11), floor - 150 * p];
      });
      line(g, points, 10, 0x32704b, a);
      line(g, points, 3, 0x93ec8d, a);
      for (const [x, y] of points.filter((_, i) => i % 5 === 3)) {
        polygon(g, [[x, y], [x + direction * 18, y - 13], [x + direction * 28, y - 10], [x + direction * 15, y + 2]], 0x69bd6c, a);
      }
    }
  }],
  ice_spear: [770, (g, t, a, start) => {
    const x = mix(start, 12, phase(t, 0, .78));
    shard(g, x, -49, 138, 19, 0x8cdbfc, a);
    for (let i = 1; i < 6; i++) shard(g, x - i * (12 + 7 * t), -48 + (i % 2 ? -1 : 1) * (8 + i * 6), 22, 5, 0xc6efff, a * (1 - i * .13));
  }],
  sand_coffin: [860, (g, t, a, _start, floor) => {
    const rise = phase(t, .05, .68);
    const radius = mix(93, 40, rise);
    for (let i = 0; i < 5; i++) {
      const y = floor - i * rise * 29;
      arc(g, 0, y, radius - i * 5, 12, t * 10 + i * .7, 4.85, 10 - i, 0xcfa36b, a * .84);
    }
    for (let i = 0; i < 12; i++) {
      const angle = t * 12 + i * 2.39;
      g.fillStyle(0xffd69b, a).fillCircle(radius * Math.cos(angle), floor + 13 * Math.sin(angle) - i * rise * 10, 2.4);
    }
  }],
  lightning_prison: [860, (g, t, a, _start, floor) => {
    const span = phase(t, .05, .57);
    const height = 134 * span;
    const edges = [-57, -23, 23, 57];
    for (const x of edges) bolt(g, [x, floor - height], [x * 1.12, floor], 3.6, lightning, a, Math.floor(t * 42 + Math.abs(x)));
    for (const y of [floor, floor - height]) arc(g, 0, y, 72, 17, 0, Math.PI * 2, 4, 0x99a8ff, a);
  }],
  venom_bloom: [890, (g, t, a, _start, floor) => {
    const radius = mix(8, 81, phase(t, .05, .78));
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7 + t * .8;
      const x = Math.cos(angle) * radius;
      const y = floor - 35 + Math.sin(angle) * radius * .69;
      polygon(g, [[0, floor - 35], [x * .78 - 14, y * .85 + 4], [x, y], [x * .83 + 15, y + 9]], i % 2 ? 0xc287e7 : 0x73ba5d, a);
      g.fillStyle(0xb1e778, a * .54).fillCircle(x * 1.18, y - 14 * t, 2.6 + i % 3);
    }
    g.fillStyle(0xdfc26d, a).fillCircle(0, floor - 35, 11);
  }],
  metal_bastion: [850, (g, t, a, _start, floor) => {
    for (let i = 0; i < 5; i++) {
      const slot = phase(t, i * .065, .38 + i * .065);
      if (!slot) continue;
      const x = (i - 2) * (19 + 9 * slot);
      const y = floor - (68 + (2 - Math.abs(i - 2)) * 17) * slot;
      const plate = [[x - 14, floor], [x - 18, y + 13], [x, y], [x + 17, y + 13], [x + 14, floor]];
      polygon(g, plate, 0x69788b, a);
      line(g, [...plate, plate[0]], 3, 0xd8e8f2, a);
      line(g, [[x - 7, floor - 8], [x - 8, y + 17], [x, y + 9]], 3, 0xa4b5be, a);
    }
    if (t > .51) line(g, [[-77, floor - 13], [mix(-77, 77, phase(t, .51, .77)), floor - 75]], 3, white, a * .85);
  }],
  frost_crown: [820, (g, t, a) => {
    const spread = phase(t, .04, .62);
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 19 * spread;
      const y = -78 - (3 - Math.abs(i - 3)) * 15 * spread;
      polygon(g, [[x - 12, -67], [x, y - 16], [x + 12, -67]], 0xb9ebff, a);
      line(g, [[x, y - 16], [x, -67]], 2, 0xe9fcff, a);
    }
    arc(g, 0, -67, 69 * spread, 17, 0, Math.PI * 2, 4, 0x9edbfa, a);
    arc(g, 0, -63, 54 * spread, 13, t * 4, Math.PI, 2, white, a * .73);
  }],
  glass_rain: [900, (g, t, a, _start, floor) => {
    for (let i = 0; i < 15; i++) {
      const fall = phase(t, (i % 5) * .066, .5 + (i % 5) * .066);
      if (!fall || fall === 1) continue;
      const x = (i - 7) * 14 + 40 * (1 - fall);
      const y = mix(-159 - i % 3 * 22, floor + 15, fall);
      line(g, [[x + 16, y - 34], [x, y]], 1.5, 0xfff0b5, a * .65);
      polygon(g, [[x + 11, y - 23], [x + 15, y - 10], [x - 5, y + 9]], i % 2 ? 0xb3e0e8 : 0xffd683, a);
    }
  }],
  storm_domain: [990, (g, t, a, _start, floor) => {
    const radius = 73 + 44 * phase(t, 0, .66);
    for (let i = 0; i < 3; i++) {
      arc(g, 0, -112 + i * 12, radius - i * 14, 20, i + t * 7, Math.PI * 1.8, 11 - i * 2, 0x6674d1, a * .56);
    }
    for (let i = 0; i < 5; i++) {
      const flash = lift(phase(t, .12 + i * .1, .4 + i * .12));
      const x = (i - 2) * 41;
      bolt(g, [x - 10, -99], [x, floor - 8], 4, 0x949fff, a * flash, i * 7);
    }
    arc(g, 0, floor - 3, radius, radius * .21, 0, Math.PI * 2, 3, 0xafb8ff, a * .57);
  }],
  crystal_prism: [930, (g, t, a, start) => {
    const size = phase(t, .02, .49);
    const x = -23;
    const y = -49;
    const point = [x, y - 67 * size];
    polygon(g, [point, [x + 54 * size, y + 34 * size], [x - 56 * size, y + 38 * size]], 0x66bdc8, a * .88);
    line(g, [point, [x + 54 * size, y + 34 * size], [x - 56 * size, y + 38 * size], point], 3, 0xd2fcff, a);
    const beam = phase(t, .1, .46);
    line(g, [[start, y + 18], [mix(start, x, beam), y]], 4, white, a * .87);
    if (beam === 1) {
      const reach = phase(t, .46, .74);
      [0x91effc, 0xebadf7, 0xffd583].forEach((color, i) =>
        line(g, [[x, y], [x + 121 * reach, y + (i - 1) * 33 * reach]], 4, color, a));
    }
  }],
  ash_funeral: [930, (g, t, a, _start, floor) => {
    const rise = phase(t, .02, .79);
    for (let i = 0; i < 16; i++) {
      const x = ((i * 29) % 113 - 56) * (.61 + t * .77) + Math.sin(i + t * 7) * 13;
      const y = floor - (32 + i * 7) * rise;
      g.fillStyle(i % 3 ? 0x776973 : 0xd48a54, a * .67).fillCircle(x, y, i % 3 ? 3 + t * 4 : 2.5);
    }
    for (let i = 0; i < 3; i++) arc(g, i * 15 - 15, floor - 20 - i * 24 - 65 * rise,
      43 + i * 6, 15, 2 + t * 3, 3.9, 6, 0xa498a3, a * .52);
  }],
  root_colossus: [980, (g, t, a, _start, floor) => {
    const growth = phase(t, .04, .72);
    for (const sign of [-1, 1]) {
      const x = sign * 31;
      const peak = floor - 158 * growth;
      const branches = [[x * 2.45, floor], [x * 1.37, floor - 50 * growth], [x * .74, peak + 35], [x * .30, peak]];
      line(g, branches, 19, 0x6d5234, a);
      line(g, branches, 6, 0xab9763, a);
      line(g, [[x * 1.37, floor - 50 * growth], [x * 2.25, floor - 85 * growth], [x * 2.9, floor - 104 * growth]], 8, 0x846c49, a);
      polygon(g, [[x * .7, peak + 40], [x * 1.25, peak + 17], [x * 1.7, peak + 23], [x * 1.07, peak + 38]], 0x86bb70, a);
    }
  }],
  toxin: [690, (g, t, a, start) => {
    const x = mix(start, 24, t);
    const y = -37 - 28 * lift(t);
    polygon(g, [[x - 50, y], [x + 7, y - 6], [x + 29, y], [x + 7, y + 5]], 0xb395ec, a);
    for (let i = 1; i <= 5; i++) {
      g.fillStyle(0xa3d680, a * (6 - i) / 6).fillCircle(x - i * 16, y + 7 + i * 3, 5 - i * .58);
    }
  }],
  plasma: [810, (g, t, a, start) => {
    const x = mix(start, 19, phase(t, .02, .84));
    const y = -58 - 32 * lift(t);
    g.fillStyle(0x9270ff, a * .47).fillCircle(x, y, 32);
    g.fillStyle(0xe3bfff, a * .92).fillCircle(x, y, 12);
    for (let i = 0; i < 3; i++) arc(g, x, y, 42 - i * 7, 25 + i * 5, t * 13 + i * .9, 3.8, 3, 0xc79bff, a);
    bolt(g, [x - 101, y + 15], [x - 23, y], 3, 0xba86ff, a * .86, Math.floor(t * 38));
  }],
  obsidiana: [900, (g, t, a, _start, floor) => {
    for (let i = 0; i < 6; i++) {
      const growth = phase(t, i * .051, .39 + i * .052);
      if (!growth) continue;
      const x = -93 + i * 31;
      const tip = floor - (69 + (i % 3) * 23) * growth;
      const edge = [[x - 17, floor], [x + 5, tip], [x + 20, tip + 16], [x + 27, floor]];
      polygon(g, edge, 0x43384b, a);
      polygon(g, [edge[0], edge[1], [x + 14, floor]], 0x81617f, a);
      line(g, [edge[1], edge[2], edge[3]], 3, 0xefd1e0, a * .77);
    }
  }],
  niebla: [980, (g, t, a, start, floor) => {
    const x = mix(start * .68, 46, phase(t, 0, .84));
    for (let i = 0; i < 6; i++) {
      const y = floor - i * 17;
      const run = 59 + i * 11 + t * 47;
      arc(g, x - i * 6, y, run, 10 + i * 2, -.61 + t * .3, 3.15, 15 - i * 1.7, 0xbfdbe9, a * .29);
      arc(g, x - i * 6, y, run - 6, 10 + i * 2, -.5 + t * .3, 2.8, 2, 0xe8f7ff, a * .68);
    }
  }],
  espora: [900, (g, t, a, _start, floor) => {
    const release = phase(t, .12, .8);
    for (let i = 0; i < 22; i++) {
      const angle = i * 2.3999 + t * .72;
      const radius = (17 + (i * 17) % 92) * release;
      const x = Math.cos(angle) * radius;
      const y = floor - 14 - release * (28 + (i * 19) % 83) + Math.sin(angle) * radius * .32;
      g.fillStyle(i % 3 ? 0xd4e191 : 0x8cba75, a * .84).fillCircle(x, y, 2.4 + (i * 3) % 5);
    }
    for (const x of [-33, 12, 44]) arc(g, x, floor - 19, 18, 12, Math.PI, Math.PI, 5, 0xa4c780, a * (1 - release * .51));
  }]
};

export const ELEMENT_SEQUENCE_IDS = Object.freeze(["plasma", "obsidiana", "niebla", "espora"]);

function sequenceFor(id, element) {
  if (Object.hasOwn(sequences, id)) return sequences[id];
  if (ELEMENT_SEQUENCE_IDS.includes(element)) return sequences[element];
}

export function hasTechniqueSequence(id, element) {
  return Boolean(sequenceFor(id, element));
}

export async function playTechniqueSequence(scene, action, source, target, direction) {
  const [duration, draw] = sequenceFor(action.id, action.element);
  const graphic = scene.add.graphics().setName(action.id).setDepth(14)
    .setPosition(target.body.x, target.body.y).setScale(direction, 1);
  const start = (source.body.x - target.body.x) * direction;
  const floor = target.shadow.y - target.body.y;
  const progress = { value: 0 };
  try {
    await scene.tween({
      targets: progress, value: 1, duration, ease: "Linear",
      onUpdate: () => {
        const t = progress.value;
        graphic.clear();
        draw(graphic, t, Math.min(t * 10, (1 - t) * 5, 1), start, floor);
      }
    });
  } finally {
    graphic.destroy();
  }
}
