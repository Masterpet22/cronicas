import { chromium } from '@playwright/test';
import { readFile,writeFile } from 'node:fs/promises';
const entries=JSON.parse(await readFile('artifacts/correcciones/outfit-reference.json','utf8'));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
await page.goto('http://127.0.0.1:4173/');
const textures=await page.evaluate(async entries=>{
 const image=new Image();image.src='/artifacts/correcciones/outfit-generated.png';await image.decode();
 const cell=image.width/4, stride=Math.ceil(cell);
 return entries.map(entry=>{
  const source=document.createElement('canvas');source.width=stride;source.height=stride;
  const ctx=source.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,entry.cell%4*cell,Math.floor(entry.cell/4)*cell,cell,cell,0,0,stride,stride);
  const pixels=ctx.getImageData(0,0,stride,stride).data;
  let left=stride,top=stride,right=0,bottom=0;
  for(let y=0;y<stride;y++)for(let x=0;x<stride;x++)if(pixels[(y*stride+x)*4+3]>24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const out=document.createElement('canvas');out.width=entry.naturalWidth;out.height=entry.naturalHeight;
  out.getContext('2d').drawImage(source,left,top,right-left+1,bottom-top+1,0,0,out.width,out.height);
  return {...entry,png:out.toDataURL('image/png').split(',')[1]};
 });
},entries);
for(const texture of textures)await writeFile(`assets/modular/outfits/training/${texture.body}/${texture.id}.png`,Buffer.from(texture.png,'base64'));
await browser.close();
