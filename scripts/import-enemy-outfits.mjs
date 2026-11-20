import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../assets/modular/outfits/factions/', import.meta.url);
const entries = JSON.parse(await readFile(new URL('../training/source/layout.json', root), 'utf8'));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const style of ['troop', 'commander']) {
    const source = `data:image/png;base64,${(await readFile(new URL(`source/${style}.png`, root))).toString('base64')}`;
    for (const body of ['male', 'female']) {
      const atlas = await page.evaluate(async ({ source, entries, body }) => {
        const image = new Image(); image.src = source; await image.decode();
        const cell = image.width / 4;
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        const frames = {}; let x = 2, y = 2, rowHeight = 0;
        for (const part of entries.filter(part => part.body === body).sort((a,b) => b.naturalHeight - a.naturalHeight)) {
          const slice = document.createElement('canvas'); slice.width = slice.height = Math.ceil(cell);
          const c = slice.getContext('2d', { willReadFrequently: true });
          c.drawImage(image, part.cell % 4 * cell, Math.floor(part.cell / 4) * cell, cell, cell, 0, 0, cell, cell);
          const pixels = c.getImageData(0, 0, slice.width, slice.height).data;
          let l = slice.width, t = slice.height, r = -1, b = -1;
          for (let py=0; py<slice.height; py++) for (let px=0; px<slice.width; px++) {
            if (pixels[(py*slice.width+px)*4+3] <= 24) continue;
            l=Math.min(l,px); t=Math.min(t,py); r=Math.max(r,px); b=Math.max(b,py);
          }
          if (r < l) throw new Error(`Empty outfit piece: ${body}/${part.id}`);
          const w=part.naturalWidth, h=part.naturalHeight;
          if (x+w+2 > canvas.width) { x=2; y+=rowHeight+4; rowHeight=0; }
          if (y+h+2 > canvas.height) throw new Error('Outfit atlas overflow');
          ctx.drawImage(slice,l,t,r-l+1,b-t+1,x,y,w,h);
          frames[part.id]={ frame:{x,y,w,h}, rotated:false, trimmed:false, spriteSourceSize:{x:0,y:0,w,h}, sourceSize:{w,h} };
          x+=w+4; rowHeight=Math.max(rowHeight,h);
        }
        return { png:canvas.toDataURL('image/png').split(',')[1], json:{frames,meta:{size:{w:1024,h:1024},scale:'1'}} };
      }, { source, entries, body });
      await writeFile(new URL(`${style}-${body}.png`, root), Buffer.from(atlas.png, 'base64'));
      await writeFile(new URL(`${style}-${body}.json`, root), JSON.stringify(atlas.json, null, 2)+'\n');
    }
  }
} finally { await browser.close(); }
console.log('Exported four enemy outfit atlases, preserving all fourteen segment dimensions.');
