import { test, expect } from '@playwright/test';
import { bootPerformanceReference } from './helpers/performance-harness.mjs';

async function openDojo(page) {
  await page.goto('/');
  await page.evaluate(async()=>{
    const {createCharacter,createDefaultSave,writeSave}=await import('/src/save.js?v=0.140.0');
    const {unlockVillageForTest}=await import('/tests/helpers/village-progress.mjs');
    const save=unlockVillageForTest(createCharacter(createDefaultSave(),{name:'Correcciones',affinity:'fuego',bodyType:'female'}),{rank:2});
    save.campaign.tutorialSeen=true; save.campaign.npcIntroductions=["dojo:mei","dojo:daichi"];
    writeSave(save); sessionStorage.setItem('cronicas-save-slot-selected','1');
  });
  await page.reload();
  await page.locator('[data-go="dojo"]').click();
  await expect(page.locator('.dojo-tabs')).toBeVisible();
}

test('equipo y maestro mantienen Tab y Escape dentro del diálogo',async({page})=>{
  await openDojo(page);
  await page.locator('[data-dojo-tab="equipment"]').click();
  for(const [trigger,dialog] of [['[data-gear-slot="weapon"]','.equipment-modal:not(.master-modal)'],['[data-open-master]','.master-modal']]){
    await page.locator(trigger).click();
    await expect(page.locator(dialog)).toBeVisible();
    for(let i=0;i<9;i++){
      await page.keyboard.press('Tab');
      expect(await page.locator(dialog).evaluate(el=>el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.locator(dialog)).toBeHidden();
    await expect(page.locator(trigger)).toBeFocused();
  }
});

test('Técnicas permite consultar el árbol completo y leer la ficha a ambos tamaños',async({page},testInfo)=>{
  await openDojo(page);
  await page.locator('[data-dojo-tab="techniques"]').click();
  const initial=await page.locator('[data-skill-select]').count();
  expect(initial).toBeLessThan(38);
  await page.locator('[data-tree-future]').check();
  await expect(page.locator('[data-skill-select]')).toHaveCount(38);
  await page.locator('[data-skill-select="fire_embers"]').click();
  await page.locator('[data-skill-select="fire_breath"]').hover();
  await expect(page.locator(".technique-detail h3")).toHaveText("Ascuas veloces");
  await page.mouse.move(10,10);
  for(const width of [1280,1440]){
    await page.setViewportSize({width,height:width===1280?720:900});
    await expect(page.locator('[data-technique-toggle="fire_embers"]')).toBeVisible();
    expect(await page.locator('.technique-description').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    const metrics=await page.locator('.technique-detail').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.width+1);
    await page.screenshot({path:testInfo.outputPath(`tecnicas-${width}.png`)});
  }
  await page.locator('.technique-loadout-disclosure summary').click();
  await expect(page.locator('[data-loadout-inspect="fire_embers"]')).toBeVisible();
});

test('fallo de guardado conserva progreso, permite copia y se recupera al reintentar',async({page})=>{
  await openDojo(page);
  await page.evaluate(async()=>{
    const api=await import('/src/save.js?v=0.140.0');
    window.__restoreStorage=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key.startsWith('cronicas-del-sello-save'))throw new DOMException('Storage blocked','QuotaExceededError');return window.__restoreStorage.call(this,key,value);};
    const save=api.loadSave();api.writeSave({...save,character:{...save.character,name:'Copia pendiente'}});
  });
  await expect(page.locator('.save-recovery')).toBeVisible();
  expect(await page.evaluate(async()=>(await import('/src/save.js?v=0.140.0')).loadSave().character.name)).toBe('Copia pendiente');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('[data-save-export]').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('cronicas-partida-1.json');
  await page.locator('[data-save-retry]').click();
  await expect(page.locator('.save-recovery')).toContainText('sigue sin permitir');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__restoreStorage;});
  await page.locator('[data-save-retry]').click();
  await expect(page.locator('.save-recovery')).toBeHidden();
  await expect(page.locator('[data-dojo-tab="techniques"]')).toBeFocused();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('cronicas-del-sello-save-slot-1')).character.name)).toBe('Copia pendiente');
});

test('ropa base y piel son capas distintas y el escritorio estrecho no muestra el aviso móvil',async({page},testInfo)=>{
  await page.goto('/');
  await page.locator('[data-select-slot="1"]').click();
  for(const body of ['male','female']){
    await page.locator('[name="bodyType"]').selectOption(body);
    await page.locator('[name="skinTone"]').fill('6');
    await expect(page.locator('.puppet-preview-cloth')).toHaveCount(7);
    expect(await page.locator('.puppet-preview-cloth').evaluateAll(els=>els.every(el=>getComputedStyle(el).filter==='none'&&el.src.includes('/outfits/training/')))).toBe(true);
    await page.locator('.creator-preview img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
    expect(await page.locator('.puppet-preview-cloth').evaluateAll(imgs=>imgs.every(img=>{
      const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let visible=0;for(let i=3;i<data.length;i+=4)if(data[i]>32)visible++;
      return visible/(canvas.width*canvas.height)>.35;
    }))).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`atuendo-${body}.png`)});
  }
  await page.setViewportSize({width:720,height:450});
  await expect(page.locator('.mobile-gate')).toBeHidden();
});

test('entrada táctil explica el modo compacto y permite continuar',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('.mobile-gate')).toBeVisible();
  await page.getByRole('button',{name:'PROBAR CONTROLES COMPACTOS'}).click();
  await expect(page.locator('.save-selector')).toBeVisible();
  await context.close();
});

test('el aviso de guardado conserva los controles de combate dentro del área visible',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await bootPerformanceReference(page);
  await page.evaluate(async()=>{
    window.__restoreStorage=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key.startsWith('cronicas-del-sello-save'))throw new DOMException('Blocked','QuotaExceededError');return window.__restoreStorage.call(this,key,value);};
    (await import('/src/save.js?v=0.140.0')).writeSave(window.__performanceReference.scene.saveData);
  });
  await expect(page.locator('.save-recovery')).toBeVisible();
  const controls=await page.locator('.combat-access-pause, .combat-access-actions').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,right:r.right};}));
  expect(controls.every(r=>r.top>=0&&r.bottom<=721&&r.right<=1281)).toBe(true);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__restoreStorage;});
  await page.locator('[data-save-retry]').click();
  await expect(page.locator('.save-recovery')).toBeHidden();
});
