// UI-Konsistenz der Menübildschirme: jede Übersicht wird gegen alle anderen gemessen.
// Anforderung vor Umsetzung (Befundliste 05.10., vom Nutzer am 19.10. vollständig bestätigt):
//  1  Texte lesbar: Kontrast Schrift/Hintergrund am gerenderten Bild mindestens 3:1
//  2  BETA-Abzeichen lesbar (Bild mindestens 40×20 px wie im Hauptmenü)
//  3/4 Kein Element ragt aus der Inhaltsspalte (außer in seitlich scrollenden Leisten);
//      der Text des Welt-Banners bleibt innerhalb der gemalten Innenfläche
//  5  gleicher Innenabstand links/rechts auf allen Bildschirmen
//  6  Kopfzeile überall gleich: Position, Höhe, Titelgröße, Titelschrift
//  7  jeder Titel trägt ein Titel-Icon
//  8  überall derselbe Zurück-Knopf (Pfeil)
//  9  Untertitel überall sichtbar, gleiche Farbe und Größe
//  10 kein Auswahlfeld zeigt den Pfeil als linkes Icon
//  11 kein Rechteck hinter einem Rahmenbild (Volltonfarbe oder Kastenschatten)
//  12 Kampagnen-Auswahl ohne leeres Banner
//  13 Kartenüberschriften auf hellen Karten: dieselbe Serifenschrift und Farbe wie der Titel
//  14 keine Technikbegriffe in den Spielertexten von Account und Online
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {chromium} from 'playwright';

const root=process.cwd(),errors=[],missing=[],failures=[];
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{
  try{
    const file=path.join(root,decodeURIComponent(new URL(req.url,'http://x').pathname));
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    res.end(fs.readFileSync(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));

// Wie ein Spieler hineinkommt; Online wird ohne Netz direkt eingeblendet,
// weil das Online-Modul seine Bibliothek vom CDN lädt.
const SCREENS=[
  ['setup',['#menuPlayBtn']],
  ['onlineScreen','online'],
  ['campaignScreen',['#menuCampaignBtn','#campaignModeSoloBtn']],
  ['duoCampaignScreen',['#menuCampaignBtn','#campaignModeDuoBtn']],
  ['trioCampaignScreen',['#menuCampaignBtn','#campaignModeTrioBtn']],
  ['profilesScreen',['#menuProfilesBtn']],
  ['accountScreen',['#menuAccountBtn']],
  ['achievementsScreen',['#menuAchievementsBtn']],
  ['prestigeShopScreen',['#menuPrestigeShopBtn']],
  ['statsScreen',['#menuStatsBtn']],
  ['settingsScreen',['#menuSettingsBtn']],
  ['rulesScreen',['#menuRulesBtn']],
  ['abilitiesScreen',['#menuRulesBtn','#allAbilitiesBtn']],
  ['changelogScreen',['#menuChangelogBtn']]
];
const CARD_HEADINGS=['#rulesScreen .menu-info-card > strong','#settingsScreen .setting-label','.online-card-title','.cloud-card-title','.cloud-status-card > strong','.changelog-version','.ability-list-head > span:last-child'];
const JARGON=/Supabase|LOCAL MOCK|Realtime|autoritativ|authoritative|Publishable|Backend|Projekt-URL|project URL/i;

const fail=(where,text)=>failures.push(`${where}: ${text}`);

async function openScreen(page,id,how){
  // openMainMenu kennt den Online-Bildschirm nicht; den schließt sonst sein eigener Zurück-Knopf.
  await page.evaluate(()=>{document.querySelectorAll('.utility-overlay').forEach(el=>el.classList.add('hidden'));document.getElementById('onlineScreen').classList.add('hidden');openMainMenu(true);});
  await page.waitForTimeout(150);
  if(how==='online'){
    await page.evaluate(()=>{hideFrontScreens();document.getElementById('mainMenu').classList.add('hidden');document.getElementById('onlineScreen').classList.remove('hidden');});
  }else for(const selector of how){await page.click(selector);await page.waitForTimeout(250);}
  await page.waitForFunction(id=>{const el=document.getElementById(id);return el&&!el.classList.contains('hidden')&&el.offsetParent!==null;},id);
  await page.waitForTimeout(450);
}

function luminance([r,g,b]){
  const c=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;});
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
}

