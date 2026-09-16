/* Kistentest im Hauptmenue: nur die Animation, keine Belohnung.
 *
 * Aus dem Gespraech: "im Hauptmenue einen Kistentest-Button einfuegen, der
 * nur die Animation zeigt aber keine Rewards gibt". Die Kistenbilder kommen
 * spaeter aus dem Kisten-Brief; bis dahin laeuft die Animation auf
 * Messrahmen, die genau die Geometrie des Briefs zeigen.
 *
 * Geprueft wird - gegen die Anforderung, nicht gegen die Umsetzung:
 *   1. Der Knopf steht im Trainingsfenster (Tutorial-Knopf im Hauptmenue)
 *      und ist bei 320, 390 und 1280 px sichtbar und hoch genug zum Tippen.
 *      Seit dem Shop (V28.12.50) ist er kein Hauptmenue-Knopf mehr.
 *   2. Ein Tipp oeffnet eine Flaeche ueber dem Menue, die den ganzen
 *      Bildschirm deckt.
 *   3. Die Kiste kommt an, wartet auf den Tipp, wackelt, springt auf und
 *      zeigt danach drei Karten - alle Phasen in dieser Reihenfolge, und die
 *      ganze Strecke endet in unter zehn Sekunden.
 *   4. Der Deckel wird wirklich gedreht (3D-Transform), nicht ausgetauscht.
 *   5. Auf jeder Karte liegt das Vorschaubild eines Wuerfeldesigns.
 *   6. KEINE Belohnung: der Spielstand in localStorage ist nach der ganzen
 *      Strecke byte-gleich; unlockedDice jedes Profils unveraendert.
 *   7. Schliessen fuehrt ins Hauptmenue zurueck; danach im Leerlauf keine
 *      DOM-Mutationen.
 *   8. Die vier Stufen lassen sich umschalten und tauschen wirklich die
 *      Bildpfade (nicht nur den Knopfzustand).
 *   9. Jede Bild-URL traegt den gemeinsamen Cache-Schluessel ASSET_REV.
 *  10. Fehlen Bilddateien, sagt die Flaeche das sichtbar - stumm kaputt ist
 *      nicht erlaubt. 404 duerfen dabei NUR unter assets/ui/v28/png/chests/
 *      auftreten.
 *  11. Englisch: der Knopf heisst "Chest test", die Stufen sind uebersetzt.
 *  12. Mit reduzierter Bewegung erreicht die Strecke trotzdem das Ende.
 *  13. Der Knopf ist in keiner Kampfflaeche und keinem anderen Screen.
 */
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';
const {chromium}=await import(process.env.WD_PLAYWRIGHT||'/opt/node22/lib/node_modules/playwright/index.mjs');
const root=process.cwd(),errors=[];
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{try{
  const file=path.join(root,new URL(req.url,'http://x').pathname);let body=fs.readFileSync(file);
  if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|online\/01-online)\.js[^>]*><\/script>/g,'');
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ergebnisse=[];const pruefe=(n,i,s)=>ergebnisse.push([n,i,s]);
let absturz=null;
const vierhundertvier=[];

// Der Kistentest liegt im Trainingsfenster hinter dem Tutorial-Knopf.
async function kistentestOeffnen(p){
  await p.click('#menuTutorialBtn');await p.waitForTimeout(200);
  await p.click('#menuKistenTestBtn');
}
async function seite(opts={}){
  const p=await browser.newPage({locale:opts.locale||'de-DE',viewport:{width:opts.breite||390,height:opts.hoehe||844},serviceWorkers:'block',reducedMotion:opts.reduziert?'reduce':'no-preference'});
  p.on('pageerror',e=>errors.push(e.message));
  p.on('response',r=>{if(r.status()===404)vierhundertvier.push(new URL(r.url()).pathname);});
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForTimeout(500);
  return p;
}

// Phasen mitschreiben, statt nur den Endzustand zu lesen: eine Strecke, die
// von "warten" direkt nach "fertig" springt, saehe am Ende genauso aus.
async function strecke(p,{tippen=true,limitMs=10000}={}){
  return p.evaluate(async({tippen,limitMs})=>{
    const ov=document.getElementById('kistenTestOverlay');
    const gesehen=[ov.dataset.phase];const start=performance.now();
    const beob=new MutationObserver(()=>{const ph=ov.dataset.phase;if(gesehen[gesehen.length-1]!==ph)gesehen.push(ph);});
    beob.observe(ov,{attributes:true,attributeFilter:['data-phase']});
    let getippt=false;
    while(performance.now()-start<limitMs){
      await new Promise(r=>setTimeout(r,40));
      if(tippen&&!getippt&&ov.dataset.phase==='warten'){getippt=true;ov.querySelector('.kisten-buehne').dispatchEvent(new MouseEvent('click',{bubbles:true}));}
      if(ov.dataset.phase==='fertig')break;
    }
    beob.disconnect();
    return {gesehen,dauer:Math.round(performance.now()-start)};
  },{tippen,limitMs});
}

