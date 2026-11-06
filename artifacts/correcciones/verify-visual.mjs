import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function seed(mode='village'){
 await page.goto('http://127.0.0.1:4173/');await page.waitForSelector('.save-selector,.village-map');
 await page.evaluate(async mode=>{
  const api=await import('/src/save.js?v=0.140.0');
  const {unlockVillageForTest}=await import('/tests/helpers/village-progress.mjs');
  const {LOCATION_CAST}=await import('/src/npcs.js?v=0.131.0');
  let save=api.createCharacter(api.createDefaultSave(),{name:'Akio',affinity:'fuego',bodyType:'male'});
  if(mode==='village'){unlockVillageForTest(save,{rank:2});save.progression.coins=350;}
  else {save=api.applyDebugCheckpoint(save,'doctor-ready');if(mode==='cipher'){save=api.startDoctorMission(save);for(let i=0;i<3;i++)save=api.chooseDoctorMissionRoute(save,'elevated');}}
  save.campaign.npcIntroductions=Object.entries(LOCATION_CAST).flatMap(([place,cast])=>cast.map(id=>`${place}:${id}`));
  save.campaign.tutorialSeen=true;api.writeSave(save);sessionStorage.setItem('cronicas-save-slot-selected','1');
 },mode);await page.reload();await page.waitForSelector('.village-map');
}
const shot=async name=>{await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>null))));await page.screenshot({path:`artifacts/correcciones/${name}.png`,animations:'disabled'});};
async function go(place){await page.locator(`[data-go="${place}"]`).click();await page.waitForSelector('[data-stage-options]:not([hidden])');}
try{
 await seed();await shot('aldea');await go('dojo');await page.locator('[data-dojo-tab="techniques"]').click();await shot('dojo');
 await page.locator('[data-dojo-tab="appearance"]').click();await shot('apariencia');
 await page.locator('[data-view="plaza"]').click();await go('shop');await shot('tienda');
 await page.locator('[data-shop-category-select]').selectOption('appearance');await shot('tienda-apariencia');
 await page.locator('[data-view="plaza"]').click();await go('inn');await page.locator('[data-guild-tab="clans"]').click();await shot('clanes');
 await page.locator('[data-view="plaza"]').click();await go('event');await shot('eventos');
 for(const mode of ['route','cipher']){
  await seed(mode);await page.locator('.debug-tools-trigger').click();await page.locator('[data-debug-view="headquarters"]').click();await page.locator('[data-saga="saga-1"]').click();await page.locator('[data-mission="s02"]').click();
  const target=mode==='route'?'.route-atlas':'.cipher-grid';
  for(let i=0;i<18;i++){
   if(await page.locator(target).isVisible())break;
   await page.waitForSelector(`.dialogue-overlay,${target}`,{state:'visible',timeout:15000});
   if(await page.locator('.dialogue-overlay .primary-button').isVisible())await page.locator('.dialogue-overlay .primary-button').click();
  }
  await page.waitForSelector(target);await shot(mode==='route'?'ruta':'cifrado');
  const layout=await page.locator('.doctor-route-screen').evaluate(field=>{
   const help=field.querySelector('.is-field-guidance:not([hidden])')?.getBoundingClientRect();const area=field.querySelector('.route-workspace,.cipher-workspace').getBoundingClientRect();
   return {help:help&&{top:help.top,bottom:help.bottom},area:{top:area.top,bottom:area.bottom},overlap:help?help.bottom>area.top+1:false};
  });if(layout.overlap)throw new Error(`Ayuda superpuesta en ${mode}: ${JSON.stringify(layout)}`);
 }
 await writeFile('artifacts/correcciones/visual-evidence.json',JSON.stringify({errors},null,2));console.log('Capturas completas; ayuda dentro del flujo; errores de página:',errors.length);
}catch(e){await page.screenshot({path:'artifacts/correcciones/visual-failure.png'});console.log((await page.locator('body').innerText()).slice(-2400));throw e;}finally{await context.close();await browser.close();}