async function measure(page,id){
  return page.evaluate(async({id,CARD_HEADINGS,jargon})=>{
    const JARGON=new RegExp(jargon,"i");
    const s=document.getElementById(id),st=getComputedStyle(s),sb=s.getBoundingClientRect();
    const rect=el=>{const b=el.getBoundingClientRect();return {x:b.left,y:b.top,w:b.width,h:b.height,r:b.right,b:b.bottom};};
    const shown=el=>{if(!el)return false;const b=el.getBoundingClientRect();if(!b.width||!b.height)return false;for(let n=el;n&&n!==document.body;n=n.parentElement){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.5)return false;}return true;};
    const bar=s.querySelector('.screen-topbar'),back=bar?.querySelector(':scope > button'),title=bar?.querySelector('h2'),icon=bar?.querySelector('.screen-title-icon');
    const sub=[...s.querySelectorAll('.screen-subtitle,.setup-intro')].find(el=>el.closest('section')===s);
    const L=sb.left+parseFloat(st.paddingLeft)+parseFloat(st.borderLeftWidth),R=sb.right-parseFloat(st.paddingRight)-parseFloat(st.borderRightWidth);
    const scrollerX=el=>{for(let n=el.parentElement;n&&n!==s;n=n.parentElement){const ox=getComputedStyle(n).overflowX;if(ox==='auto'||ox==='scroll')return true;}return false;};
    const overhang=[];
    for(const el of s.querySelectorAll('*')){
      if(el.ownerSVGElement||!shown(el)||scrollerX(el))continue;
      const cs=getComputedStyle(el);
      const b=el.getBoundingClientRect();
      // kleine Zierelemente (Edelsteine, Ecken) dürfen auf der Kante sitzen
      if((cs.position==='absolute'||cs.position==='fixed')&&b.width<48)continue;
      if(el.closest('.dd-select-picker,.utility-overlay'))continue;
      if(b.left<L-1.5||b.right>R+1.5){
        if(overhang.some(o=>o.el.contains(el)))continue;
        overhang.push({el,text:`${el.tagName.toLowerCase()}${el.id?'#'+el.id:''}.${[...el.classList].join('.')} ${Math.round(b.left)}–${Math.round(b.right)} (Spalte ${Math.round(L)}–${Math.round(R)}) „${el.textContent.trim().slice(0,24)}“`});
      }
    }
    const bannerSpill=[...s.querySelectorAll('.campaign-world-desc')].filter(shown).flatMap(banner=>{
      const r=banner.getBoundingClientRect();
      const top=r.top+r.height*0.11,bottom=r.bottom-r.height*0.14,left=r.left+r.width*0.052,right=r.right-r.width*0.052;
      return [...banner.querySelectorAll('.campaign-world-banner-copy > *')].filter(shown).filter(el=>{
        const range=document.createRange();range.selectNodeContents(el);const b=range.getBoundingClientRect();
        return b.top<top-1||b.bottom>bottom+1||b.left<left-1||b.right>right+1;
      }).map(el=>el.textContent.trim().slice(0,30));
    });
    const headings=CARD_HEADINGS.flatMap(sel=>[...s.querySelectorAll(sel)].filter(shown).slice(0,2).map(el=>({sel,font:getComputedStyle(el).fontFamily,color:getComputedStyle(el).color})));
    const leftChevrons=[...s.querySelectorAll('.dd-trigger-icon')].filter(shown).filter(img=>/chevron-down/.test(img.getAttribute('src')||'')).map(img=>img.closest('label,.setting-row,div')?.textContent.trim().slice(0,30));
    const badge=s.querySelector('.online-beta-badge');
    const jargonText=(id==='accountScreen'||id==='onlineScreen')?[...s.querySelectorAll('*')].filter(el=>shown(el)&&[...el.childNodes].some(n=>n.nodeType===3&&JARGON.test(n.nodeValue))).map(el=>el.textContent.trim().slice(0,60)):[];
    // Ein Rechteck zeichnet sich nur ab, wenn das Rahmenbild transparente Ränder hat:
    // dann liegen Kastenschatten und Volltonfarbe außerhalb der gemalten Kante.
    const marginCache=window.__uiQaMargins||(window.__uiQaMargins={});
    const hasMargin=async src=>{
      if(src in marginCache)return marginCache[src];
      const url=src.replace(/^url\("?|"?\)$/g,'');
      const img=new Image();img.src=url;
      try{await img.decode();}catch{return marginCache[src]=false;}
      const c=new OffscreenCanvas(img.naturalWidth,img.naturalHeight),x=c.getContext('2d');x.drawImage(img,0,0);
      const a=(px,py)=>x.getImageData(px,py,1,1).data[3];
      return marginCache[src]=a(1,img.naturalHeight>>1)<128||a(img.naturalWidth>>1,1)<128||a(img.naturalWidth-2,img.naturalHeight>>1)<128;
    };
    const opaqueCards=[];
    for(const el of s.querySelectorAll('*')){
      if(!shown(el))continue;
      const cs=getComputedStyle(el);
      if(cs.borderImageSource==='none')continue;
      if(/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)&&cs.boxShadow==='none')continue;
      if(await hasMargin(cs.borderImageSource))opaqueCards.push('.'+[...el.classList].join('.')+' '+cs.borderImageSource.replace(/.*\/([^/?]+)\?.*/,'$1'));
    }
    return {
      pad:[parseFloat(st.paddingLeft),parseFloat(st.paddingRight)],
      bar:bar&&rect(bar),back:back&&{...rect(back),img:getComputedStyle(back).backgroundImage.replace(/.*\/([^/?]+)\?.*/,'$1')},
      title:title&&{...rect(title),size:getComputedStyle(title).fontSize,font:getComputedStyle(title).fontFamily,color:getComputedStyle(title).color},
      icon:shown(icon),
      sub:sub&&shown(sub)?{size:getComputedStyle(sub).fontSize,color:getComputedStyle(sub).color}:null,
      overhang:overhang.map(o=>o.text).slice(0,5),
      bannerSpill,headings,leftChevrons,jargonText,opaqueCards,
      badge:badge&&{w:(badge.querySelector('img')||badge).getBoundingClientRect().width,h:(badge.querySelector('img')||badge).getBoundingClientRect().height}
    };
  },{id,CARD_HEADINGS,jargon:JARGON.source});
}

