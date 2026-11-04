// Menü-Rundgang: öffnet jeden Bildschirm aus dem Hauptmenü, tippt dort jeden sichtbaren Knopf
// einzeln an und meldet JS-Fehler, 404, waagrechte Überläufe, abgeschnittene Texte und
// Platzhaltertexte (undefined, NaN, {x}). Ohne Netz: Supabase und Online-Modul sind ausgeblendet.
// Aufruf: node scripts/qa/menue-rundgang.mjs [--out /tmp/rundgang] [--breiten 320,390,1280] [--leer]
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';
import {chromium} from 'playwright';
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:d;};
const out=arg('--out','/tmp/rundgang');fs.mkdirSync(out,{recursive:true});
const widths=arg('--breiten','320,390,1280').split(',').map(Number);
const locale=arg('--sprache','de-DE');
const empty=process.argv.includes('--leer');
const root=process.cwd(),types={js:'text/javascript',css:'text/css',html:'text/html',svg:'image/svg+xml',json:'application/json',webp:'image/webp',png:'image/png',mp3:'audio/mpeg',ogg:'audio/ogg'};
const server=createServer((req,res)=>{try{const file=path.join(root,decodeURIComponent(new URL(req.url,'http://x').pathname));let body=fs.readFileSync(file);if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|4[0-3][^"/]*|online\/01-online)\.js[^>]*><\/script>/g,'');res.setHeader('Content-Type',types[file.split('.').pop()]||'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined),args:['--no-sandbox']});
const NAMES=['WWWWWWWWWWWW','Alexandra Kl','Ömer-Çağlarß'];
const MENU=['menuPlayBtn','menuOnlineBtn','menuCampaignBtn','menuTutorialBtn','menuProfilesBtn','menuAccountBtn','menuAchievementsBtn','menuPrestigeShopBtn','menuStatsBtn','menuSettingsBtn','menuRulesBtn','menuChangelogBtn'];
const findings=[];const add=(w,where,what)=>{const k=`${w} | ${where} | ${what}`;if(!findings.includes(k))findings.push(k);};

// Sichtbare Mängel im aktuellen Zustand
const inspect=()=>{
  const vw=document.documentElement.clientWidth,res=[];
  const shown=el=>{const b=el.getBoundingClientRect();if(b.width<1||b.height<1)return false;for(let n=el;n&&n!==document.documentElement;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<0.05)return false;}return true;};
  const scrollsX=el=>{for(let n=el.parentElement;n;n=n.parentElement){const s=getComputedStyle(n);if(/auto|scroll/.test(s.overflowX)&&n.scrollWidth>n.clientWidth+1)return true;}return false;};
  const label=el=>{const id=el.closest('[id]')?.id||'';const t=(el.innerText||el.value||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,50);return `${id} ${el.tagName.toLowerCase()}${typeof el.className==='string'&&el.className?'.'+el.className.trim().split(/\s+/)[0]:''} „${t}“`;};
  if(document.documentElement.scrollWidth>vw+1)res.push(`Seite scrollt waagrecht (${document.documentElement.scrollWidth-vw}px)`);
  for(const el of document.querySelectorAll('body *')){
    if(['SCRIPT','STYLE','svg','path','OPTION'].includes(el.tagName)||!shown(el))continue;
    const b=el.getBoundingClientRect(),s=getComputedStyle(el);
    const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    if(own&&(b.right>vw+1||b.left<-1)&&!scrollsX(el)&&s.position!=='fixed')res.push(`ragt aus dem Bild (${Math.round(b.left)}–${Math.round(b.right)}): ${label(el)}`);
    // Text abgeschnitten ohne „…“
    if(own&&s.overflow!=='visible'&&s.textOverflow!=='ellipsis'&&el.scrollWidth>el.clientWidth+2&&!/auto|scroll/.test(s.overflowX))res.push(`Text abgeschnitten: ${label(el)}`);
    if(own){const t=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('');if(/\bundefined\b|\bNaN\b|\[object |\{[a-zA-Z_]+\}|\bnull\b/.test(t))res.push(`Platzhaltertext: ${label(el)}`);}
  }
  return res;
};
const visibleLayer=()=>{
  const shown=el=>{const b=el.getBoundingClientRect();if(b.width<1||b.height<1)return false;for(let n=el;n&&n!==document.documentElement;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
  const cands=[...document.querySelectorAll('body > *, section[id], .utility-overlay, [id$=Modal], [id$=Overlay], [id$=Popup], [id$=Picker]')].filter(el=>el.id&&shown(el));
  return cands.map(el=>el.id);
};

async function freshPage(width){
  const ctx=await browser.newContext({locale,viewport:{width,height:width>=1000?800:844},serviceWorkers:'block'});
  const page=await ctx.newPage();page.setDefaultTimeout(8000);
  const errs=[],miss=[];
  page.on('pageerror',e=>errs.push(e.message));
  page.on('response',r=>{if(r.status()===404)miss.push(r.url().replace(/^https?:\/\/[^/]+/,''));});
  page.on('dialog',d=>d.dismiss().catch(()=>{}));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.fulfill({body:''}));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForFunction(()=>typeof createProfile==='function'&&typeof openMainMenu==='function');
  if(!empty)await page.evaluate(names=>{const ps=names.map(n=>createProfile(n));ps.forEach((p,i)=>{if(i<2){const c=campaignProgress(p);c.completedEncounters=CAMPAIGN_ENCOUNTERS.slice(0,20).map(e=>e.id);c.unlockedAbilities=[...REAL_ABILITY_IDS];}});saveGameData();},NAMES);
  await page.evaluate(()=>openMainMenu(true));await page.waitForTimeout(300);
  return {ctx,page,errs,miss};
}
const home=async page=>{await page.keyboard.press('Escape').catch(()=>{});await page.evaluate(()=>{document.querySelectorAll('.utility-overlay').forEach(el=>el.classList.add('hidden'));document.getElementById('onlineScreen')?.classList.add('hidden');try{openMainMenu(true);}catch{}});await page.waitForTimeout(200);};

for(const width of widths){
  const {ctx,page,errs,miss}=await freshPage(width);
  const W=`${width}px`;
  await page.screenshot({path:`${out}/${width}-hauptmenue.png`,fullPage:true});
  for(const f of await page.evaluate(inspect))add(W,'Hauptmenü',f);
  for(const btn of MENU){
    await home(page);
    const before=errs.length;
    if(!await page.locator('#'+btn).isVisible().catch(()=>false)){add(W,btn,'Knopf im Hauptmenü nicht sichtbar');continue;}
    await page.click('#'+btn).catch(e=>add(W,btn,'Klick fehlgeschlagen '+e.message.split('\n')[0]));
    await page.waitForTimeout(600);
    const layer=(await page.evaluate(visibleLayer)).filter(id=>!['mainMenu'].includes(id)).join(',')||'?';
    const name=btn.replace(/^menu|Btn$/g,'');
    await page.screenshot({path:`${out}/${width}-${name}.png`,fullPage:true});
    for(const f of await page.evaluate(inspect))add(W,`${name} [${layer}]`,f);
    if(errs.length>before)add(W,name,'JS-Fehler: '+errs.slice(before).join(' / '));
    // Jeden sichtbaren Knopf dieses Bildschirms einzeln antippen
    const targets=await page.evaluate(()=>{
      const shown=el=>{const b=el.getBoundingClientRect();if(b.width<1||b.height<1)return false;for(let n=el;n&&n!==document.documentElement;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
      const els=[...document.querySelectorAll('button, [role=button], [role=tab], .tab, select, a[href^="#"], [onclick]')].filter(el=>shown(el)&&!el.disabled&&!el.closest('#mainMenu'));
      return els.map((el,i)=>{el.dataset.rg=String(i);return {i,t:(el.innerText||el.value||el.getAttribute('aria-label')||el.id||'').trim().replace(/\s+/g,' ').slice(0,40),id:el.id};});
    });
    console.log(`${W} ${name}: ${targets.length} Knöpfe`,targets.map(t=>t.t||t.id).slice(0,45).join(' | '));
    for(const t of targets.slice(0,45)){
      if(/zurück|back|schließen|close|löschen|delete|reset|zurücksetzen|abmelden|logout/i.test(t.t+t.id))continue;
      await home(page);await page.click('#'+btn).catch(()=>{});await page.waitForTimeout(450);
      // Nach dem Neuöffnen dieselbe Reihenfolge markieren
      await page.evaluate(()=>{const shown=el=>{const b=el.getBoundingClientRect();if(b.width<1||b.height<1)return false;for(let n=el;n&&n!==document.documentElement;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};[...document.querySelectorAll('button, [role=button], [role=tab], .tab, select, a[href^="#"], [onclick]')].filter(el=>shown(el)&&!el.disabled&&!el.closest('#mainMenu')).forEach((el,i)=>el.dataset.rg=String(i));});
      const loc=page.locator(`[data-rg="${t.i}"]`);
      const e0=errs.length,m0=miss.length;
      const tag=await loc.evaluate(el=>el.tagName).catch(()=>null);if(!tag)continue;
      if(tag==='SELECT'){const n=await loc.evaluate(el=>el.options.length);for(let k=0;k<Math.min(n,6);k++){await loc.selectOption({index:k}).catch(()=>{});await page.waitForTimeout(200);for(const f of await page.evaluate(inspect))add(W,`${name} → Auswahl „${t.t.slice(0,20)}“ #${k}`,f);}}
      else{
        const layersBefore=await page.evaluate(visibleLayer);
        await loc.click({timeout:3000}).catch(e=>add(W,`${name} → „${t.t}“`,'nicht anklickbar: '+e.message.split('\n')[0].slice(0,120)));
        await page.waitForTimeout(700);
        const layersAfter=await page.evaluate(visibleLayer);
        const opened=layersAfter.filter(id=>!layersBefore.includes(id));
        const where=`${name} → „${t.t||t.id}“${opened.length?' ['+opened.join(',')+']':''}`;
        const fs_=await page.evaluate(inspect);
        for(const f of fs_)add(W,where,f);
        if(opened.length||fs_.length){const safe=(name+'-'+(t.id||t.t)).replace(/[^\wäöüÄÖÜ-]+/g,'_').slice(0,60);await page.screenshot({path:`${out}/${width}-${safe}.png`,fullPage:true}).catch(()=>{});}
      }
      if(errs.length>e0)add(W,`${name} → „${t.t}“`,'JS-Fehler: '+[...new Set(errs.slice(e0))].join(' / ').slice(0,300));
      if(miss.length>m0)add(W,`${name} → „${t.t}“`,'404: '+[...new Set(miss.slice(m0))].join(', ').slice(0,300));
    }
  }
  await ctx.close();
}
await browser.close();server.close();
fs.writeFileSync(`${out}/befunde.txt`,findings.join('\n'));
console.log(findings.join('\n'));console.log(`\n${findings.length} Befunde`);
