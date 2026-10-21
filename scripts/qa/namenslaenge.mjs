// Namenslänge: rendert Profilnamen verschiedener Länge in allen Stellen, an denen
// Namen erscheinen, und meldet, ab welcher Länge sie abgeschnitten werden oder überlaufen.
// Aufruf: node scripts/qa/namenslaenge.mjs [--out /tmp/namen]
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';
const {chromium}=await import(process.env.WD_PLAYWRIGHT||'/opt/node22/lib/node_modules/playwright/index.mjs');
const i=process.argv.indexOf('--out'),out=i>0?process.argv[i+1]:'/tmp/namen';fs.mkdirSync(out,{recursive:true});
const root=process.cwd(),types={js:'text/javascript',css:'text/css',html:'text/html',svg:'image/svg+xml',json:'application/json',webp:'image/webp',png:'image/png'};
const server=createServer((req,res)=>{try{const file=path.join(root,decodeURIComponent(new URL(req.url,'http://x').pathname));let body=fs.readFileSync(file);if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|4[0-3][^"/]*|online\/01-online)\.js[^>]*><\/script>/g,'');res.setHeader('Content-Type',types[file.split('.').pop()]||'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const lengths=[6,8,10,12,14,16,18,20,24];
const sets={breit:L=>'W'.repeat(L),typisch:L=>'Alexandra Kleinschmidt-Berg'.slice(0,L).trimEnd().padEnd(L,'x')};
const measure=(names)=>{
  const res=[];const vw=document.documentElement.clientWidth;
  for(const e of document.querySelectorAll('body *')){
    const own=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('');
    const hit=names.find(n=>own.includes(n));if(!hit)continue;
    const r=e.getBoundingClientRect();if(!r.width||e.closest('.hidden'))continue;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')continue;
    // Inline-Elemente haben keine eigene Breite: gemessen wird der nächste Block, der den Namen begrenzt.
    let box=e;while(box.parentElement&&getComputedStyle(box).display==='inline')box=box.parentElement;
    const range=document.createRange();range.selectNodeContents(e);const textW=range.getBoundingClientRect().width;
    const bs=getComputedStyle(box),inner=box.clientWidth-parseFloat(bs.paddingLeft)-parseFloat(bs.paddingRight);
    const cut=box.scrollWidth>box.clientWidth+1||(bs.overflow!=='visible'&&textW>inner+1)||(e!==box&&getComputedStyle(e).textOverflow==='ellipsis'&&e.scrollWidth>e.offsetWidth+1);
    const over=r.right>vw+1;
    const key=(e.closest('[id]')?.id||'')+' '+e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/)[0]:'');
    res.push({key,cut,over,width:Math.round(r.width)});
  }
  return res;
};
const report={};
for(const width of [320,390]){
  const ctx=await browser.newContext({locale:'de-DE',viewport:{width,height:844},serviceWorkers:'block'});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);await p.waitForFunction(()=>typeof createProfile==='function');
  await p.evaluate(()=>{const ps=['A','B','C'].map(n=>createProfile(n));ps.forEach(p=>{const c=campaignProgress(p);c.completedEncounters=CAMPAIGN_ENCOUNTERS.map(e=>e.id);c.unlockedAbilities=[...REAL_ABILITY_IDS];});trioCampaignProgress(...ps).completedEncounters=TRIO_CAMPAIGN_ENCOUNTERS.map(e=>e.id);saveGameData();window.__ids=ps.map(p=>p.id);});
  for(const [setName,make] of Object.entries(sets))for(const L of lengths){
    const names=[0,1,2].map(k=>make(L).slice(0,L-1)+'ABC'[k]);
    await p.evaluate(names=>{__ids.forEach((id,k)=>{getProfile(id).name=names[k];});saveGameData();},names);
    const shots={};
    // Kampfbildschirm Trio (sechs Karten) inkl. „ist dran“-Zeile
    await p.evaluate(()=>{openTrioCampaignScreen();trioProfile1Select.value=__ids[0];trioProfile2Select.value=__ids[1];trioProfile3Select.value=__ids[2];trioWorldId='trinity';trioCampaignEncounterId=TRIO_CAMPAIGN_ENCOUNTERS[0].id;renderTrioCampaign();});
    shots.trioKarte=await p.evaluate(measure,names);
    await p.click('#trioCampaignStartBtn');await p.waitForTimeout(300);
    shots.trioKampf=await p.evaluate(measure,names);
    if(L===24||L===16||L===12)await p.screenshot({path:`${out}/${width}-${setName}-${L}-trio.png`});
    await p.evaluate(()=>{players.filter(x=>x.campaignTeam==='enemy').forEach(x=>x.hp=0);finishTrioCampaignEncounter(true);});await p.waitForTimeout(2500);
    shots.trioEnde=await p.evaluate(measure,names);
    // Solo-Kampf
    await p.evaluate(()=>{openCampaignScreen();campaignProfileSelect.value=__ids[0];campaignWorldId='house';campaignEncounterId='first_blood';renderCampaign();});
    shots.soloKarte=await p.evaluate(measure,names);
    await p.click('#campaignStartBtn');await p.waitForTimeout(300);shots.soloKampf=await p.evaluate(measure,names);
    if(L===24||L===16)await p.screenshot({path:`${out}/${width}-${setName}-${L}-solo.png`});
    // Profile, Statistik, Achievements, Shop
    await p.evaluate(()=>{openMainMenu(true);});await p.waitForTimeout(150);shots.menue=await p.evaluate(measure,names);
    await p.click('#menuProfilesBtn');await p.waitForTimeout(200);shots.profile=await p.evaluate(measure,names);
    if(L===24)await p.screenshot({path:`${out}/${width}-${setName}-${L}-profile.png`,fullPage:true});
    await p.evaluate(()=>openMainMenu(true));await p.click('#menuStatsBtn');await p.waitForTimeout(200);shots.statistik=await p.evaluate(measure,names);
    if(L===24)await p.screenshot({path:`${out}/${width}-${setName}-${L}-statistik.png`,fullPage:true});
    await p.evaluate(()=>openMainMenu(true));await p.click('#menuAchievementsBtn');await p.waitForTimeout(200);shots.achievements=await p.evaluate(measure,names);
    await p.evaluate(()=>openMainMenu(true));await p.click('#menuPrestigeShopBtn');await p.waitForTimeout(200);shots.shop=await p.evaluate(measure,names);
    await p.evaluate(()=>openMainMenu(true));
    for(const [ctxName,list] of Object.entries(shots))for(const m of list){
      const k=`${width} ${setName} ${ctxName} ${m.key}`;report[k]??={};report[k][L]=m.over?'ÜBERLAUF':m.cut?'abgeschnitten':'ok';
    }
  }
  if(errors.length)console.log('Seitenfehler',width,errors.slice(0,5));
  await ctx.close();
}
await browser.close();server.close();
fs.writeFileSync(`${out}/namen.json`,JSON.stringify(report,null,1));
console.log('Breite Satz Ort Element | '+lengths.join(' '));
for(const [k,v] of Object.entries(report)){const row=lengths.map(L=>v[L]==null?'–':v[L]==='ok'?'·':v[L]==='abgeschnitten'?'✂':'✗');if(row.some(x=>x==='✂'||x==='✗'))console.log(k.padEnd(70),row.join(' '));}
