/* Ein Klick tauscht genau 300 Boss-XP gegen 100 XP im gewählten Mastery-Konto. */
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.WD_PLAYWRIGHT||'/opt/node22/lib/node_modules/playwright/index.mjs');
const root=process.cwd(),errors=[];
const server=createServer((req,res)=>{try{const file=path.join(root,new URL(req.url,'http://x').pathname);let body=fs.readFileSync(file);if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|4[0-3][^"/]*|online\/01-online)\.js[^>]*><\/script>/g,'');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/tmp/chromium',args:['--no-sandbox']});
const p=await browser.newPage({locale:'de-DE',viewport:{width:390,height:844},serviceWorkers:'block'});
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);});
const button=p.locator('#masteryBossXpConvertBtn');
async function open(ids,mode){await p.evaluate(({ids,mode})=>{
 campaignProfileId=ids[0];campaignProfileSelect.value=ids[0];
 duoProfile1Id=ids[0];duoProfile2Id=ids[1];duoProfile1Select.value=ids[0];duoProfile2Select.value=ids[1];
 trioProfile1Id=ids[0];trioProfile2Id=ids[1];trioProfile3Id=ids[2];
 openTrioCampaignScreen();trioProfile1Select.value=ids[0];trioProfile2Select.value=ids[1];trioProfile3Select.value=ids[2];
 window.WDMastery.open(mode);
 },{ids,mode});await p.waitForTimeout(100);}
const accounts=ids=>p.evaluate(ids=>ids.map(id=>{const p=getProfile(id);return {boss:p.campaign.bossRushXp,modes:p.campaign.masteryModes};}),ids);
try{
 await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
 const ids=await p.evaluate(()=>{
   const ps=['Held mit langem Profilnamen','Partner','Dritter Held'].map(createProfile);
   for(const p of ps){p.campaign.completedEncounters=CAMPAIGN_ENCOUNTERS.map(e=>e.id);window.WDMastery.ensureModes(p);window.WDMastery.ensureModes(p);for(const mode of ['solo','duo','trio']){const m=window.WDMastery.ensure(p,mode);m.xp=50;m.lifetimeXp=50;m.abilityL2Progress={4:7};Object.assign(m,{retroBackfillDone:true,retroBackfillV2Done:true,retroBackfillV3Done:true,retroBackfillV4Done:true});}p.campaign.bossRushXp=0;}
   duoCampaignProgress(ps[0],ps[1]).completedEncounters=DUO_CAMPAIGN_ENCOUNTERS.map(e=>e.id);
   saveGameData();return ps.map(p=>p.id);
 });
 for(const mode of ['solo','duo','trio']){
   for(const balance of [0,299,300,602]){
     await p.evaluate(({id,balance})=>{getProfile(id).campaign.bossRushXp=balance;saveGameData();},{id:ids[0],balance});
     await open(ids,mode);assert.equal(await button.count(),1,'Umtauschbutton vorhanden');
     const before=await accounts(ids);
     if(balance<300){assert(await button.isDisabled());await button.evaluate(b=>b.dispatchEvent(new MouseEvent('click',{bubbles:true})));assert.deepEqual(await accounts(ids),before);continue;}
     assert(await button.isEnabled());
     await button.evaluate(b=>{b.click();b.click();});
     const expected=structuredClone(before);expected[0].boss-=300;expected[0].modes[mode].xp+=100;expected[0].modes[mode].lifetimeXp+=100;
     assert.deepEqual(await accounts(ids),expected,'genau eine Buchung, korrektes Profil und Moduskonto, L2 unverändert');
     if(balance===602){await button.click();expected[0].boss-=300;expected[0].modes[mode].xp+=100;expected[0].modes[mode].lifetimeXp+=100;assert.deepEqual(await accounts(ids),expected);}
     assert(await button.isDisabled());
     await p.reload();await open(ids,mode);assert.deepEqual(await accounts(ids),expected,'Buchung nach Reload erhalten');
   }
 }
 await p.evaluate(id=>{getProfile(id).campaign.bossRushXp=600;saveGameData();},ids[1]);await open(ids,'trio');
 await p.selectOption('#masteryProfilePicker',ids[1]);assert(await button.isEnabled());const before=await accounts(ids);await button.click();
 const expected=structuredClone(before);expected[1].boss-=300;expected[1].modes.trio.xp+=100;expected[1].modes.trio.lifetimeXp+=100;assert.deepEqual(await accounts(ids),expected,'Profilwechsel');
 for(const language of ['de','en']){
   await p.evaluate(language=>localStorage.setItem('diceduel_language',language),language);await p.reload();await open(ids,'trio');await p.selectOption('#masteryProfilePicker',ids[1]);
   assert((await button.innerText()).includes(language==='de'?'Konvertieren':'Convert'));
   for(const width of [320,360,390,412,1280]){await p.setViewportSize({width,height:900});await button.scrollIntoViewIfNeeded();assert(await button.evaluate(b=>b.scrollWidth<=b.clientWidth+1),'vollständige Beschriftung');}
 }
 await p.setViewportSize({width:390,height:844});await button.scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/mastery-boss-xp-conversion.png'});
 await p.waitForTimeout(700);const mutations=await p.evaluate(()=>new Promise(resolve=>{let n=0;const o=new MutationObserver(r=>n+=r.length);o.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});setTimeout(()=>{o.disconnect();resolve(n);},1000);}));assert.equal(mutations,0);
 assert.deepEqual(errors,[]);console.log('ok: 300→100, 0/299 gesperrt, 602→2 in zwei Klicks, Doppelklickschutz, Solo/Duo/Trio getrennt, Profilwechsel, L2 unverändert, Reload, DE/EN fünf Breiten, 0 DOM-Mutationen, keine JS-Fehler/404');
}finally{await browser.close();server.close();}