// Kontrast am gerenderten Bild: Median der Hintergrundpixel im Textkasten gegen die Schriftfarbe.
async function contrast(page,id){
  const scroller=await page.evaluate(id=>{
    const s=document.getElementById(id);
    const c=[s,...s.querySelectorAll('*')].find(el=>el.scrollHeight>el.clientHeight+20&&/auto|scroll/.test(getComputedStyle(el).overflowY));
    if(c)c.dataset.uiQaScroller='1';
    return c?Math.min(2,Math.floor(c.scrollHeight/c.clientHeight)):0;
  },id);
  const bad=[];
  for(let step=0;step<=scroller;step++){
    if(step)await page.evaluate(()=>{const c=document.querySelector('[data-ui-qa-scroller]');c.scrollTo({top:c.clientHeight*0.85*(Number(c.dataset.step||0)+1),behavior:'instant'});c.dataset.step=String(Number(c.dataset.step||0)+1);});
    // Bildschirmwechsel blenden über Animationen ein; erst das ruhige Bild messen.
    await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().endTime!==Infinity).map(a=>a.finished.catch(()=>{}))));
    await page.waitForTimeout(150);
    const shot=(await page.screenshot()).toString('base64');
    const found=await page.evaluate(async({id,shot})=>{
      const s=document.getElementById(id);
      const img=new Image();img.src='data:image/png;base64,'+shot;await img.decode();
      const scale=img.width/innerWidth;
      const canvas=new OffscreenCanvas(img.width,img.height),ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
      const out=[];
      // Text, der gerade unter die Rahmenkante gescrollt ist, zählt nicht.
      const ss=getComputedStyle(s),sr=s.getBoundingClientRect();
      const frameTop=sr.top+parseFloat(ss.borderTopWidth),frameBottom=sr.bottom-parseFloat(ss.borderBottomWidth);
      const shown=el=>{for(let n=el;n&&n!==document.body;n=n.parentElement){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.9)return false;}return true;};
      for(const el of s.querySelectorAll('*')){
        if(!['STRONG','SPAN','DIV','LABEL','SMALL','P','H2','H3','LI','B','BUTTON'].includes(el.tagName))continue;
        const textNode=[...el.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim().length>1);
        if(!textNode)continue;
        if(el.closest('button:disabled,[aria-disabled="true"],.locked,.dd-select-picker,.utility-overlay'))continue;
        // gemessen wird der Kasten des Textes selbst, nicht der ganze Container (Label samt Feld)
        const range=document.createRange();range.selectNodeContents(textNode);
        const b=range.getBoundingClientRect();
        if(b.width<8||b.height<8||b.top<frameTop||b.bottom>frameBottom||b.left<0||b.right>innerWidth)continue;
        if(!shown(el))continue;
        // verdeckter Text (z. B. unter einer festen Knopfleiste) wird dort gemessen, wo er sichtbar ist
        const top=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
        if(!top||!(el.contains(top)||top.contains(el)))continue;
        const cs=getComputedStyle(el);
        const m=cs.color.match(/[\d.]+/g).map(Number);
        if(m.length>3&&m[3]<0.3)continue;
        const data=ctx.getImageData(Math.round(b.left*scale),Math.round(b.top*scale),Math.max(1,Math.round(b.width*scale)),Math.max(1,Math.round(b.height*scale))).data;
        const lums=[];
        for(let i=0;i<data.length;i+=16)lums.push([data[i],data[i+1],data[i+2]]);
        out.push({text:textNode.nodeValue.trim().slice(0,32),color:m.slice(0,3),px:lums});
      }
      return out;
    },{id,shot});
    for(const item of found){
      const fg=luminance(item.color);
      const bgs=item.px.map(luminance).sort((a,b)=>a-b);
      // Hintergrund = das Ende der Helligkeitsverteilung, das von der Schrift weiter weg liegt
      // (bei kleiner fetter Schrift ist der Median schon Schriftfarbe).
      const lo=bgs[Math.floor(bgs.length*0.15)],hi=bgs[Math.floor(bgs.length*0.85)];
      const bg=Math.abs(hi-fg)>Math.abs(lo-fg)?hi:lo;
      const ratio=(Math.max(fg,bg)+0.05)/(Math.min(fg,bg)+0.05);
      if(ratio<3)bad.push(`„${item.text}“ ${ratio.toFixed(2)}:1`);
    }
  }
  await page.evaluate(()=>{const c=document.querySelector('[data-ui-qa-scroller]');if(c){c.scrollTo({top:0,behavior:'instant'});delete c.dataset.uiQaScroller;delete c.dataset.step;}});
  return [...new Set(bad)];
}

