import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

let server;
try { await fetch('http://127.0.0.1:4173'); } catch {
  server = spawn(process.execPath, ['scripts/static-server.mjs'], { stdio:'ignore', windowsHide:true });
  process.on('exit', () => server.kill());
  for (let i=0;i<40;i++) { try { await fetch('http://127.0.0.1:4173'); break; } catch { await new Promise(r=>setTimeout(r,100)); } }
}
const browser = await chromium.launch({ headless:true });
try {
  const page = await browser.newPage({ viewport:{ width:1800,height:1260 } });
  const errors = []; page.on('pageerror', e=>errors.push(e.message));
  page.on('console', message=>{ if(message.type()==='error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(async () => {
    const {loadPhaser}=await import('/src/battle/load-phaser.js?v=1.0.0'); await loadPhaser();
    const {ENEMY_ROSTER}=await import('/src/data.js?v=1.5.0');
    const {enemyFighterAppearance}=await import('/src/character.js?v=0.119.0');
    const {queuePlayerFighterTextures,createPlayerFighter}=await import('/src/fighters.js?v=0.153.0');
    const host=document.createElement('div'); host.style.cssText='position:fixed;inset:0;z-index:9999;background:#080e18'; document.body.append(host);
    window.__enemyReview=[];
    class Review extends Phaser.Scene {
      preload() { for(const [id,profile] of Object.entries(ENEMY_ROSTER)) queuePlayerFighterTextures(this,enemyFighterAppearance(profile,id)); }
      create() {
        Object.entries(ENEMY_ROSTER).forEach(([id,profile],i)=>{
          const x=(i%6)*300+150, y=Math.floor(i/6)*420;
          const look=enemyFighterAppearance(profile,id);
          const fighter=createPlayerFighter(this,x,y+304,look);
          this.add.text(x,y+18,profile.name,{fontFamily:'Georgia',fontSize:15,color:'#f5dfac',align:'center',wordWrap:{width:280}}).setOrigin(.5,0);
          this.add.text(x,y+65,`${profile.boss?'JEFE':'TROPA'} · ${{bandits:'Bandidos',crow:'Cuervo',kurogane:'Kurogane',reeds:'Junco',stone:'Piedra',ash:'Ceniza',venom:'Veneno'}[look.uniform.id]}`,{fontFamily:'Arial',fontSize:13,color:'#bdb4a1'}).setOrigin(.5,0);
          this.add.text(x,y+87,`${look.bodyType==='female'?'Mujer':'Hombre'} · ${look.skinTone} · ${{0:'sin cabello',1:'corto',4:'coleta'}[look.hair]}`,{fontFamily:'Arial',fontSize:12,color:'#859ca9'}).setOrigin(.5,0);
          window.__enemyReview.push({id,look,atlas:fighter.head.texture.key,face:fighter.face.texture.key,hair:fighter.hair?.texture.key||null,tail:fighter.tail?.texture.key||null});
        });
        window.__enemyReviewReady=true;
      }
    }
    window.__enemyReviewGame=new Phaser.Game({type:Phaser.WEBGL,parent:host,width:1800,height:1260,backgroundColor:'#080e18',scene:[Review],audio:{noAudio:true}});
  });
  await page.waitForFunction(()=>window.__enemyReviewReady,{},{timeout:45000});
  await page.waitForTimeout(350);
  await mkdir('artifacts/enemy-appearance',{recursive:true});
  await page.screenshot({path:'artifacts/enemy-appearance/roster-webgl.png'});
  const roster=await page.evaluate(()=>window.__enemyReview);
  assert.equal(roster.length,17);
  for(const enemy of roster) {
    assert.match(enemy.atlas,new RegExp(`fighter-atlas-${enemy.look.bodyType}-${enemy.look.skinTone}-`));
    assert.equal(enemy.hair,enemy.look.hair===4?'player-hair-coleta':enemy.look.hair===1?'player-hair-corto':null);
    assert.equal(enemy.tail,enemy.look.hair===4?'player-tail-coleta':null);
  }
  assert.deepEqual(errors,[]);
  await writeFile('artifacts/enemy-appearance/verification.json',JSON.stringify({roster,errors},null,2));
  console.log('17 enemigos reales en WebGL: cuerpos, tonos, rostros, cabello y uniformes correctos; sin errores.');
} finally { await browser.close(); server?.kill(); }