try{
  // 1. Knopf im Hauptmenue, drei Breiten.
  for(const breite of [320,390,1280]){
    const p=await seite({breite,hoehe:breite===1280?900:844});
    await p.click('#menuTutorialBtn');await p.waitForTimeout(200);
    const k=await p.evaluate(()=>{const b=document.getElementById('menuKistenTestBtn');if(!b)return null;const r=b.getBoundingClientRect();
      return {imHub:!!b.closest('#tutorialHubModal'),sichtbar:r.width>0&&r.height>0&&getComputedStyle(b).visibility==='visible',hoehe:r.height,breite:r.width,text:b.textContent.trim()};});
    pruefe(`Knopf im Trainingsfenster sichtbar bei ${breite}px`,!!k&&k.imHub&&k.sichtbar,true);
    pruefe(`Knopf mindestens 44px hoch bei ${breite}px`,!!k&&k.hoehe>=44,true);
    if(k)console.log(`      ${breite}px: ${Math.round(k.breite)}x${Math.round(k.hoehe)} "${k.text}"`);
    await p.close();
  }

  // 2.-10. Die ganze Strecke auf 390px.
  const p=await seite();
  const vorher=await p.evaluate(()=>({save:localStorage.getItem('wuerfelduell_save_v1'),
    dice:JSON.stringify((JSON.parse(localStorage.getItem('wuerfelduell_save_v1')||'{}').profiles||[]).map(x=>x.unlockedDice))}));
  await kistentestOeffnen(p);await p.waitForTimeout(150);
  const flaeche=await p.evaluate(()=>{const ov=document.getElementById('kistenTestOverlay');if(!ov)return null;const r=ov.getBoundingClientRect();const cs=getComputedStyle(ov);
    return {offen:!ov.classList.contains('hidden'),deckt:r.left<=0&&r.top<=0&&r.right>=innerWidth&&r.bottom>=innerHeight,fixed:cs.position==='fixed',z:Number(cs.zIndex),
      ueberMenue:(parseInt(cs.zIndex,10)||0)>(parseInt(getComputedStyle(document.getElementById('mainMenu')).zIndex,10)||0)};});
  pruefe('Tipp oeffnet die Kistenflaeche ueber dem Menue',!!flaeche&&flaeche.offen&&flaeche.deckt&&flaeche.fixed&&flaeche.ueberMenue,true);
  if(flaeche)console.log(`      z-index ${flaeche.z}`);

  // 3. Phasenfolge.
  const lauf=await strecke(p);
  const soll=['ankunft','warten','wackeln','aufspringen','enthuellung','fertig'];
  const folge=soll.every((ph,i)=>lauf.gesehen.indexOf(ph)>=0&&(i===0||lauf.gesehen.indexOf(ph)>lauf.gesehen.indexOf(soll[i-1])));
  pruefe('Phasen laufen in der Reihenfolge ankunft>warten>wackeln>aufspringen>enthuellung>fertig',folge,true);
  pruefe('Ganze Strecke unter zehn Sekunden',lauf.dauer<10000,true);
  console.log(`      gesehen: ${lauf.gesehen.join(' > ')} (${lauf.dauer} ms)`);

  // 4. Deckel gedreht, 5. Karten mit Wuerfeldesign.
  const offen=await p.evaluate(()=>{
    const deckel=document.querySelector('#kistenTestOverlay .kisten-deckel');
    const t=deckel?getComputedStyle(deckel).transform:'none';
    const karten=[...document.querySelectorAll('#kistenTestOverlay .kisten-karte')];
    return {transform:t,karten:karten.length,
      gedreht:karten.filter(k=>k.classList.contains('gedreht')).length,
      designs:karten.map(k=>k.querySelector('.kisten-karte-design')?.getAttribute('src')||''),
      namen:karten.map(k=>k.querySelector('.kisten-karte-name')?.textContent.trim()||'')};
  });
  // rotateX ergibt eine matrix3d, bei der m23/m33 ungleich 0/1 sind - ein
  // ausgetauschtes Bild haette "none".
  const m=offen.transform.match(/^matrix3d\((.+)\)$/);
  const werte=m?m[1].split(',').map(Number):null;
  pruefe('Deckel ist per 3D-Transform gedreht',!!werte&&Math.abs(werte[10]-1)>0.2,true);
  console.log(`      Deckel-Transform: ${offen.transform.slice(0,60)}`);
  pruefe('Drei Karten liegen aufgedeckt vor der Kiste',offen.karten===3&&offen.gedreht===3,true);
  pruefe('Jede Karte zeigt ein Wuerfeldesign-Vorschaubild',offen.designs.length===3&&offen.designs.every(s=>/dice-designs\/.+-beauty\.webp\?v=/.test(s)),true);
  pruefe('Jede Karte traegt den Namen des Designs',offen.namen.every(n=>n.length>0),true);
  console.log(`      Karten: ${offen.namen.join(', ')}`);

  // 6. Keine Belohnung.
  const nachher=await p.evaluate(()=>({save:localStorage.getItem('wuerfelduell_save_v1'),
    dice:JSON.stringify((JSON.parse(localStorage.getItem('wuerfelduell_save_v1')||'{}').profiles||[]).map(x=>x.unlockedDice))}));
  pruefe('Spielstand nach der Strecke byte-gleich (keine Belohnung)',vorher.save===nachher.save,true);
  pruefe('unlockedDice aller Profile unveraendert',vorher.dice===nachher.dice,true);

  // 8. Stufen umschalten: Bildpfade muessen wirklich wechseln.
  const stufen=await p.evaluate(async()=>{
    const knoepfe=[...document.querySelectorAll('#kistenTestOverlay .kisten-stufen button')];
    const pfade=[];
    for(const k of knoepfe){k.click();await new Promise(r=>setTimeout(r,80));
      pfade.push({stufe:k.dataset.stufe,body:document.querySelector('#kistenTestOverlay .kisten-body img')?.getAttribute('src')||'',
        aktiv:document.querySelector('#kistenTestOverlay .kisten-stufen button.aktiv')?.dataset.stufe,
        ueberschrift:document.getElementById('kistenTestOverlay').dataset.stufe});}
    return pfade;
  });
  pruefe('Vier Stufen waehlbar',stufen.length===4&&new Set(stufen.map(s=>s.stufe)).size===4,true);
  pruefe('Stufenwechsel tauscht die Bildpfade',stufen.every(s=>s.body.includes(`/chests/${s.stufe}/chest-${s.stufe}-body.webp`)&&s.aktiv===s.stufe&&s.ueberschrift===s.stufe),true);

  // 9. Cache-Schluessel.
  const rev=await p.evaluate(()=>({rev:ASSET_REV,srcs:[...document.querySelectorAll('#kistenTestOverlay img')].map(i=>i.getAttribute('src')||'')}));
  pruefe('Jede Kisten-Bild-URL traegt ?v=ASSET_REV',rev.srcs.length>0&&rev.srcs.every(s=>s.endsWith(`?v=${rev.rev}`)),true);

  // 10. Fehlende Dateien sichtbar gemeldet; 404 nur unter chests/.
  const fehlend=await p.evaluate(()=>{const f=document.querySelector('#kistenTestOverlay .kisten-fehlend');
    const anzahl=[...document.querySelectorAll('#kistenTestOverlay .kisten-ebene[data-fehlt]')].length;
    return {gemeldet:!!f&&!f.classList.contains('hidden')&&f.textContent.trim().length>0,anzahl,vorhanden:[...document.querySelectorAll('#kistenTestOverlay .kisten-ebene:not([data-fehlt]) img')].length};});
  const kistenBilderDa=fs.existsSync(path.join(root,'assets/ui/v28/png/chests/common/chest-common-body.webp'));
  if(kistenBilderDa){
    pruefe('Kistenbilder vorhanden: keine Fehlmeldung',!fehlend.gemeldet,true);
  }else{
    pruefe('Kistenbilder fehlen noch: Flaeche sagt es sichtbar',fehlend.gemeldet&&fehlend.anzahl>0,true);
    console.log(`      fehlende Ebenen: ${fehlend.anzahl}`);
  }
  const fremde404=vierhundertvier.filter(u=>!u.includes('/assets/ui/v28/png/chests/'));
  pruefe('404 nur unter assets/ui/v28/png/chests/',fremde404.length===0,true);
  if(fremde404.length)console.log(`      fremde 404: ${[...new Set(fremde404)].join(', ')}`);

  // 7. Schliessen und Ruhe.
  await p.click('#kistenTestOverlay .kisten-schliessen');await p.waitForTimeout(150);
  const zu=await p.evaluate(async()=>{
    const ov=document.getElementById('kistenTestOverlay');
    const menue=document.getElementById('mainMenu');
    let mut=0;const beob=new MutationObserver(l=>{mut+=l.length;});
    await new Promise(r=>setTimeout(r,300));
    beob.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
    await new Promise(r=>setTimeout(r,1000));beob.disconnect();
    return {zu:ov.classList.contains('hidden'),menue:menue&&getComputedStyle(menue).display!=='none'&&!menue.classList.contains('hidden'),mut};
  });
  pruefe('Schliessen fuehrt ins Hauptmenue zurueck',zu.zu&&zu.menue,true);
  pruefe('Nach dem Schliessen 0 DOM-Mutationen pro Sekunde',zu.mut,0);

  // 13. Nirgends sonst - und nicht mehr im Hauptmenue.
  const sonst=await p.evaluate(()=>document.querySelectorAll('#menuKistenTestBtn').length+(document.querySelector('#mainMenu #menuKistenTestBtn')?100:0));
  pruefe('Genau ein Kistentest-Knopf im Dokument',sonst,1);
  await p.close();

  // 11. Englisch.
  // Die Sprache faellt ohne gespeicherte Wahl auf navigator.language zurueck.
  const e=await seite({locale:'en-US'});
  // Die Beschriftung, nicht den ganzen Knopf: die "Test"-Plakette ist ein
  // eigenes Element daneben.
  await e.click('#menuTutorialBtn');await e.waitForTimeout(200);
  const en=await e.evaluate(()=>(document.getElementById('menuKistenTestBtn')?.textContent||'').replace(/^[^A-Za-z]+/,'').trim());
  await e.click('#menuKistenTestBtn');await e.waitForTimeout(150);
  const enStufen=await e.evaluate(()=>[...document.querySelectorAll('#kistenTestOverlay .kisten-stufen button')].map(b=>b.textContent.trim()));
  pruefe('Englisch: Knopf heisst "Chest test"',en,'Chest test');
  pruefe('Englisch: Stufen uebersetzt',enStufen.join('|'),'Common|Rare|Epic|Legendary');
  if(en!=='Chest test'||enStufen.join('|')!=='Common|Rare|Epic|Legendary')console.log(`      en: "${en}" / ${enStufen.join('|')}`);
  await e.close();

  // 12. Reduzierte Bewegung.
  const r=await seite({reduziert:true});
  await kistentestOeffnen(r);await r.waitForTimeout(100);
  const ruhig=await strecke(r,{limitMs:6000});
  pruefe('Reduzierte Bewegung: Strecke erreicht "fertig"',ruhig.gesehen.includes('fertig'),true);
  console.log(`      reduziert: ${ruhig.gesehen.join(' > ')} (${ruhig.dauer} ms)`);
  await r.close();
}catch(e){absturz=e;}