let browser;
try{
  browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined),args:['--no-sandbox']});
  const widths=(process.env.UI_QA_WIDTHS||'320,360,390,412,1280').split(',').map(Number);
  const locales=(process.env.UI_QA_LOCALES||'de-DE,en-US').split(',');
  for(const locale of locales)for(const width of widths){
    const page=await browser.newPage({viewport:{width,height:844},locale,serviceWorkers:'block'});
    page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()===404)missing.push(response.url());});
    await page.route(/\/js\/(?:backend-config|41-supabase-core|42-supabase-account|43-supabase-battle|online\/01-online)\.js/,route=>route.fulfill({contentType:'text/javascript',body:''}));
    await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.fulfill({body:''}));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.waitForFunction(()=>typeof createProfile==='function'&&typeof openMainMenu==='function');
    await page.evaluate(()=>{createProfile('Prüfung 1');createProfile('Prüfung 2');});
    const tag=`${locale}/${width}`;
    const all={};
    for(const [id,how] of SCREENS){
      await openScreen(page,id,how);
      const m=await measure(page,id);
      all[id]=m;
      const at=`${tag} ${id}`;
      if(!m.icon)fail(at,'Titel ohne Icon');
      if(!m.sub)fail(at,'Untertitel fehlt');
      if(m.back?.img!=='back-button.webp')fail(at,`Zurück-Knopf ${m.back?.img}`);
      for(const text of m.overhang)fail(at,`ragt aus der Spalte: ${text}`);
      for(const h of m.headings){
        if(!/Georgia/.test(h.font))fail(at,`Kartenüberschrift ${h.sel} Schrift ${h.font}`);
        if(h.color!==m.title.color)fail(at,`Kartenüberschrift ${h.sel} Farbe ${h.color} statt ${m.title.color}`);
      }
      for(const text of m.bannerSpill)fail(at,`Text läuft aus dem Welt-Banner: „${text}“`);
      for(const text of m.leftChevrons)fail(at,`Pfeil als Icon im Auswahlfeld „${text}“`);
      for(const text of m.jargonText)fail(at,`Technikbegriff: „${text}“`);
      for(const text of m.opaqueCards)fail(at,`Rechteck hinter dem Rahmenbild (Volltonfarbe oder Schatten): ${text}`);
      if(m.badge&&(m.badge.w<40||m.badge.h<20))fail(at,`BETA-Abzeichen ${Math.round(m.badge.w)}×${Math.round(m.badge.h)}px`);
      for(const text of await contrast(page,id))fail(at,`Kontrast ${text}`);
    }
    // Picker-Dialog der Kampagne
    await page.evaluate(()=>openMainMenu(true));await page.click('#menuCampaignBtn');await page.waitForTimeout(400);
    const emptyBanner=await page.evaluate(()=>{
      const panel=document.querySelector('#campaignModePicker .utility-panel');
      const kicker=panel.querySelector('.utility-kicker');
      const before=getComputedStyle(panel,'::before'),k=kicker.getBoundingClientRect(),p=panel.getBoundingClientRect();
      // Das Kicker-Label muss im Kopfbanner des Rahmens sitzen wie beim Training-Dialog.
      const training=document.getElementById('trainingModal')||document.querySelector('.utility-overlay.training-picker');
      return {kickerTop:Math.round(k.top-p.top),beforeImg:before.backgroundImage!=='none'&&before.content!=='none'};
    });
    await page.evaluate(()=>document.getElementById('campaignModePickerClose').click());
    await page.evaluate(()=>openMainMenu(true));await page.click('#menuTutorialBtn');await page.waitForTimeout(400);
    const trainingKicker=await page.evaluate(()=>{const o=[...document.querySelectorAll('.utility-overlay')].find(el=>!el.classList.contains('hidden'));const panel=o.querySelector('.utility-panel'),k=panel.querySelector('.utility-kicker');return Math.round(k.getBoundingClientRect().top-panel.getBoundingClientRect().top);});
    await page.evaluate(()=>document.querySelectorAll('.utility-overlay').forEach(el=>el.classList.add('hidden')));
    if(Math.abs(emptyBanner.kickerTop-trainingKicker)>2)fail(`${tag} Kampagnen-Auswahl`,`Label ${emptyBanner.kickerTop}px unter Oberkante, Training ${trainingKicker}px – leeres Banner`);
    // Quervergleich aller Bildschirme
    const ref=all.settingsScreen;
    for(const [id,m] of Object.entries(all)){
      const at=`${tag} ${id}`;
      if(Math.abs(m.pad[0]-ref.pad[0])>0.5||Math.abs(m.pad[1]-ref.pad[1])>0.5)fail(at,`Innenabstand ${m.pad} statt ${ref.pad}`);
      if(Math.abs(m.back.x-ref.back.x)>1||Math.abs(m.back.y-ref.back.y)>1)fail(at,`Zurück-Knopf bei ${Math.round(m.back.x)},${Math.round(m.back.y)} statt ${Math.round(ref.back.x)},${Math.round(ref.back.y)}`);
      if(Math.abs(m.back.w-ref.back.w)>0.5)fail(at,`Zurück-Knopf ${m.back.w}px statt ${ref.back.w}px`);
      if(Math.abs(m.bar.h-ref.bar.h)>1)fail(at,`Kopfzeile ${Math.round(m.bar.h)}px statt ${Math.round(ref.bar.h)}px`);
      if(m.title.size!==ref.title.size)fail(at,`Titel ${m.title.size} statt ${ref.title.size}`);
      if(m.title.font!==ref.title.font)fail(at,`Titelschrift ${m.title.font}`);
      if(Math.abs((m.title.y+m.title.h/2)-(ref.title.y+ref.title.h/2))>1.5)fail(at,`Titel vertikal ${Math.round(m.title.y)} statt ${Math.round(ref.title.y)}`);
      if(m.sub&&ref.sub&&(m.sub.color!==ref.sub.color||m.sub.size!==ref.sub.size))fail(at,`Untertitel ${m.sub.size} ${m.sub.color} statt ${ref.sub.size} ${ref.sub.color}`);
    }
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    if(overflow>1)fail(tag,`waagrechter Überlauf ${overflow}px`);
    await page.close();
  }
  if(failures.length){
    console.error(failures.join('\n'));
    console.error(`\n${failures.length} Abweichungen`);
  }
  assert.deepEqual(failures,[],'UI-Konsistenz');
  assert.deepEqual(errors,[],'JS-Fehler');
  assert.deepEqual(missing,[],'404');
  console.log(`UI-Konsistenz: ${SCREENS.length} Bildschirme × ${locales.length} Sprachen × ${widths.length} Breiten ohne Abweichung; Kampagnen-Auswahl wie Training-Dialog.`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
