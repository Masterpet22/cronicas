import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../assets/modular/outfits/training/', import.meta.url);
const entries = JSON.parse(await readFile(new URL('source/layout.json', root), 'utf8'));
const source = `data:image/png;base64,${(await readFile(new URL('source/atlas.png', root))).toString('base64')}`;
const browser = await chromium.launch({ headless:true });
try {
  const page = await browser.newPage();
  const textures = await page.evaluate(async ({ entries, source }) => {
    const image = new Image(); image.src = source; await image.decode();
    const cell = image.width / 4, stride = Math.ceil(cell);
    return entries.map(entry => {
      const canvas = document.createElement('canvas'); canvas.width = stride; canvas.height = stride;
      const context = canvas.getContext('2d', { willReadFrequently:true });
      context.drawImage(image, entry.cell % 4 * cell, Math.floor(entry.cell / 4) * cell, cell, cell, 0, 0, stride, stride);
      const data = context.getImageData(0, 0, stride, stride).data;
      let left = stride, top = stride, right = -1, bottom = -1;
      for (let y = 0; y < stride; y++) for (let x = 0; x < stride; x++) if (data[(y * stride + x) * 4 + 3] > 24) {
        left = Math.min(left,x); right = Math.max(right,x); top = Math.min(top,y); bottom = Math.max(bottom,y);
      }
      if (right < left) throw new Error(`Celda vacía: ${entry.body}/${entry.id}`);
      const out = document.createElement('canvas'); out.width = entry.naturalWidth; out.height = entry.naturalHeight;
      out.getContext('2d').drawImage(canvas, left, top, right-left+1, bottom-top+1, 0, 0, out.width, out.height);
      return { ...entry, png:out.toDataURL('image/png').split(',')[1] };
    });
  }, { entries, source });
  for (const texture of textures) await writeFile(new URL(`${texture.body}/${texture.id}.png`, root), Buffer.from(texture.png,'base64'));
  console.log(`${textures.length} piezas de entrenamiento exportadas sin modificar los anclajes.`);
} finally { await browser.close(); }