const ERWARTET=25;
let fehler=ergebnisse.length<ERWARTET?1:0;
if(fehler)console.log(`ACHTUNG: nur ${ergebnisse.length} von ${ERWARTET} Zusicherungen erreicht.`);
const breite=Math.max(1,...ergebnisse.map(r=>r[0].length));
for(const [name,ist,soll] of ergebnisse){
  const ok=ist===soll;if(!ok)fehler++;
  console.log(`${ok?'  ok  ':' FEHL '} ${name.padEnd(breite)}  ist=${String(ist).padStart(5)} soll=${String(soll).padStart(5)}`);
}
const kisten404=[...new Set(vierhundertvier.filter(u=>u.includes('/assets/ui/v28/png/chests/')))];
if(kisten404.length)console.log(`\nNoch fehlende Kistenbilder (${kisten404.length}):\n  `+kisten404.map(u=>u.replace(/^.*\/chests\//,'chests/')).join('\n  '));
await browser.close();server.close();
if(absturz)console.log('\nAbbruch: '+absturz.message.split('\n')[0]+'\n'+(absturz.stack||'').split('\n').slice(1,3).join('\n'));
if(errors.length){console.log('\nSeitenfehler:\n'+errors.join('\n'));fehler++;}
console.log(fehler?`\n${fehler} Abweichung(en).`:'\nAlle Zusicherungen erfuellt.');
process.exit(fehler?1:0);
