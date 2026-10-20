// Kampagnen-UI-Durchlauf: schaltet für ein lokales Testprofil (bzw. Duo-/Trio-Team)
// alle Kampagnenlevel frei, öffnet jedes Level in Solo, Duo und Trio über die echte
// Karte, startet es und lässt den Kampf von Bots zu Ende spielen. Geprüft werden
// Seitenfehler, horizontale Überläufe und Texte, die aus ihren Kästen laufen.
// Aufruf: node scripts/qa/kampagnen-ui-durchlauf.mjs [--modus solo,duo,trio] [--nur id,id] [--parallel 3]
//         [--breite 390] [--ohne-kampf] [--tempo 3] [--out /tmp/kampagnen-ui]
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';
const {chromium}=await import(process.env.WD_PLAYWRIGHT||'/opt/node22/lib/node_modules/playwright/index.mjs');
const arg=(name,fallback)=>{const i=process.argv.indexOf(`--${name}`);return i>0?process.argv[i+1]:fallback;};
const root=process.cwd(),out=arg('out','/tmp/kampagnen-ui');fs.mkdirSync(out,{recursive:true});
const modes=(arg('modus','solo,duo,trio')).split(','),only=arg('nur','')?arg('nur').split(','):null,parallel=+arg('parallel',3),width=+arg('breite',390),timeoutMs=+arg('timeout',150000),speed=+arg('tempo',3),nurAnsicht=process.argv.includes('--ohne-kampf');
const types={js:'text/javascript',css:'text/css',html:'text/html',svg:'image/svg+xml',json:'application/json',webp:'image/webp',png:'image/png',mp3:'audio/mpeg',woff2:'font/woff2'};
const server=createServer((req,res)=>{try{const file=path.join(root,decodeURIComponent(new URL(req.url,'http://x').pathname));let body=fs.readFileSync(file);if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|4[0-3][^"/]*|online\/01-online)\.js[^>]*><\/script>/g,'');res.setHeader('Content-Type',types[file.split('.').pop()]||'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/index.html`;
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/opt/pw-browsers/chromium',args:['--no-sandbox']});

// Prüft den sichtbaren Bildschirm: Seitenüberlauf und abgeschnittene Texte in Karten/Knöpfen.
const layoutCheck=()=>{
  const issues=[];const vw=document.documentElement.clientWidth;
  if(document.documentElement.scrollWidth>vw+1)issues.push(`Seite ${document.documentElement.scrollWidth}px breit bei ${vw}px`);
  const visible=e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return false;const s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('.hidden');};
  const label=e=>`${e.tagName.toLowerCase()}${e.id?'#'+e.id:''}${e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):''} „${(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,40)}“`;
  for(const e of document.querySelectorAll('body *')){
    if(!visible(e)||e.closest('svg,canvas,.log,#log,.attack-fx-layer'))continue;
    const r=e.getBoundingClientRect();
    if((r.right>vw+2||r.left<-2)&&!e.closest('[class*="scroll"],.campaign-world-tabs,.campaign-path')&&getComputedStyle(e).position!=='fixed')issues.push(`ragt aus dem Bild (${Math.round(r.left)}–${Math.round(r.right)}): ${label(e)}`);
    const s=getComputedStyle(e);const hasText=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    if(hasText&&e.scrollWidth>e.clientWidth+2&&s.overflowX!=='auto'&&s.overflowX!=='scroll'&&e.clientWidth>0&&s.textOverflow!=='ellipsis')issues.push(`Text läuft über (${e.scrollWidth}>${e.clientWidth}): ${label(e)}`);
  }
  return [...new Set(issues)].slice(0,25);
};

async function newPage(){
  const ctx=await browser.newContext({locale:'de-DE',viewport:{width,height:844},serviceWorkers:'block',deviceScaleFactor:1});
  // Zeitraffer: JS-Wartezeiten (Bot-Takt, Würfelanimation) laufen schneller, CSS bleibt echt.
  if(speed!==1)await ctx.addInitScript(f=>{const st=window.setTimeout;window.setTimeout=(fn,ms,...a)=>st(fn,ms>40?ms*f:ms,...a);},1/speed);
  const p=await ctx.newPage();p.errors=[];
  p.on('pageerror',e=>p.errors.push(e.message+' @ '+(e.stack||'').split('\n').slice(1,4).map(s=>s.trim().replace(/http:\/\/127[^/]*\//,'')).join(' < ')));p.on('console',m=>{if(m.type()==='error')p.errors.push('console: '+m.text());});
  p.on('response',r=>{if(r.status()>=400)p.errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);});
  await p.goto(url);
  await p.waitForFunction(()=>typeof createProfile==='function'&&typeof openCampaignScreen==='function');
  // Testkonto: drei Profile, alles freigeschaltet.
  await p.evaluate(()=>{
    localStorage.setItem('diceduel_language','de');
    const names=['Testheld','Testpartnerin','Testdritter'];
    const ps=names.map(n=>saveData.profiles.find(x=>x.name===n)||createProfile(n));
    const solo=CAMPAIGN_ENCOUNTERS.map(e=>e.id);
    ps.forEach(p=>{const c=campaignProgress(p);c.completedEncounters=[...solo];c.unlockedAbilities=[...REAL_ABILITY_IDS];c.unlockedSecondaryAbilities=[...REAL_ABILITY_IDS];});
    duoCampaignProgress(ps[0],ps[1]).completedEncounters=DUO_CAMPAIGN_ENCOUNTERS.map(e=>e.id);
    trioCampaignProgress(ps[0],ps[1],ps[2]).completedEncounters=TRIO_CAMPAIGN_ENCOUNTERS.map(e=>e.id);
    saveGameData();window.__ids=ps.map(p=>p.id);
  });
  return p;
}

const lists=await (async()=>{const p=await newPage();const l=await p.evaluate(()=>({solo:CAMPAIGN_ENCOUNTERS.map(e=>({id:e.id,world:e.world,title:e.title})),duo:DUO_CAMPAIGN_ENCOUNTERS.map(e=>({id:e.id,world:e.world||'covenant',title:e.title})),trio:TRIO_CAMPAIGN_ENCOUNTERS.map(e=>({id:e.id,world:e.world||'trinity',title:e.title}))}));await p.context().close();return l;})();

const cfg={
  solo:{open:()=>{openCampaignScreen();campaignProfileSelect.value=__ids[0];renderCampaign();},tab:'data-world-id',node:'data-campaign-id',screen:'#campaignScreen',detail:'#campaignEncounterDetail',start:'#campaignStartBtn',abilitySelects:['#campaignAbilitySelect']},
  duo:{open:()=>{openDuoCampaignScreen();duoProfile1Select.value=__ids[0];duoProfile2Select.value=__ids[1];renderDuoCampaign();},tab:'data-duo-world-id',node:'data-duo-campaign-id',screen:'#duoCampaignScreen',detail:'#duoCampaignEncounterDetail',start:'#duoCampaignStartBtn',abilitySelects:['#duoAbility1Select','#duoAbility2Select']},
  trio:{open:()=>{openTrioCampaignScreen();trioProfile1Select.value=__ids[0];trioProfile2Select.value=__ids[1];trioProfile3Select.value=__ids[2];renderTrioCampaign();},tab:'data-trio-world-id',node:'data-trio-campaign-id',screen:'#trioCampaignScreen',detail:'#trioCampaignEncounterDetail',start:'#trioCampaignStartBtn',abilitySelects:['#trioAbility1Select','#trioAbility2Select','#trioAbility3Select']}
};

async function testLevel(p,mode,enc){
  const c=cfg[mode],r={mode,id:enc.id,world:enc.world,title:enc.title,issues:[],errors:[],ms:0};const t0=Date.now();p.errors.length=0;
  await p.evaluate(`(${c.open})()`);
  await p.click(`[${c.tab}="${enc.world}"]`);
  await p.click(`[${c.node}="${enc.id}"]`);
  await p.waitForTimeout(120);
  const detail=await p.locator(c.detail).innerText();
  if(!detail.includes(enc.title.split('·').pop().trim().slice(0,10)))r.issues.push('Detailkarte zeigt nicht das gewählte Level');
  r.mapIssues=await p.evaluate(layoutCheck);
  await p.locator(c.detail).screenshot({path:`${out}/${mode}-${enc.id}-karte.png`}).catch(()=>{});
  // Manche Level verlangen eine bestimmte Fähigkeit: wie ein Spieler die Auswahl durchprobieren.
  if(await p.locator(c.start).isDisabled()){
    r.hint=await p.locator(c.start).getAttribute('title')||'';
    r.hintVisible=await p.evaluate(h=>!!h&&[...document.querySelectorAll('.campaign-hub:not(.hidden) *')].some(e=>e.children.length===0&&e.textContent.includes(h.slice(0,30))&&e.getBoundingClientRect().height>0),r.hint);
    const sel=c.abilitySelects||[];
    outer:for(const s of sel){for(const v of await p.locator(`${s} option:not([disabled])`).evaluateAll(o=>o.map(x=>x.value))){await p.selectOption(s,v);if(!await p.locator(c.start).isDisabled()){r.abilityChanged=`${s}=${v}`;break outer;}}}
  }
  if(await p.locator(c.start).isDisabled()){r.issues.push('Start-Knopf gesperrt: '+(await p.locator(c.start).getAttribute('title')||''));r.ms=Date.now()-t0;r.errors=[...p.errors];return r;}
  await p.click(c.start);
  await p.waitForSelector('#game:not(.hidden)',{timeout:5000}).catch(()=>r.issues.push('Kampf startet nicht'));
  await p.waitForTimeout(400);
  r.battleIssues=await p.evaluate(layoutCheck);
  r.setup=await p.evaluate(()=>({players:players.map(x=>({name:x.name,team:x.campaignTeam,hp:x.hp,ability:x.ability})),banner:document.querySelector('.encounter-rule-banner,#encounterRuleBanner')?.innerText?.slice(0,200)||''}));
  await p.screenshot({path:`${out}/${mode}-${enc.id}-start.png`});
  if(nurAnsicht){r.errors=[...p.errors];r.ms=Date.now()-t0;await p.evaluate(()=>{clearBotAutomation();openMainMenu(true);});return r;}
  // Bots übernehmen die Helden und spielen den Kampf zu Ende.
  await p.evaluate(()=>{botSpeedMode='fast';players.forEach(x=>{if(x.campaignTeam==='hero')x.botLevel='hard';});scheduleBotAction();});
  let mid=false,seen=new Set();const until=Date.now()+timeoutMs;
  while(Date.now()<until){
    await p.waitForTimeout(1500);
    const s=await p.evaluate(()=>({done:!winnerBox.classList.contains('hidden'),round:players.map(x=>x.hp).join('/'),modal:[...document.querySelectorAll('.modal:not(.hidden),[class*="modal"]:not(.hidden)')].filter(e=>e.getBoundingClientRect().height>0).map(e=>e.id).join(',')}));
    if(s.done)break;
    // Fenster bedienen die Bots selbst; hier nur festhalten, welche aufgingen.
    if(s.modal)seen.add(s.modal);
    await p.evaluate(()=>{players.forEach(x=>{if(x.campaignTeam==='hero')x.botLevel='hard';});if(!botTimer)scheduleBotAction();});
    if(!mid&&Date.now()-t0>8000){mid=true;r.midIssues=await p.evaluate(layoutCheck);await p.screenshot({path:`${out}/${mode}-${enc.id}-mitte.png`});}
  }
  const end=await p.evaluate(()=>({done:!winnerBox.classList.contains('hidden'),text:winnerText.innerText,heroWon:players.some(x=>x.campaignTeam==='hero'&&x.hp>0)&&players.filter(x=>x.campaignTeam==='enemy').every(x=>x.hp<=0),hp:players.map(x=>`${x.name}:${x.hp}`).join(' ')}));
  r.end=end;r.modals=[...seen];
  if(!end.done)r.issues.push(`Kampf nach ${timeoutMs/1000}s nicht beendet (${end.hp})`);
  else{await p.waitForTimeout(2500);r.endIssues=await p.evaluate(layoutCheck);
    // Match Awards müssen Namen aus genau diesem Kampf tragen.
    const fremd=await p.evaluate(()=>{const names=new Set(players.map(x=>x.name));return [...document.querySelectorAll('#winnerBox .v276-award span')].map(e=>e.textContent).filter(n=>!names.has(n));});
    if(fremd.length)r.issues.push('Match Awards aus einem anderen Kampf: '+fremd.join(', '));
    // Duo/Trio: Helden links, Gegner rechts.
    const spalten=await p.evaluate(()=>players.map((x,i)=>{const c=document.getElementById('playerCard'+i);return {team:x.campaignTeam,left:Math.round(c.getBoundingClientRect().left)};}));
    if(mode!=='solo'){const lh=Math.max(...spalten.filter(x=>x.team==='hero').map(x=>x.left)),le=Math.min(...spalten.filter(x=>x.team==='enemy').map(x=>x.left));if(lh>=le)r.issues.push('Held steht in der Gegnerspalte');}await p.screenshot({path:`${out}/${mode}-${enc.id}-ende.png`});
    // Zurück zur Karte über den echten Knopf.
    await p.click('#restartBtn').catch(()=>r.issues.push('Zurück-Knopf fehlt'));await p.waitForTimeout(250);
    if(!await p.locator(c.screen).isVisible())r.issues.push('Nach dem Kampf nicht zur Kampagnenkarte zurück');}
  r.errors=[...p.errors];r.ms=Date.now()-t0;return r;
}

const jobs=[];for(const m of modes)for(const e of lists[m])if(!only||only.includes(e.id))jobs.push([m,e]);
const results=[];let next=0;
await Promise.all(Array.from({length:Math.min(parallel,jobs.length)},async()=>{
  let p=await newPage();
  while(next<jobs.length){const [m,e]=jobs[next++];let r;
    try{r=await testLevel(p,m,e);}catch(err){r={mode:m,id:e.id,world:e.world,title:e.title,issues:['Abbruch: '+err.message.split('\n')[0]],errors:[...p.errors]};await p.context().close().catch(()=>{});p=await newPage();}
    results.push(r);fs.writeFileSync(`${out}/ergebnisse.json`,JSON.stringify(results,null,1));
    const n=(r.issues?.length||0)+(r.errors?.length||0)+[r.mapIssues,r.battleIssues,r.midIssues,r.endIssues].reduce((a,x)=>a+(x?.length||0),0);
    console.log(`${results.length}/${jobs.length} ${m} ${e.id} ${r.end?.done?(r.end.heroWon?'Sieg':'Niederlage'):'—'} ${Math.round((r.ms||0)/1000)}s ${n?'⚠ '+n:'ok'}`);
  }
  await p.context().close();
}));
await browser.close();server.close();
