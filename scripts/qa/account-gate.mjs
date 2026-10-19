// Anforderungen: Ohne echten Account liegt beim ersten Start ein Fenster
// zum Registrieren/Anmelden über dem Hauptmenü (DE/EN, fünf Breiten, ohne
// Überlauf, Fehler, 404 oder Leerlaufmutationen); Anmelden schließt es,
// Abmelden öffnet es wieder, eine bestehende Sitzung zeigt es nicht, und ohne
// Server lässt es sich für die Sitzung überspringen. Kein echter Auth-Aufruf:
// alle externen Hosts sind gesperrt, Anmeldung läuft über ein Ersatz-Backend.
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
const root=process.cwd();
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{try{
  const file=path.join(root,new URL(req.url,'http://x').pathname);
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/index.html`;
const executablePath=process.env.WD_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined);
const b = await chromium.launch({executablePath,args:['--no-sandbox']});
const fails=[];const ok=(c,m)=>{console.log((c?'OK  ':'FAIL')+' '+m); if(!c) fails.push(m);};
async function fresh(lang,width,opts={}){
  const ctx=await b.newContext({viewport:{width,height:800}});
  const p=await ctx.newPage(); const errs=[],nf=[];
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.fallback():r.abort());
  p.on('pageerror',e=>errs.push(e.message)); p.on('response',r=>{if(r.status()===404)nf.push(r.url())});
  await p.addInitScript(l=>{try{localStorage.setItem('diceduel_language',l)}catch{}},lang);
  await p.goto(base); await p.waitForFunction(()=>document.body.classList.contains('wd-booted'),null,{timeout:15000});
  await p.waitForTimeout(2500);
  return {ctx,p,errs,nf};
}
const vis=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect();return getComputedStyle(e).display!=='none'&&r.width>0&&r.height>0},sel);
for(const lang of ['de','en']) for(const w of [320,360,390,412,1280]){
  const {ctx,p,errs,nf}=await fresh(lang,w);
  const tag=`${lang}/${w}`;
  ok(await vis(p,'#wdAccountGate'),`${tag}: Gate sichtbar beim ersten Start`);
  const top=await p.evaluate(()=>{const e=document.elementFromPoint(innerWidth/2,innerHeight/2);return !!e.closest('#wdAccountGate')});
  ok(top,`${tag}: Gate liegt über dem Hauptmenü`);
  const ovf=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('#wdAccountGate *')].every(n=>n.getBoundingClientRect().right<=innerWidth+0.5));
  ok(ovf,`${tag}: kein horizontaler Überlauf`);
  if(lang==='en'){const t=await p.evaluate(()=>document.querySelector('#wdAccountGate').innerText);ok(!/[äöüß]|Anmelden|Konto|Passwort|Neuer/.test(t),`${tag}: Gate englisch (${t.replace(/\s+/g,' ').slice(0,80)}…)`);}
  // Pflichtfeld-Prüfung ohne Netzaufruf
  await p.click('#wdAccountGate [data-gate-form="register"] button[type=submit]');
  ok((await p.textContent('#wdAccountGateMessage')).length>5 && await vis(p,'#wdAccountGateMessage'),`${tag}: leeres Formular meldet Fehler`);
  await p.click('[data-gate-tab="login"]');
  ok(await vis(p,'[data-gate-form="login"]') && !(await vis(p,'[data-gate-form="register"]')),`${tag}: Wechsel auf Anmelden`);
  await p.waitForTimeout(3000);const muts=await p.evaluate(()=>new Promise(r=>{let n=0;const o=new MutationObserver(x=>x.forEach(y=>{if(y.target.id!=='onlineStatsStatus')n++}));o.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});setTimeout(()=>{o.disconnect();r(n)},2000)}));
  ok(muts===0,`${tag}: Leerlauf ohne DOM-Mutationen (${muts})`);
  ok(errs.length===0,`${tag}: keine JS-Fehler ${errs.join('|')}`); ok(nf.length===0,`${tag}: keine 404 ${nf.join(' ')}`);
  await ctx.close();
}
// Angemeldet -> kein Gate; Abmelden -> Gate zurück; Anmelden schließt es
{
  const {ctx,p}=await fresh('de',390);
  const r=await p.evaluate(async()=>{
    let session=null,cb=null;
    const fake={kind:'supabase',async getSession(){return session},async login({email}){session={uid:'u',email,name:'T'};cb?.(session);return session},async register(){return {pendingConfirmation:true}},async logout(){session=null;cb?.(null)},onAuthStateChange(f){cb=f;return()=>{}},async pushSave(){},async pullSave(){return null}};
    WDCloudBackend.set(fake); await WDAccountGate.check();
    const a=WDAccountGate.open;
    const f=document.querySelector('[data-gate-form="register"]');
    f.elements.name.value='T';f.elements.email.value='t@example.com';f.elements.password.value='12345678';
    f.requestSubmit(); await new Promise(r=>setTimeout(r,200));
    const b2=WDAccountGate.open && !document.querySelector('[data-gate-form="login"]').classList.contains('hidden') && document.querySelector('[data-gate-form="login"]').elements.email.value==='t@example.com';
    const l=document.querySelector('[data-gate-form="login"]'); l.elements.password.value='12345678'; l.requestSubmit(); await new Promise(r=>setTimeout(r,200));
    const c=!WDAccountGate.open;
    await fake.logout(); const d=WDAccountGate.open;
    session={uid:'u'}; await WDAccountGate.check(); const e=!WDAccountGate.open;
    return {a,b2,c,d,e};
  });
  ok(r.a,'ohne Account: Gate offen'); ok(r.b2,'Registrierung mit E-Mail-Bestätigung: Wechsel auf Anmelden mit E-Mail'); ok(r.c,'Anmelden schließt Gate'); ok(r.d,'Abmelden öffnet Gate wieder'); ok(r.e,'bestehende Sitzung: kein Gate');
  await ctx.close();
}
// Server nicht erreichbar -> Offline-Knopf
{
  const {ctx,p}=await fresh('de',390);
  ok(await vis(p,'#wdAccountGate'),'offline: Gate sichtbar');
  ok(await vis(p,'#wdAccountGateOffline'),'offline: „Offline weiterspielen" sichtbar');
  await p.click('#wdAccountGateOffline');
  ok(!(await vis(p,'#wdAccountGate')),'offline: Knopf schließt Gate');
  await ctx.close();
}
await b.close(); server.close(); console.log(fails.length?`${fails.length} FEHLER`:'ALLES GRÜN'); process.exit(fails.length?1:0);
