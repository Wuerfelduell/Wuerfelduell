import {checkRushMasteryBrowser} from './rush-mastery-browser-contract.mjs';
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.WD_PLAYWRIGHT||'/opt/node22/lib/node_modules/playwright/index.mjs');
const root=process.cwd(),errors=[];
const server=createServer((req,res)=>{try{const file=path.join(root,new URL(req.url,'http://x').pathname);let body=fs.readFileSync(file);if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|4[0-3][^"/]*|online\/01-online)\.js[^>]*><\/script>/g,'');if(file.endsWith('44-trio-boss-rush.js'))body=body.toString().replace('  window.WDTrioBossRush=','  window.__trioQA={getRun:()=>run,grant,perkChoicesFor,newChoices,renderRewardTurn,ensurePaths,showPaths,persistRun,validStored};\n  window.WDTrioBossRush=');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/tmp/chromium',args:['--no-sandbox']});
const p=await browser.newPage({locale:'de-DE',viewport:{width:390,height:844},serviceWorkers:'block'});
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);});
const pause=()=>p.waitForTimeout(270);
async function openTeam(ids){await p.evaluate(ids=>{trioProfile1Id=ids[0];trioProfile2Id=ids[1];trioProfile3Id=ids[2];openTrioCampaignScreen();trioProfile1Select.value=ids[0];trioProfile2Select.value=ids[1];trioProfile3Select.value=ids[2];renderTrioCampaign();trioAbility1Select.value='3';trioAbility2Select.value='3';trioAbility3Select.value='3';window.WDTrioBossRush.refreshButton();},ids);await p.click('#trioBossRushStartBtn');await pause();}
const snap=()=>p.evaluate(()=>window.WDTrioBossRush.snapshot());
async function win(){await p.evaluate(()=>{players.filter(p=>p.campaignTeam==='enemy').forEach(p=>p.hp=0);finishTrioCampaignEncounter(true);});await pause();}
try{
 await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
 const ids=await p.evaluate(()=>{const a=createProfile('Held mit sehr langem Namen'),b=createProfile('Partner für den Boss Rush'),c=createProfile('Dritter Held mit langem Namen');a.campaign.completedEncounters.push('black_table');b.campaign.completedEncounters.push('black_table');saveGameData();return[a.id,b.id,c.id];});
 await p.evaluate(()=>{openTrioCampaignScreen();trioProfile3Select.value=trioProfile1Select.value;window.WDTrioBossRush.refreshButton();});
 assert(await p.locator('#trioBossRushStartBtn').isDisabled());
 await openTeam(ids);assert.equal(await p.locator('[data-rush-path]').count(),3);
 const offers=(await snap()).paths[0];assert.deepEqual(offers.map(o=>o.difficulty),['easy','normal','hard']);
 await p.click('[data-rush-path="2"]');await pause();
 const checkpoint=await snap();
 assert.equal(checkpoint.phase,'combat');assert.equal(checkpoint.profileIds.length,3);assert(await p.evaluate(()=>window.WDBossRush===window.WDTrioBossRush));
 assert.deepEqual(await p.evaluate(()=>players.filter(p=>p.campaignTeam==='enemy').map(p=>p.hp)),offers[2].enemies.map(e=>e.hp));
 await p.evaluate(()=>{players.find(p=>p.campaignTeam==='hero').hp=1;});
 await p.reload();await openTeam(ids);assert.equal(await p.locator('[data-rush-resume]').count(),2);
 await p.click('[data-rush-resume="yes"]');await pause();
 assert.deepEqual((await snap()).selectedPaths,checkpoint.selectedPaths);
 assert((await p.evaluate(()=>players.filter(p=>p.campaignTeam==='hero').map(p=>p.hp))).every(hp=>hp>1));
 await win();let r=await snap();assert.equal(r.phase,'reward');assert.equal(r.rewardTasks[0].choices.length,4);
 assert(await p.evaluate(()=>window.__trioQA.getRun().rewardTasks.every(t=>t.choices.some(id=>window.WDTrioBossRush.rewardDefinitions().some(r=>r.id===id&&r.rarity==='epic')))));
 const xp=await p.evaluate(()=>saveData.profiles.map(p=>p.campaign.bossRushXp));
 // Two-step replacement, then reload before choosing the occupied slot.
 await p.evaluate(()=>{const r=window.__trioQA.getRun();r.rewardTasks[0].choices=['realign','damage','rest'];window.__trioQA.persistRun();window.__trioQA.renderRewardTurn();});
 await p.click('[data-boss-rush-reward="realign"]');await pause();assert.equal(await p.locator('[data-rush-slot]').count(),1);
 await p.reload();await openTeam(ids);await p.click('[data-rush-resume="yes"]');await pause();assert.equal(await p.locator('[data-rush-slot]').count(),1);
 await p.click('[data-rush-slot="primaryAbility"]');await pause();r=await snap();assert.notEqual(r.heroes[ids[0]].primaryAbility,3);const changed=r.heroes[ids[0]].primaryAbility;
 assert.deepEqual(await p.evaluate(()=>saveData.profiles.map(p=>p.campaign.bossRushXp)),xp);
 await p.reload();await openTeam(ids);await p.click('[data-rush-resume="yes"]');await pause();assert.equal((await snap()).heroes[ids[0]].primaryAbility,changed);
 while((await snap()).phase==='reward'){
   const slots=p.locator('[data-rush-slot]');
   if(await slots.count())await slots.first().click();else await p.locator('[data-boss-rush-reward]').first().click();
   await pause();
 }
 assert.equal((await snap()).stage,1);assert.equal(await p.locator('[data-rush-path]').count(),3);
 await p.click('[data-rush-path="0"]');await pause();assert.equal(await p.evaluate(id=>players.find(p=>p.profileId===id).ability,ids[0]),changed);
 // A complete run using the real transition/reward UI; combat victories are test fixtures.
 for(let stage=1;stage<15;stage++){
   if([9,14].includes(stage)){
     const checkpoint=await snap();
     await p.reload();await openTeam(ids);await p.click('[data-rush-resume="yes"]');await pause();
     assert.deepEqual((await snap()).selectedPaths,checkpoint.selectedPaths,'späte Pfade nach Reload identisch');
     assert.equal((await snap()).stageCount,15);
     assert.deepEqual(await p.evaluate(()=>players.filter(p=>p.campaignTeam==='enemy').map(p=>p.hp)),checkpoint.selectedPaths[stage].enemies.map(e=>e.hp));
   }
   await win();
   if(stage===14)break;
   while((await snap()).phase==='reward'){
     const slot=p.locator('[data-rush-slot]');
     if(await slot.count())await slot.first().click();
     else await p.locator('[data-boss-rush-reward]').filter({hasNot:p.locator('[data-rush-slot]')}).first().click();
     await pause();
   }
   if(stage===8){
     for(const language of ['de','en']){
       await p.evaluate(language=>localStorage.setItem('diceduel_language',language),language);
       await p.reload();await openTeam(ids);await p.click('[data-rush-resume="yes"]');await pause();
       assert((await p.locator('#trioBossRushRewardText').innerText()).includes(language==='de'?'Ultraschwer':'Ultra hard'));
       for(const width of [320,360,390,412,1280]){
         await p.setViewportSize({width,height:900});await p.locator('[data-rush-path]').last().scrollIntoViewIfNeeded();
         assert(await p.locator('[data-rush-path]').evaluateAll(nodes=>nodes.every(e=>e.scrollWidth<=e.clientWidth+1)));
       }
     }
     await p.setViewportSize({width:390,height:844});await p.locator('[data-rush-path]').first().scrollIntoViewIfNeeded();
     await p.screenshot({path:'/tmp/trio-ultra-paths.png'});
   }
   if(stage<13){assert.equal(await p.locator('[data-rush-path]').count(),3);await p.click('[data-rush-path="1"]');await pause();}
   else {assert.equal((await snap()).selectedPaths[14].encounterId,'trio_helix_apex');assert.equal(await p.evaluate(()=>players.filter(p=>p.campaignTeam==='enemy').length),4);await p.screenshot({path:'/tmp/trio-rush-final-battle.png'});}
 }
 r=await snap();assert(r.finished);assert.equal(new Set(r.selectedPaths.map(o=>o.encounterId)).size,15);
 assert.equal(await p.evaluate(()=>Object.keys(saveData.trioBossRushRuns).length),0);assert.equal(await p.locator('#roundStandings .round-score-row').count(),3);
 // Another run: path rerolls, four perks + ability, reward reroll and defeat.
 await p.evaluate(()=>returnToTrioCampaignMap());await openTeam(ids);
 await p.evaluate(()=>{const q=window.__trioQA,r=q.getRun();Object.assign(r.heroes[r.profileIds[0]].perks,{cartographer:1,scout:1,supply:1,reroll:1,sharing:1});r.profileIds.forEach((id,i)=>{r.heroes[id].hp=[50,20,10][i];r.heroes[id].maxHp=50;});q.persistRun();q.showPaths();});
 const prior=(await snap()).paths[0][0].encounterId;
 await p.click('[data-rush-redraw="0"]');await pause();assert.notEqual((await snap()).paths[0][0].encounterId,prior);
 await p.screenshot({path:'/tmp/trio-boss-rush-paths.png'});
 await p.click('[data-rush-path="2"]');await pause();assert.deepEqual(await p.evaluate(()=>{const r=Object.values(saveData.trioBossRushRuns)[0];return r.profileIds.map(id=>r.heroes[id].hp);}),[44,23,13]);await win();assert.equal((await snap()).rewardTasks[0].choices.length,5);
 await p.click('#trioBossRushRerollBtn');await pause();assert.equal((await snap()).heroes[ids[0]].rerollsUsed,1);assert.equal((await snap()).rewardTasks[0].choices.length,5);
 // Persist a reward screen, reopen in both languages at all required widths.
 for(const language of ['de','en']){
   await p.evaluate(language=>localStorage.setItem('diceduel_language',language),language);await p.reload();await openTeam(ids);await p.click('[data-rush-resume="yes"]');await pause();
   for(const width of [320,360,390,412,1280]){
     await p.setViewportSize({width,height:900});await p.locator('[data-boss-rush-reward]').last().scrollIntoViewIfNeeded();
     assert(await p.evaluate(()=>[...document.querySelectorAll('#trioBossRushRewardOptions .boss-rush-reward-card')].every(e=>e.scrollWidth<=e.clientWidth+1)),`keine Textüberläufe bei ${width}/${language}`);
   }
 }
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/trio-boss-rush-rewards.png'});
 while((await snap()).phase==='reward'){
   const slot=p.locator('[data-rush-slot]');if(await slot.count())await slot.first().click();else await p.locator('[data-boss-rush-reward]').first().click();await pause();
 }
 await p.click('[data-rush-path="0"]');await pause();
 await p.evaluate(()=>{players.filter(p=>p.campaignTeam==='hero').forEach(p=>p.hp=0);finishTrioCampaignEncounter(false);});
 assert.equal(await p.evaluate(()=>Object.keys(saveData.trioBossRushRuns).length),0);
 await p.evaluate(()=>returnToTrioCampaignMap());await openTeam(ids);
 await p.reload();await openTeam(ids);await p.click('[data-rush-resume="no"]');await pause();
 assert.equal((await snap()).stage,0);assert.equal((await snap()).rewardHistory.length,0);
 await p.evaluate(()=>returnToTrioCampaignMap());
 const third=await p.evaluate(()=>{const c=createProfile('Anderes Trio-Profil');c.campaign.completedEncounters.push('black_table');saveGameData();return c.id;});
 await openTeam([ids[0],ids[1],third]);assert.equal(await p.locator('[data-rush-resume]').count(),0);
 assert.equal(await p.evaluate(()=>Object.keys(saveData.trioBossRushRuns).length),2);
 await p.waitForTimeout(800);
 const mutations=await p.evaluate(()=>new Promise(resolve=>{let n=0;const observer=new MutationObserver(records=>n+=records.length);observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});setTimeout(()=>{observer.disconnect();resolve(n);},1000);}));
 assert.equal(mutations,0,'keine DOM-Mutationen im Leerlauf');
 console.log('ok: Neu starten, getrennte Profiltrios und 0 DOM-Mutationen/s im Pfaddialog');
 console.log('ok: Kartograph, Kundschafter, Vorratspaket, Neuwurf, DE/EN bei fünf Breiten und Speicher nach Niederlage leer');
 // Dieselben Profile behalten getrennte Runs, aber einen gemeinsamen Lebenszeit-XP-Zähler.
 const xpBeforeDuo=await p.evaluate(id=>getProfile(id).campaign.bossRushXp,ids[0]);
 await p.evaluate(ids=>{returnToTrioCampaignMap();duoProfile1Id=ids[0];duoProfile2Id=ids[1];openDuoCampaignScreen();duoProfile1Select.value=ids[0];duoProfile2Select.value=ids[1];renderDuoCampaign();duoAbility1Select.value='3';duoAbility2Select.value='3';window.WDBossRush.refreshButton();},ids);
 assert(await p.evaluate(()=>window.WDBossRush===window.WDDuoBossRush));
 await p.click('#duoBossRushStartBtn');await pause();await p.locator('#duoBossRushRewardModal [data-rush-path="0"]').click();await pause();
 await p.evaluate(()=>{players.filter(p=>p.campaignTeam==='enemy').forEach(p=>p.hp=0);finishDuoCampaignEncounter(true);});await pause();
 assert.equal(await p.evaluate(id=>getProfile(id).campaign.bossRushXp,ids[0]),xpBeforeDuo+50);
 assert.equal(await p.evaluate(()=>Object.keys(saveData.trioBossRushRuns).length),2);assert.equal(await p.evaluate(()=>Object.keys(saveData.bossRushRuns).length),1);
 await p.evaluate(()=>returnToDuoCampaignMap());await p.reload();
 assert.equal(await p.evaluate(()=>Object.keys(saveData.trioBossRushRuns).length),2);assert.equal(await p.evaluate(()=>Object.keys(saveData.bossRushRuns).length),1);
 // Der normale Trio-Kampf bleibt ohne Rush-Loadout und Rush-Abschluss.
 await p.evaluate(ids=>{openTrioCampaignScreen();trioProfile1Select.value=ids[0];trioProfile2Select.value=ids[1];trioProfile3Select.value=ids[2];trioCampaignEncounterId='trio_triple_entry';renderTrioCampaign();},ids);
 await p.click('#trioCampaignStartBtn');await pause();
 assert(await p.evaluate(()=>trioCampaignMode&&!window.WDBossRush.isActive()&&!game.classList.contains('boss-rush-game')));
 assert.equal(await p.evaluate(()=>players.filter(p=>p.campaignTeam==='hero').length),3);
 await p.evaluate(()=>{players.filter(p=>p.campaignTeam==='enemy').forEach(p=>p.hp=0);finishTrioCampaignEncounter(true);});
 assert(await p.evaluate(()=>winnerText.textContent.includes('Challenge')));
 await p.evaluate(()=>{returnToTrioCampaignMap();openMainMenu(true);});assert(await p.evaluate(()=>window.WDBossRush===null));
 console.log('ok: Motorabschluss, Proviantteilung an beide Mitspieler, Trio/Duo-Verteiler, gemeinsamer XP-Zähler, getrennte Saves nach Reload und normaler Trio-Kampf');
 // Ein echter Zehner-Spielstand aus 28.12.3 bleibt fortsetzbar und endet weiterhin bei 10.
 const legacy=JSON.parse(fs.readFileSync('scripts/qa/fixtures/trio-rush-v28.12.3.json','utf8'));
 await p.evaluate(({legacy,ids})=>{
   returnToTrioCampaignMap();
   const oldIds=legacy.profileIds;
   legacy.heroes=Object.fromEntries(ids.map((id,i)=>[id,legacy.heroes[oldIds[i]]]));
   legacy.abilityLevelOverrides=Object.fromEntries(ids.map((id,i)=>[id,legacy.abilityLevelOverrides?.[oldIds[i]]||{}]));
   legacy.profileIds=ids;saveData.trioBossRushRuns[JSON.stringify([...ids].sort())]=legacy;saveGameData();
 },{legacy,ids});
 await p.reload();await openTeam(ids);await p.click('[data-rush-resume="yes"]');await pause();
 assert.equal((await snap()).stageCount,10);assert.equal((await snap()).stage,9);
 assert.equal((await snap()).heroes[ids[0]].perks.refinement,1);
 assert.equal((await snap()).abilityLevelOverrides[ids[0]][3],1);
 await win();assert((await snap()).finished);assert.equal((await snap()).cleared,10);
 console.log('ok: gespeicherter Zehner-Run bleibt unverändert spielbar; Stufe 10/15 neuer Runs übersteht Reload');
 await checkRushMasteryBrowser({p,ids,mode:'trio',open:openTeam,win,pause,snap});
 assert.deepEqual(errors,[]);
 console.log('ok: drei Pfade, Gegner-HP, Kampf-Reload, zwei Schritte und Reward-Reload, XP einmalig, 15 Stufen, fester Endboss, Speicher nach Sieg leer');
}catch(e){console.log('Browserfehler',errors);console.log('Trio-Status',await snap());throw e;}finally{await browser.close();server.close();}
