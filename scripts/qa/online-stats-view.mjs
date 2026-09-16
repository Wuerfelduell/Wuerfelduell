// Anforderungen: öffentlich, erst beim Öffnen laden, gewichtete Quoten,
// Filter, kleine Stichproben zuletzt, zehn Minuten Cache, ruhige DE/EN-Ansicht.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
const root=process.cwd(),errors=[],missing=[];
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{try{
  const file=path.join(root,new URL(req.url,'http://x').pathname);
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const executablePath=process.env.WD_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined);
let browser;
const base={source:'local',mode_id:'classic',game_version:'28.12.1',player_count:2,has_bots:false,is_bot:false,ability_level:0,acquired:'start',win_rate:100};
const rows=[
  {...base,ability_id:1,uses:10,wins:10},
  {...base,ability_id:1,ability_level:1,uses:90,wins:0},
  {...base,ability_id:2,uses:40,wins:20},
  {...base,ability_id:3,uses:2,wins:2},
  {...base,ability_id:4,uses:80,wins:80,is_bot:true},
  {...base,ability_id:5,uses:50,wins:50,game_version:'27.9.1'},
  {...base,ability_id:6,uses:35,wins:7,source:'online'},
  {...base,ability_id:7,uses:32,wins:8,mode_id:'campaign_duo'},
  {...base,ability_id:8,uses:31,wins:9,mode_id:'boss_rush_duo'}
];
async function page(locale='de-DE',width=390,provider='supabase'){
  const p=await browser.newPage({locale,viewport:{width,height:844},serviceWorkers:'block'});
  p.setDefaultTimeout(12000);
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()===404)missing.push(r.url());});
  // Mock the real RPC boundary; no Auth/network call or production contribution.
  await p.route('**/js/backend-config.js*',r=>r.fulfill({contentType:'text/javascript',body:`window.DICEDUEL_BACKEND_CONFIG={accountProvider:${JSON.stringify(provider)},onlineProvider:${JSON.stringify(provider)},supabase:{projectUrl:"https://stats-test.supabase.co",publishableKey:"test-public-key-for-stats-view"}};`}));
  await p.route(/\/js\/(?:41-supabase-core|42-supabase-account|43-supabase-battle|online\/01-online)\.js/,r=>r.fulfill({contentType:'text/javascript',body:''}));
  await p.route('**/*',async r=>{
    if(new URL(r.request().url()).hostname!=='127.0.0.1')return r.fulfill({contentType:'text/javascript',body:''});
    return r.fallback();
  });
  await p.addInitScript(({rows})=>{
    window.statsCalls=[];window.statsReply=rows;window.statsFailure=false;window.statsHold=false;window.statsReleases=[];
    window.WDSupabase={getClient:async()=>({rpc:async name=>{
      window.statsCalls.push(name);
      if(window.statsHold)await new Promise(resolve=>{window.statsReleases.push(resolve);});
      if(window.statsFailure)return {data:null,error:{message:'test failure'}};
      return {data:name==='dd_global_stats_count'?321:window.statsReply,error:null};
    }})};
    window.WDSupabaseAccountBackend={getSession:async()=>null};
  },{rows});
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  if(errors.length)throw Error(errors.join('\n'));
  await p.waitForTimeout(350);
  assert.equal(await p.evaluate(()=>window.statsCalls.length),0,'no startup RPC');
  return p;
}
const ids=p=>p.locator('#globalStatsList [data-ability]').evaluateAll(es=>es.map(e=>Number(e.dataset.ability)));
try{
  browser=await chromium.launch({executablePath,args:['--no-sandbox']});
  const p=await page();
  console.log('Ansicht: Start ohne RPC geprüft.');
  await p.evaluate(()=>window.statsHold=true);await p.click('#menuStatsBtn');
  await p.waitForFunction(()=>window.statsCalls.length===2);
  assert.match(await p.locator('#globalStatsState').innerText(),/geladen|Laden/);
  await p.evaluate(()=>{window.statsHold=false;window.statsReleases.forEach(resolve=>resolve());});
  await p.waitForSelector('#globalStatsList [data-ability]');
  console.log('Ansicht: erste Antwort dargestellt.');
  assert.deepEqual(await ids(p),[2,8,7,6,1,3]);
  const first=p.locator('[data-ability="1"]');
  assert.match(await first.innerText(),/100/);assert.match(await first.innerText(),/10%/);
  assert.match(await p.locator('[data-ability="3"]').innerText(),/kleine Stichprobe/);
  assert.match(await p.locator('#globalStatsMeta').innerText(),/321/);
  await first.locator('summary').click();assert.match(await first.innerText(),/Level 0/);assert.match(await first.innerText(),/Level 2/);
  await p.selectOption('#globalStatsSort','uses');assert.deepEqual((await ids(p)).slice(0,2),[1,2]);
  await p.check('#globalStatsBots');assert.ok((await ids(p)).includes(4));
  await p.check('#globalStatsVersions');assert.ok((await ids(p)).includes(5));
  await p.selectOption('#globalStatsSource','online');assert.deepEqual(await ids(p),[6]);
  await p.selectOption('#globalStatsSource','both');await p.selectOption('#globalStatsMode','campaign');assert.deepEqual(await ids(p),[7]);
  await p.selectOption('#globalStatsMode','boss');assert.deepEqual(await ids(p),[8]);
  await p.selectOption('#globalStatsMode','duel');assert.ok(!(await ids(p)).includes(7));
  await p.click('#statsScreen .menuBackBtn');await p.click('#menuStatsBtn');assert.equal(await p.evaluate(()=>statsCalls.length),2);
  await p.evaluate(()=>{const original=Date.now;Date.now=()=>original()+601000;});
  await p.click('#statsScreen .menuBackBtn');await p.click('#menuStatsBtn');await p.waitForFunction(()=>statsCalls.length===4);
  await p.evaluate(()=>window.statsFailure=true);await p.click('#globalStatsRefresh');await p.waitForFunction(()=>document.querySelector('#globalStatsSection').dataset.state==='error');
  await p.evaluate(()=>{window.statsFailure=false;window.statsReply=[];});await p.click('#globalStatsRefresh');await p.waitForFunction(()=>document.querySelector('#globalStatsSection').dataset.state==='empty');
  await p.context().setOffline(true);await p.click('#globalStatsRefresh');assert.equal(await p.locator('#globalStatsSection').getAttribute('data-state'),'offline');
  await p.context().setOffline(false);
  await p.evaluate(async()=>{
    const uid='11111111-1111-4111-8111-111111111111';
    window.WDSupabaseAccountBackend.getSession=async()=>({uid});
    const b=await WDOnlineStats.createOutbox();
    const r={schema_version:1,event_id:crypto.randomUUID(),source:'local',game_version:'28.12.61',mode_id:'classic',round_number:1,room_id:null,match_id:null,players:[{seat:0,is_bot:false,won:true,abilities:[{id:1,level:0,acquired:'start'}]},{seat:1,is_bot:false,won:false,abilities:[{id:2,level:0,acquired:'start'}]}]};
    await b.enqueue(uid,r);await b.reject(uid,r.event_id,'DD_STATS_INVALID_REPORT');b.close();
    await WDOnlineStats.game.flush();
  });
  assert.equal(await p.locator('#onlineStatsRejectedCount').textContent(),'1');
  assert.equal(await p.locator('#onlineStatsRejected').getAttribute('hidden'),null);
  await p.locator('#onlineStatsDiscard').evaluate(el=>el.click());
  await p.waitForFunction(()=>document.querySelector('#onlineStatsRejected').hidden);
  assert.equal(await p.locator('#onlineStatsRejectedCount').textContent(),'0');
  await p.close();
  const fallback=await page('de-DE',390,'firebase');await fallback.click('#menuStatsBtn');assert.equal(await fallback.locator('#globalStatsSection').isVisible(),false);assert.equal(await fallback.evaluate(()=>statsCalls.length),0);await fallback.close();
  for(const locale of ['de-DE','en-US'])for(const width of [320,360,390,412,1280]){
    const p=await page(locale,width);await p.click('#menuStatsBtn');await p.waitForSelector('#globalStatsList [data-ability]');
    assert.match(await p.locator('#globalStatsSection').innerText(),locale==='de-DE'?/Globale Fähigkeitsstatistik/:/Global ability statistics/);
    assert.equal(await p.locator('[data-ability="1"] .global-stat-name').innerText(),'Brutal Ones');
    assert.match(await p.locator('[data-ability="3"]').innerText(),locale==='de-DE'?/kleine Stichprobe/:/small sample/);
    await p.locator('[data-ability="1"] summary').click();
    await p.locator('#globalStatsSection').scrollIntoViewIfNeeded();
    await p.waitForTimeout(350);
    const layout=await p.evaluate(async()=>{
      const section=document.querySelector('#globalStatsSection');let mutations=0;
      const observer=new MutationObserver(es=>mutations+=es.length);observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
      await new Promise(r=>setTimeout(r,1000));observer.disconnect();
      return {mutations,overflow:section.scrollWidth-section.clientWidth};
    });
    assert.equal(layout.mutations,0,`${locale}/${width} idle`);assert.ok(layout.overflow<=1,`${locale}/${width} overflow ${layout.overflow}`);
    if(process.env.WD_STATS_SCREENSHOTS){fs.mkdirSync(process.env.WD_STATS_SCREENSHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.WD_STATS_SCREENSHOTS,`stats-${locale}-${width}.png`)});}
    await p.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('Globale Ansicht: Summen, Filter, Stichproben, Sortierung, Cache, Zustände; 10 DE/EN-Ansichten ohne Überlauf, Fehler, 404 oder Leerlaufmutationen.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
