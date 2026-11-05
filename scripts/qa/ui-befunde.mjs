// UI-Befunde vom 04.11.2026 (Menü-Rundgang, Bericht in den Projektdateien „menue-ui-check“).
// Jede Prüfung misst die Anforderung aus dem Bericht, nicht die Umsetzung:
//  1  Ergebnisfenster: Siegerzeile bleibt im Fenster, auch mit 12 breiten Zeichen
//  2  Match Awards: Titel, Name und Wert bleiben in ihrer Karte
//  3  „Nächste Runde“ / „Neue Partie“: Text einzeilig und mittig im Knopf
//  4  Achievement-Hinweis überdeckt das Ergebnisfenster nicht
//  5  Kampagnen-Auswahl: Titel und „x Spieler“ bleiben in der Karte, „x Spieler“ einzeilig
//  6  Kampflog/Infos: Label im Kopfband sitzt wie beim Verlassen-Dialog
//  6b alle Dialoge mit demselben Rahmenbild: Label mittig im Kopfband wie beim Verlassen-Dialog
//  7  Verlassen-Dialog: beide Knöpfe im Rahmen
//  8  Account: „Verbindung“-Wert im Rahmen, Kartenüberschriften frei vom Schmuckstein,
//     ohne Anmeldung kein Text über „dein angemeldetes Konto“
//  9  Spielerprofile: Name einzeilig (mit „…“ falls nötig)
//  10 Spiel vorbereiten: Auswahlfelder je Spieler zeigen ihren Wert ungekürzt
//  11 Kampf: „ist dran“ bleibt bei 12 Zeichen sichtbar
//  12 Duo/Trio: Bannertext im Banner, Teamkasten mit Innenabstand, Auswahlfelder ungekürzt
//  13 Einstellungen: Pfeil aller Auswahlfelder rechtsbündig
//  14 Daily Shop: kein Umbruch mitten im Wort
//  15 Shop ohne Profil: Hinweis mit Kontrast ≥ 4,5:1
//  16 Statistik: Tabellenkopf ≥ 10 px, erste Spalte mit Abstand zum Rand
//  17 „Local-Modus“: Schmuckstein frei vom Wort
//  18 Bildschirmtitel einzeilig
//  19 Testumgebung und Kistentest nur im Entwicklermodus
//  21 Deutsche Texte für „Achievement unlocked“ und die Musik-Beschreibung
// Aufruf: node scripts/qa/ui-befunde.mjs [--breiten 320,360,390,412,1280] [--nur 1,2]
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';
import {chromium} from 'playwright';
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:d;};
const widths=arg('--breiten','320,360,390,412,1280').split(',').map(Number);
const nur=arg('--nur','')?new Set(arg('--nur','').split(',')):null;
const shotDir=arg('--bilder','');if(shotDir)fs.mkdirSync(shotDir,{recursive:true});
const root=process.cwd(),types={js:'text/javascript',css:'text/css',html:'text/html',svg:'image/svg+xml',json:'application/json',webp:'image/webp',png:'image/png'};
const server=createServer((req,res)=>{try{const file=path.join(root,decodeURIComponent(new URL(req.url,'http://x').pathname));let body=fs.readFileSync(file);if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|4[0-3][^"/]*|online\/01-online)\.js[^>]*><\/script>/g,'');res.setHeader('Content-Type',types[file.split('.').pop()]||'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined),args:['--no-sandbox']});
const NAMES=['WWWWWWWWWWWW','Alexandra Kl','Ömer-Çağlarß'];
const failures=[],errors=[],missing=[];
const fail=(w,n,t)=>failures.push(`${w}px #${n}: ${t}`);

// Hilfen im Browser
const HELPERS=()=>{
  window.__qa={
    box:el=>{const b=el.getBoundingClientRect();return {l:b.left,r:b.right,t:b.top,b:b.bottom,w:b.width,h:b.height};},
    // Rechteck des tatsächlich gezeichneten Textes (ohne Polsterung)
    // nur Textknoten: ein Symbolbild neben dem Text ist keine zweite Zeile
    text:el=>{const rs=[];const tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);for(let n=tw.nextNode();n;n=tw.nextNode()){if(!n.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(n);rs.push(...[...r.getClientRects()].filter(x=>x.width>0));}if(!rs.length)return null;const tops=[];for(const x of rs.map(x=>x.top).sort((a,b)=>a-b))if(!tops.length||x-tops[tops.length-1]>4)tops.push(x);return {l:Math.min(...rs.map(x=>x.left)),r:Math.max(...rs.map(x=>x.right)),t:Math.min(...rs.map(x=>x.top)),b:Math.max(...rs.map(x=>x.bottom)),lines:tops.length};},
    inside:(inner,outer,tol=1)=>inner.l>=outer.l-tol&&inner.r<=outer.r+tol&&inner.t>=outer.t-tol&&inner.b<=outer.b+tol,
    shown:el=>{if(!el)return false;const b=el.getBoundingClientRect();if(b.width<1||b.height<1)return false;for(let n=el;n&&n!==document.documentElement;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden')return false;}return true;},
    clipped:el=>el.scrollWidth>el.clientWidth+1
  };
};

async function fresh(width,{profiles=true}={}){
  const ctx=await browser.newContext({locale:'de-DE',viewport:{width,height:width>=1000?800:844},serviceWorkers:'block'});
  const page=await ctx.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',e=>errors.push(`${width}px ${e.message}`));
  page.on('response',r=>{if(r.status()===404)missing.push(r.url());});
  page.on('dialog',d=>d.dismiss().catch(()=>{}));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.fulfill({body:''}));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForFunction(()=>typeof createProfile==='function'&&typeof openMainMenu==='function');
  await page.evaluate(HELPERS);
  if(profiles)await page.evaluate(names=>{const ps=names.map(n=>createProfile(n));ps.forEach(p=>{const c=campaignProgress(p);c.completedEncounters=CAMPAIGN_ENCOUNTERS.slice(0,20).map(e=>e.id);c.unlockedAbilities=[...REAL_ABILITY_IDS];});saveGameData();},NAMES);
  await page.evaluate(()=>openMainMenu(true));await page.waitForTimeout(150);
  return page;
}
const menu=async(page,...sel)=>{await page.evaluate(()=>{document.querySelectorAll('.utility-overlay').forEach(el=>el.classList.add('hidden'));openMainMenu(true);});await page.waitForTimeout(120);for(const s of sel){await page.click(s);await page.waitForTimeout(300);}};

// Lokale Partie mit den drei Profilen (WWW… zuerst) und optionalen Bots
async function startMatch(page,count=3,bots=0){
  await menu(page,'#menuPlayBtn');
  await page.selectOption('#playerCount',String(count));await page.waitForTimeout(200);
  await page.evaluate(({count,bots})=>{for(let i=count-bots;i<count;i++){const b=document.getElementById('botChoice'+i);b.value='hard';b.dispatchEvent(new Event('change',{bubbles:true}));}},{count,bots});
  await page.waitForTimeout(150);
  await page.evaluate(n=>{const ids=[...document.getElementById('profileChoice0').options].map(o=>o.value);for(let i=0;i<n;i++){const s=document.getElementById('profileChoice'+i);s.value=ids[i];s.dispatchEvent(new Event('change',{bubbles:true}));}},count-bots);
  // Würfelt die W25 „Freie Wahl“, wartet der Start auf eine Handauswahl: neu würfeln
  for(let k=0;k<8;k++){await page.click('#rollAbilities');await page.waitForTimeout(250);if(!await page.locator('#startGame').isDisabled())break;}
  if(await page.locator('#startGame').isDisabled())throw new Error('Start gesperrt: '+(await page.textContent('#setupStatus'))+' '+await page.evaluate(()=>[...document.querySelectorAll('#nameInputs select')].map(s=>s.id+'='+s.value).join(' ')));
  await page.click('#startGame');await page.waitForTimeout(700);
}

const checks={
  async 1(page,w){
    await page.evaluate(()=>{ENGINE_LOKALES_DUELL=false;});
    await startMatch(page,3,0);
    // WWW… gewinnt, alle Awards belegt: so breit wie es im Spiel werden kann
    await page.evaluate(()=>{clearBotAutomation();const wi=players.findIndex(x=>x.name==='WWWWWWWWWWWW');roundStats[wi]={...roundStats[wi],damage:36,ones:26,damageTaken:19,sixes:41};players.forEach((x,i)=>{x.hp=i===wi?12:0;});checkWinner();});
    await page.waitForTimeout(1200);
    if(shotDir)await page.screenshot({path:`${shotDir}/${w}-ergebnis.png`});
    const r=await page.evaluate(()=>{const q=__qa,panel=document.querySelector('#winnerBox .round-overlay-panel'),pb=q.box(panel),cs=getComputedStyle(panel);
      const inner={l:pb.l+parseFloat(cs.paddingLeft)*0.5,r:pb.r-parseFloat(cs.paddingRight)*0.5,t:-1e9,b:1e9};
      const wt=document.getElementById('winnerText');
      const out=[];
      if(!q.inside(q.text(wt),inner)||q.clipped(wt))out.push(`Siegerzeile ragt aus dem Fenster (${Math.round(q.text(wt).r)} > ${Math.round(inner.r)})`);
      return out;});
    for(const t of r)fail(w,1,t);
  },
  async 2(page,w){
    const r=await page.evaluate(()=>{const q=__qa,out=[];const cards=[...document.querySelectorAll('#winnerBox .v276-award')];if(cards.length<4)out.push(`nur ${cards.length} Awards`);
      for(const c of cards){const cb=q.box(c);for(const el of c.children){const cs=getComputedStyle(el),t=cs.textOverflow==='ellipsis'&&cs.overflow!=='visible'?q.box(el):q.text(el);if(t&&!q.inside(t,cb))out.push(`„${el.textContent.trim()}“ ragt aus der Award-Karte`);}}return out;});
    for(const t of r)fail(w,2,t);
  },
  async 3(page,w){
    const r=await page.evaluate(()=>{const q=__qa,out=[];for(const id of ['nextRoundPrepBtn','restartBtn']){const b=document.getElementById(id);if(!q.shown(b))continue;const t=q.text(b),bb=q.box(b);if(!t)continue;if(t.lines>1)out.push(`${b.textContent.trim()}: ${t.lines} Zeilen`);if(!q.inside(t,bb))out.push(`${b.textContent.trim()}: Text außerhalb des Knopfs`);const mid=(t.t+t.b)/2,bm=(bb.t+bb.b)/2;if(Math.abs(mid-bm)>4)out.push(`${b.textContent.trim()}: Text ${Math.round(mid-bm)}px außermittig`);}return out;});
    for(const t of r)fail(w,3,t);
  },
  async 4(page,w){
    await page.evaluate(()=>{enqueueAchievementToast({name:'WWWWWWWWWWWW',tagNumber:'1234'},{name:'Dual Wielding',rewardDice:null});});
    await page.waitForTimeout(900);
    const r=await page.evaluate(()=>{const q=__qa,t=document.querySelector('#achievementToastLayer .achievement-toast');if(!t)return ['kein Hinweis sichtbar'];const a=q.box(t);
      // Kopfband, Siegerzeile und Ergebnistext müssen frei bleiben
      const hits=['#winnerBox .round-overlay-kicker','#winnerText','#roundResultText','#nextRoundPrepBtn','#restartBtn'].map(s=>document.querySelector(s)).filter(q.shown).filter(el=>{const b=q.box(el);return !(b.r<=a.l||b.l>=a.r||b.b<=a.t||b.t>=a.b);}).map(el=>el.id||el.className);
      return hits.length?[`Hinweis überdeckt ${hits.join(', ')}`]:[];});
    for(const t of r)fail(w,4,t);
    if(shotDir)await page.screenshot({path:`${shotDir}/${w}-ergebnis-hinweis.png`});
  },
  async 5(page,w){
    await menu(page,'#menuCampaignBtn');
    const r=await page.evaluate(()=>{const q=__qa,out=[];for(const b of document.querySelectorAll('.campaign-mode-choice')){const bb=q.box(b);for(const el of b.querySelectorAll('strong,span')){const t=q.text(el);if(t&&!q.inside(t,bb))out.push(`„${el.textContent}“ ragt aus der Karte`);if(el.tagName==='SPAN'&&t&&t.lines>1)out.push(`„${el.textContent}“ bricht um`);}}return out;});
    for(const t of r)fail(w,5,t);
    if(shotDir)await page.screenshot({path:`${shotDir}/${w}-kampagnen-auswahl.png`});
  },
  async 6(page,w){
    await startMatch(page,3,1);
    await page.evaluate(()=>clearBotAutomation());
    const kick=async(open,id)=>{await page.click(open);await page.waitForTimeout(450);const v=await page.evaluate(id=>{const o=document.getElementById(id),p=o.querySelector('.utility-panel'),k=o.querySelector('.utility-kicker');const t=__qa.text(k);return {top:Math.round((t.t+t.b)/2-__qa.box(p).t)};},id);return v;};
    const log=await kick('button:visible:has-text("Kampflog")','battleSheetOverlay');
    if(shotDir)await page.screenshot({path:`${shotDir}/${w}-kampflog.png`});
    await page.click('#battleSheetCloseBtn');await page.waitForTimeout(250);
    const quit=await kick('button:visible:has-text("Hauptmenü")','quitModal');
    if(shotDir)await page.screenshot({path:`${shotDir}/${w}-verlassen.png`});
    if(Math.abs(log.top-quit.top)>2)fail(w,6,`Kampflog-Label ${log.top}px unter Oberkante, Verlassen-Dialog ${quit.top}px`);
    const r=await page.evaluate(()=>{const q=__qa,o=document.getElementById('quitModal'),pn=o.querySelector('.utility-panel'),cs=getComputedStyle(pn),bb=q.box(pn),inset=parseFloat(cs.borderLeftWidth)+parseFloat(cs.paddingLeft),p={...bb,l:bb.l+inset,r:bb.r-inset};return [...o.querySelectorAll('button')].filter(q.shown).filter(b=>!q.inside(q.box(b),p)).map(b=>`Knopf „${b.textContent.trim()}“ ragt aus dem Dialog`);});
    for(const t of r)fail(w,7,t);
    await page.evaluate(()=>document.getElementById('quitModal').classList.add('hidden'));
  },
  async '6b'(page,w){
    // Jeder Dialog mit dem Rahmenbild modal-popup: Labelmitte auf derselben Höhe wie beim Verlassen-Dialog
    const ids=await page.evaluate(()=>[...document.querySelectorAll('.utility-overlay,.round-overlay,[id$=Modal]')].map(e=>e.id).filter(Boolean));
    const res={};
    for(const id of ids){
      await page.evaluate(id=>{document.querySelectorAll('.utility-overlay,.round-overlay,[id$=Modal]').forEach(e=>e.classList.add('hidden'));document.getElementById(id).classList.remove('hidden');},id);
      await page.waitForTimeout(120);
      const m=await page.evaluate(id=>{const o=document.getElementById(id),k=o.querySelector('[class*="kicker"]');if(!k||!__qa.shown(k))return null;const pn=k.parentElement;if(!/modal-popup/.test(getComputedStyle(pn).borderImageSource))return null;const t=__qa.text(k);if(!t)return null;return (t.t+t.b)/2-__qa.box(pn).t;},id);
      if(m!=null)res[id]=m;
    }
    await page.evaluate(()=>document.querySelectorAll('.utility-overlay,.round-overlay,[id$=Modal]').forEach(e=>e.classList.add('hidden')));
    const ref=res.quitModal;if(ref==null){fail(w,'6b','Verlassen-Dialog nicht gemessen');return;}
    for(const [id,m] of Object.entries(res))if(Math.abs(m-ref)>2)fail(w,'6b',`${id}: Label ${Math.round(m)}px statt ${Math.round(ref)}px unter Oberkante`);
  },
  async 11(page,w){
    // „ist dran“ mit 12 Zeichen, auch bei acht Karten
    await startMatch(page,3,0);await page.evaluate(()=>clearBotAutomation());
    // Anforderung: „ist dran“ ist ganz zu sehen (der Name darf mit „…“ enden)
    const r=await page.evaluate(()=>{const tl=document.getElementById('turnLine'),t=tl.textContent,lb=__qa.box(tl);const walker=document.createTreeWalker(tl,NodeFilter.SHOW_TEXT);let ok=false;for(let n=walker.nextNode();n;n=walker.nextNode()){const i=n.data.indexOf('ist dran');if(i<0)continue;const rg=document.createRange();rg.setStart(n,i);rg.setEnd(n,i+8);const b=rg.getBoundingClientRect();let vis=b.width>0&&b.right<=lb.r+0.5;for(let e=n.parentElement;e&&e!==tl.parentElement;e=e.parentElement){const eb=e.getBoundingClientRect();if(getComputedStyle(e).overflow!=='visible'&&b.right>eb.right+0.5)vis=false;}ok=vis;}return {t,ok};});
    if(!r.ok)fail(w,11,`„ist dran“ in „${r.t}“ nicht ganz sichtbar`);
    if(shotDir)await page.screenshot({path:`${shotDir}/${w}-kampf.png`});
  },
  async 8(page,w){
    await menu(page,'#menuAccountBtn');
    if(shotDir)await page.screenshot({path:`${shotDir}/${w}-account.png`,fullPage:true});
    const r=await page.evaluate(()=>{const q=__qa,out=[],s=document.getElementById('accountScreen');
      for(const row of s.querySelectorAll('.cloud-status-row,.account-status-row,[class*="status"] dd,[class*="status-value"]')){}
      // jeder sichtbare Text bleibt in seiner Karte
      for(const card of s.querySelectorAll('.cloud-card,.cloud-status-card,.menu-info-card')){if(!q.shown(card))continue;const ob=q.box(card),ccs=getComputedStyle(card),ix=parseFloat(ccs.borderLeftWidth)+parseFloat(ccs.paddingLeft)/2,cb={...ob,l:ob.l+ix,r:ob.r-ix};for(const el of card.querySelectorAll('*')){if(!q.shown(el)||![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;const t=q.text(el);if(t&&!q.inside(t,cb,0))out.push(`„${el.textContent.trim().slice(0,40)}“ ragt aus der Karte`);}
        // Schmuckstein oben mittig: Überschrift darf nicht hineinragen
        const head=card.querySelector('.cloud-card-title,:scope > strong');if(head&&q.shown(head)){const t=q.text(head),cx=(cb.l+cb.r)/2;if(t&&t.t<cb.t+30&&t.l<cx+14&&t.r>cx-14)out.push(`Überschrift „${head.textContent.trim()}“ liegt unter dem Schmuckstein`);}}
      if(/dein angemeldetes Konto ist/i.test(s.innerText)&&/bitte mit einem Hauptkonto anmelden/i.test(s.innerText))out.push('widersprüchlicher Text: angemeldetes Konto ohne Anmeldung');
      return [...new Set(out)];});
    for(const t of r)fail(w,8,t);
  },
  async 9(page,w){
    await menu(page,'#menuProfilesBtn');
    const r=await page.evaluate(()=>{const q=__qa,out=[];for(const el of document.querySelectorAll('#profilesScreen .profile-name, #profilesScreen .profile-card-name, #profilesScreen [class*="profile"] [class*="name"]')){if(!q.shown(el))continue;const t=q.text(el);if(t&&t.lines>1&&el.textContent.trim().length<=13)out.push(`„${el.textContent.trim()}“ in ${t.lines} Zeilen`);}return [...new Set(out)];});
    for(const t of r)fail(w,9,t);
    if(shotDir)await page.screenshot({path:`${shotDir}/${w}-profile.png`});
  },
  async 10(page,w){
    await menu(page,'#menuPlayBtn');
    if(shotDir)await page.screenshot({path:`${shotDir}/${w}-vorbereitung.png`,fullPage:true});
    const r=await page.evaluate(()=>{const q=__qa,out=[];for(const sel of document.querySelectorAll('#setup select')){const shell=sel.closest('.dd-select,.dd-select-shell,label,.setup-field')||sel.parentElement;const shown=[...shell.querySelectorAll('*')].find(e=>q.shown(e)&&e!==sel&&e.textContent.trim()&&!e.children.length&&e.tagName!=='OPTION');const label=shown||sel;if(label!==sel&&(q.clipped(label)||getComputedStyle(label).textOverflow==='ellipsis'&&label.scrollWidth>label.clientWidth))out.push(`Auswahl ${sel.id||sel.className}: „${sel.options[sel.selectedIndex]?.text}“ gekürzt`);}return out;});
    for(const t of r)fail(w,10,t);
  },
  async 12(page,w){
    for(const m of ['Duo','Trio']){
      await menu(page,'#menuCampaignBtn',`#campaignMode${m}Btn`);
      if(shotDir)await page.screenshot({path:`${shotDir}/${w}-${m}.png`});
      const r=await page.evaluate(m=>{const q=__qa,out=[],s=[...document.querySelectorAll('section')].find(x=>q.shown(x)&&/Campaign/.test(x.id));
        // Welt-Banner: jeder Text innerhalb der gemalten Fläche; die Goldschiene nimmt oben 14 %, unten mit dem Edelstein 26 % der Höhe
        for(const b of s.querySelectorAll('.campaign-world-desc')){if(!q.shown(b))continue;const ob=q.box(b),bb={...ob,t:ob.t+ob.h*0.14,b:ob.b-ob.h*0.26};for(const el of b.querySelectorAll('*')){if(!q.shown(el)||![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;const t=q.text(el);if(t&&!q.inside(t,bb,0))out.push(`${m}: Bannertext „${el.textContent.trim().slice(0,30)}“ läuft aus dem Banner`);}}
        // Teamzeile: Abstand zum Goldrahmen wie die Kartenüberschrift „Team“ (mindestens 14 px)
        for(const el of s.querySelectorAll('[id$="TeamSummary"]')){if(!q.shown(el))continue;const card=el.closest('.menu-info-card'),cb=q.box(card),t=q.text(el);if(t&&t.l-cb.l<14)out.push(`${m}: Teamtext ${Math.round(t.l-cb.l)}px vom Rand`);}
        for(const sel of s.querySelectorAll('select')){if(!q.shown(sel.parentElement))continue;const label=[...sel.parentElement.querySelectorAll('*')].find(e=>q.shown(e)&&e!==sel&&!e.children.length&&e.textContent.trim()&&e.tagName!=='OPTION');if(label&&q.clipped(label))out.push(`${m}: Auswahl „${sel.options[sel.selectedIndex]?.text}“ gekürzt`);}
        return [...new Set(out)];},m);
      for(const t of r)fail(w,12,t);
    }
  },
  async 13(page,w){
    await menu(page,'#menuSettingsBtn');
    // Der Pfeil sitzt in der letzten Spalte: das Textfeld nimmt die Mittelspalte ein und
    // ist damit überall gleich breit. Ohne Symbol rutschte „An“ in die 34-px-Symbolspalte
    // und der Pfeil direkt dahinter.
    const r=await page.evaluate(()=>[...document.querySelectorAll('#settingsScreen .dd-select-trigger')].filter(__qa.shown).map(t=>{const sp=t.querySelector(':scope>span');return {id:t.previousElementSibling?.id,gap:Math.round(__qa.box(t).r-__qa.box(sp).r)};}));
    const min=Math.min(...r.map(x=>x.gap));
    for(const x of r)if(x.gap>min+4)fail(w,13,`Auswahl ${x.id}: Textfeld endet ${x.gap}px vor dem Rand statt ${min}px, Pfeil sitzt am Wort`);
  },
  async 14(page,w){
    await menu(page,'#menuPrestigeShopBtn');await page.locator('#prestigeShopScreen button:has-text("Daily")').first().click();await page.waitForTimeout(500);
    const r=await page.evaluate(()=>{const q=__qa,out=[];for(const el of document.querySelectorAll('#prestigeShopScreen *')){if(!q.shown(el)||el.children.length)continue;const txt=el.textContent.trim();if(!txt)continue;const range=document.createRange();const node=el.firstChild;if(!node||node.nodeType!==3)continue;
      // Zeilen einzeln: endet eine Zeile mitten in einem Wort?
      let prevTop=null;for(let i=0;i<node.length;i++){range.setStart(node,i);range.setEnd(node,i+1);const rr=range.getBoundingClientRect();if(!rr.width)continue;if(prevTop!==null&&Math.round(rr.top)>prevTop+2){const before=node.data[i-1],cur=node.data[i];if(/[\p{L}]/u.test(before)&&/[\p{L}]/u.test(cur))out.push(`„${txt}“ bricht mitten im Wort um`);}prevTop=Math.round(rr.top);}}
      return [...new Set(out)];});
    for(const t of r)fail(w,14,t);
  },
  async 15(page,w){
    const p=await fresh(w,{profiles:false});
    await menu(p,'#menuPrestigeShopBtn');
    const r=await p.evaluate(()=>{const has=x=>/Erstelle zuerst ein Profil/.test(x.textContent);const el=[...document.querySelectorAll('#prestigeShopScreen *')].find(x=>__qa.shown(x)&&has(x)&&![...x.children].some(has));if(!el)return null;
      const col=s=>{const v=s.match(/[\d.]+/g).map(Number);return v.length<4?[...v,1]:v;};const lum=([r,g,b])=>{const c=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
      // Hintergrund: halbtransparente Flächen über dem Elfenbein der Bildschirmkarte zusammenrechnen
      const layers=[];for(let n=el;n&&!n.classList.contains('screen-card');n=n.parentElement){const v=col(getComputedStyle(n).backgroundColor);if(v[3]>0)layers.unshift(v);}
      let bg=[244,236,222];for(const [r,g,b,a] of layers)bg=[r*a+bg[0]*(1-a),g*a+bg[1]*(1-a),b*a+bg[2]*(1-a)];
      const fg=col(getComputedStyle(el).color),L1=lum(fg),L2=lum(bg);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);});
    if(r===null)fail(w,15,'Hinweis „Erstelle zuerst ein Profil“ nicht gefunden');
    if(r!==null&&r<4.5)fail(w,15,`Hinweis „Erstelle zuerst ein Profil“ Kontrast ${r.toFixed(2)}:1`);
    // 16 Statistik ohne Profil
    await menu(p,'#menuStatsBtn');
    const s=await p.evaluate(()=>{const q=__qa,out=[];const head=[...document.querySelectorAll('#statsScreen .ability-stat-row.header')].find(q.shown);if(!head)return ['Fähigkeiten-Tabelle nicht gefunden'];const cells=[...head.children];const fs=Math.min(...cells.map(c=>parseFloat(getComputedStyle(c).fontSize)));if(fs<10)out.push(`Tabellenkopf ${fs}px`);const hb=q.box(head),t=q.text(cells[0]);if(t&&t.l-hb.l<8)out.push(`erste Spalte ${Math.round(t.l-hb.l)}px vom Rand`);return out;});
    for(const t of s)fail(w,16,t);
    // 17 Local-Modus
    await menu(p,'#menuPlayBtn');
    const l=await p.evaluate(()=>{const q=__qa,lab=document.querySelector('label[for="localModeSelect"]');const card=lab.closest('.local-mode-card');const t=q.text([...lab.childNodes].find(n=>n.nodeType===3)?lab:lab);const cb=q.box(card),cx=(cb.l+cb.r)/2;
      // Stein sitzt mittig an der Oberkante der Karte (Pseudo-Element); das Wort darf die Mitte nicht kreuzen, wenn es oben anliegt
      const range=document.createRange();const node=[...lab.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());range.selectNodeContents(node);const rb=range.getBoundingClientRect();return rb.top<cb.t+20&&rb.left<cx+14&&rb.right>cx-14?`„Local-Modus“ liegt unter dem Schmuckstein`:null;});
    if(l)fail(w,17,l);
    await p.context().close();
  },
  async 18(page,w){
    const ids=[['setup','#menuPlayBtn'],['campaignScreen','#menuCampaignBtn','#campaignModeSoloBtn'],['duoCampaignScreen','#menuCampaignBtn','#campaignModeDuoBtn'],['trioCampaignScreen','#menuCampaignBtn','#campaignModeTrioBtn'],['abilitiesScreen','#menuRulesBtn','#allAbilitiesBtn']];
    for(const [id,...how] of ids){await menu(page,...how);const n=await page.evaluate(id=>{const h=document.querySelector(`#${id} .screen-topbar h2`);return __qa.text(h)?.lines;},id);if(n>1)fail(w,18,`Titel in ${id} bricht in ${n} Zeilen um`);}
  },
  async 19(page,w){
    await menu(page,'#menuTutorialBtn');
    const r=await page.evaluate(()=>['tutorialHubLabBtn','menuKistenTestBtn'].filter(id=>__qa.shown(document.getElementById(id))));
    for(const id of r)fail(w,19,`${id} ist ohne Entwicklermodus sichtbar`);
    // Mit Entwicklermodus wieder da
    await page.evaluate(()=>window.WDEntwickler?.setzen(true));
    const an=await page.evaluate(()=>['tutorialHubLabBtn','menuKistenTestBtn'].filter(id=>__qa.shown(document.getElementById(id))));
    if(an.length!==2)fail(w,19,'Entwicklermodus zeigt Testumgebung und Kistentest nicht');
    await page.evaluate(()=>window.WDEntwickler?.setzen(false));
    await page.evaluate(()=>document.getElementById('tutorialHubModal').classList.add('hidden'));
  },
  async 21(page,w){
    const r=await page.evaluate(()=>{const out=[];enqueueAchievementToast({name:'X',tagNumber:'1'},{name:'Y'});const k=document.querySelector('.achievement-toast-kicker');if(k&&/ACHIEVEMENT UNLOCKED/i.test(k.textContent))out.push('„ACHIEVEMENT UNLOCKED“ im deutschen Spiel');if(/Procedural Soundtrack/.test(document.getElementById('settingsScreen').textContent))out.push('„Procedural Soundtrack“ im deutschen Spiel');return out;});
    for(const t of r)fail(w,21,t);
  }
};

const ORDER=['1','2','3','4','5','6','6b','8','9','10','11','12','13','14','15','18','19','21'];
try{
  for(const w of widths){
    let page=await fresh(w);
    for(const n of ORDER){
      if(nur&&!nur.has(n)&&!(n==='15'&&(nur.has('16')||nur.has('17')))&&!(n==='6'&&nur.has('7')))continue;
      // 2–4 brauchen das Ergebnisfenster aus 1
      if(['2','3','4'].includes(n)&&nur&&!nur.has('1')){await checks['1'](page,w);}
      try{await checks[n](page,w);}catch(e){fail(w,n,'Prüfung abgebrochen: '+e.message.split('\n')[0]);}
      if(n==='4'){await page.context().close();page=await fresh(w);}
    }
    await page.context().close();
  }
}finally{await browser.close();server.close();}
if(failures.length)console.error(failures.join('\n')+`\n\n${failures.length} Abweichungen`);
assert.deepEqual(failures,[],'UI-Befunde');
assert.deepEqual(errors,[],'JS-Fehler');
assert.deepEqual(missing,[],'404');
console.log(`UI-Befunde: ${ORDER.length} Prüfungen × ${widths.length} Breiten ohne Abweichung.`);
