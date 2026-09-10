import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.WD_PLAYWRIGHT||'/opt/node22/lib/node_modules/playwright/index.mjs');
const root=process.cwd(),errors=[];
const server=createServer((req,res)=>{try{const file=path.join(root,new URL(req.url,'http://x').pathname);let body=fs.readFileSync(file);if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|4[0-3][^"/]*|online\/01-online)\.js[^>]*><\/script>/g,'');if(file.endsWith('37-duo-boss-rush.js'))body=body.toString().replace('  window.WDDuoBossRush=','  window.__rushQA={getRun:()=>run,grant,perkChoicesFor,newChoices,renderRewardTurn,ensurePaths,showPaths,persistRun,validStored};\n  window.WDDuoBossRush=');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/tmp/chromium',args:['--no-sandbox']});
const p=await browser.newPage({locale:'de-DE',viewport:{width:390,height:844},serviceWorkers:'block'});
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);});
const pause=()=>p.waitForTimeout(270);
async function openPair(ids){await p.evaluate(ids=>{duoProfile1Id=ids[0];duoProfile2Id=ids[1];openDuoCampaignScreen();duoProfile1Select.value=ids[0];duoProfile2Select.value=ids[1];renderDuoCampaign();duoAbility1Select.value='3';duoAbility2Select.value='3';window.WDDuoBossRush.refreshButton();},ids);await p.click('#duoBossRushStartBtn');await pause();}
const snap=()=>p.evaluate(()=>window.WDDuoBossRush.snapshot());
async function win(){await p.evaluate(()=>{players.filter(p=>p.campaignTeam==='enemy').forEach(p=>p.hp=0);window.WDDuoBossRush.finishEncounter(true);});await pause();}
try{
 await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
 const ids=await p.evaluate(()=>{const a=createProfile('Held mit sehr langem Namen'),b=createProfile('Partner für den Boss Rush');a.campaign.completedEncounters.push('black_table');b.campaign.completedEncounters.push('black_table');saveGameData();return[a.id,b.id];});
 await openPair(ids);assert.equal(await p.locator('[data-rush-path]').count(),3);
 const offers=(await snap()).paths[0];assert.deepEqual(offers.map(o=>o.difficulty),['easy','normal','hard']);
 await p.click('[data-rush-path="2"]');await pause();
 const checkpoint=await snap();
 assert.equal(checkpoint.phase,'combat');
 assert.deepEqual(await p.evaluate(()=>players.filter(p=>p.campaignTeam==='enemy').map(p=>p.hp)),offers[2].enemies.map(e=>e.hp));
 await p.evaluate(()=>{players.find(p=>p.campaignTeam==='hero').hp=1;});
 await p.reload();await openPair(ids);assert.equal(await p.locator('[data-rush-resume]').count(),2);
 await p.click('[data-rush-resume="yes"]');await pause();
 assert.deepEqual((await snap()).selectedPaths,checkpoint.selectedPaths);
 assert((await p.evaluate(()=>players.filter(p=>p.campaignTeam==='hero').map(p=>p.hp))).every(hp=>hp>1));
 await win();let r=await snap();assert.equal(r.phase,'reward');assert.equal(r.rewardTasks[0].choices.length,4);
 assert(await p.evaluate(()=>window.__rushQA.getRun().rewardTasks.every(t=>t.choices.some(id=>window.WDDuoBossRush.rewardDefinitions().some(r=>r.id===id&&r.rarity==='epic')))));
 const xp=await p.evaluate(()=>saveData.profiles.map(p=>p.campaign.bossRushXp));
 // Two-step replacement, then reload before choosing the occupied slot.
 await p.evaluate(()=>{const r=window.__rushQA.getRun();r.rewardTasks[0].choices=['realign','damage','rest'];window.__rushQA.persistRun();window.__rushQA.renderRewardTurn();});
 await p.click('[data-boss-rush-reward="realign"]');await pause();assert.equal(await p.locator('[data-rush-slot]').count(),1);
 await p.reload();await openPair(ids);await p.click('[data-rush-resume="yes"]');await pause();assert.equal(await p.locator('[data-rush-slot]').count(),1);
 await p.click('[data-rush-slot="primaryAbility"]');await pause();r=await snap();assert.notEqual(r.heroes[ids[0]].primaryAbility,3);const changed=r.heroes[ids[0]].primaryAbility;
 assert.deepEqual(await p.evaluate(()=>saveData.profiles.map(p=>p.campaign.bossRushXp)),xp);
 await p.reload();await openPair(ids);await p.click('[data-rush-resume="yes"]');await pause();assert.equal((await snap()).heroes[ids[0]].primaryAbility,changed);
 await p.locator('[data-boss-rush-reward]').first().click();await pause();assert.equal((await snap()).stage,1);assert.equal(await p.locator('[data-rush-path]').count(),3);
 await p.click('[data-rush-path="0"]');await pause();assert.equal(await p.evaluate(id=>players.find(p=>p.profileId===id).ability,ids[0]),changed);
 // A complete run using the real transition/reward UI; combat victories are test fixtures.
 for(let stage=1;stage<10;stage++){
   await win();
   if(stage===9)break;
   while((await snap()).phase==='reward'){
     const slot=p.locator('[data-rush-slot]');
     if(await slot.count())await slot.first().click();
     else await p.locator('[data-boss-rush-reward]').filter({hasNot:p.locator('[data-rush-slot]')}).first().click();
     await pause();
   }
   if(stage<8){assert.equal(await p.locator('[data-rush-path]').count(),3);await p.click('[data-rush-path="1"]');await pause();}
   else assert.equal((await snap()).selectedPaths[9].encounterId,'duo_bloodmoon_empress');
 }
 r=await snap();assert(r.finished);assert.equal(new Set(r.selectedPaths.map(o=>o.encounterId)).size,10);
 assert.equal(await p.evaluate(()=>Object.keys(saveData.bossRushRuns).length),0);
 // Another run: path rerolls, four perks + ability, reward reroll and defeat.
 await p.evaluate(()=>returnToDuoCampaignMap());await openPair(ids);
 await p.evaluate(()=>{const q=window.__rushQA,r=q.getRun();Object.assign(r.heroes[r.profileIds[0]].perks,{cartographer:1,scout:1,supply:1,reroll:1});q.persistRun();q.showPaths();});
 const prior=(await snap()).paths[0][0].encounterId;
 await p.click('[data-rush-redraw="0"]');await pause();assert.notEqual((await snap()).paths[0][0].encounterId,prior);
 await p.screenshot({path:'/tmp/boss-rush-paths.png'});
 await p.click('[data-rush-path="2"]');await pause();await win();assert.equal((await snap()).rewardTasks[0].choices.length,5);
 await p.click('#duoBossRushRerollBtn');await pause();assert.equal((await snap()).heroes[ids[0]].rerollsUsed,1);assert.equal((await snap()).rewardTasks[0].choices.length,5);
 // Persist a reward screen, reopen in both languages at all required widths.
 for(const language of ['de','en']){
   await p.evaluate(language=>localStorage.setItem('diceduel_language',language),language);await p.reload();await openPair(ids);await p.click('[data-rush-resume="yes"]');await pause();
   for(const width of [320,360,390,412,1280]){
     await p.setViewportSize({width,height:900});await p.locator('[data-boss-rush-reward]').last().scrollIntoViewIfNeeded();
     assert(await p.evaluate(()=>[...document.querySelectorAll('#duoBossRushRewardOptions .boss-rush-reward-card')].every(e=>e.scrollWidth<=e.clientWidth+1)),`keine Textüberläufe bei ${width}/${language}`);
   }
 }
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/boss-rush-rewards.png'});
 while((await snap()).phase==='reward'){
   const slot=p.locator('[data-rush-slot]');if(await slot.count())await slot.first().click();else await p.locator('[data-boss-rush-reward]').first().click();await pause();
 }
 await p.click('[data-rush-path="0"]');await pause();
 await p.evaluate(()=>{players.filter(p=>p.campaignTeam==='hero').forEach(p=>p.hp=0);window.WDDuoBossRush.finishEncounter(false);});
 assert.equal(await p.evaluate(()=>Object.keys(saveData.bossRushRuns).length),0);
 await p.evaluate(()=>returnToDuoCampaignMap());await openPair(ids);
 await p.reload();await openPair(ids);await p.click('[data-rush-resume="no"]');await pause();
 assert.equal((await snap()).stage,0);assert.equal((await snap()).rewardHistory.length,0);
 await p.evaluate(()=>returnToDuoCampaignMap());
 const third=await p.evaluate(()=>{const c=createProfile('Anderes Duo-Profil');c.campaign.completedEncounters.push('black_table');saveGameData();return c.id;});
 await openPair([ids[0],third]);assert.equal(await p.locator('[data-rush-resume]').count(),0);
 assert.equal(await p.evaluate(()=>Object.keys(saveData.bossRushRuns).length),2);
 await p.waitForTimeout(800);
 const mutations=await p.evaluate(()=>new Promise(resolve=>{let n=0;const observer=new MutationObserver(records=>n+=records.length);observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});setTimeout(()=>{observer.disconnect();resolve(n);},1000);}));
 assert.equal(mutations,0,'keine DOM-Mutationen im Leerlauf');
 console.log('ok: Neu starten, getrennte Profilpaare und 0 DOM-Mutationen/s im Pfaddialog');
 console.log('ok: Kartograph, Kundschafter, Vorratspaket, Neuwurf, DE/EN bei fünf Breiten und Speicher nach Niederlage leer');
 assert.deepEqual(errors,[]);
 console.log('ok: drei Pfade, Gegner-HP, Kampf-Reload, zwei Schritte und Reward-Reload, XP einmalig, zehn Stufen, fester Endboss, Speicher nach Sieg leer');
}catch(e){console.log('Browserfehler',errors);console.log('Status',await snap());throw e;}finally{await browser.close();server.close();}
