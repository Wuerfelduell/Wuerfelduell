/* Platzmanagement im Kampf.
 *
 * Gewuenscht (aus dem Spiel formuliert):
 *   "neben dem Hauptmenue-Knopf oben einen Knopf fuer Kampflog ... dasselbe
 *    Design wie den Hauptmenue-Knopf. Dann die Faehigkeiten und die Aufgaben
 *    bzw. Aufgabenfortschritt in ein Untermenue packen, dafuer ueber den
 *    Wuerfeln einen kleinen Knopf der 'Infos' heisst."
 *   "die erste Aktion des Kampfes soll auch immer die Zeilenbeschriftung 1
 *    haben ... und die Sprites koennen aus dem Kampflog raus."
 *   "den Hauptwuerfelbutton kuerzen wir jetzt im Deutschen auf 'Wuerfeln'
 *    und im Englischen auf 'Roll', damit koennen wir den Zusatzknopf
 *    danebenpacken statt darunter."
 *
 * Geprueft wird der laufende Kampf, nicht der Quelltext:
 *   1. Beide Knoepfe stehen im NORMALEN Spiel, nicht nur in der Testumgebung.
 *   2. Kampflog-Knopf neben dem Hauptmenue, gleiche Familie, gleiche Zeile.
 *   3. Infos-Knopf mittig ueber den Wuerfeln, klein - und weg, wenn es
 *      nichts zu zeigen gibt.
 *   4. Faehigkeitszeilen und Aufgabenfortschritt belegen im Zug keinen Platz.
 *   5. Der Kampflog steht in Kampfreihenfolge (Zeile 1 = erste Aktion), ohne
 *      ein einziges Sprite, und wird bei jedem Oeffnen neu gelesen.
 *   6. Keine doppelten ids: die Blaetter zeigen KOPIEN.
 *   7. Der Wurfknopf heisst "Wuerfeln" (englisch "Roll") und traegt einen
 *      Zusatzknopf NEBEN sich, nicht darunter.
 *   8. Die Testumgebung startet mit eingeklappter Werkbank.
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
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/tmp/chromium',args:['--no-sandbox']});
const ergebnisse=[];const pruefe=(n,i,s)=>ergebnisse.push([n,i,s]);
let absturz=null;

const KASTEN=`(sel)=>{const e=document.querySelector(sel);if(!e)return null;
  const r=e.getBoundingClientRect();const cs=getComputedStyle(e);
  return {x:Math.round(r.x),y:Math.round(r.y),b:Math.round(r.width),h:Math.round(r.height),
    anzeige:cs.display,klassen:e.className,text:e.textContent.trim()};}`;

async function seite(sprache='de-DE'){
  const p=await browser.newPage({locale:sprache,viewport:{width:390,height:844},serviceWorkers:'block'});
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForTimeout(400);
  await p.evaluate(k=>{window.__k=eval(k);},KASTEN);
  return p;
}

// Ein ganz normales lokales Spiel, ohne Testumgebung.
async function normalesSpiel(p){
  // Ein Mensch gegen einen Bot. Zwei Bots waeren einfacher zu starten, aber
  // dann spielt sofort der Bot und die Knopfleiste ist leer - gemessen
  // werden soll der Zug eines Spielers.
  await p.evaluate(()=>{createProfile('Prueferin');saveGameData();});
  await p.click('#menuPlayBtn');await p.waitForTimeout(400);
  await p.selectOption('#botChoice0','human');
  await p.selectOption('#botChoice1','easy');
  await p.waitForTimeout(200);
  await p.click('#rollAbilities');await p.waitForTimeout(900);
  await p.click('#startGame');await p.waitForTimeout(900);
  // Der Bot kann den ersten Zug haben. Gemessen wird der Zug des Spielers,
  // also warten, bis die Knopfleiste ihm gehoert.
  await p.locator('#primaryBtn').waitFor({state:'visible',timeout:45000});
}

try{
  const p=await seite();
  await normalesSpiel(p);

  const stand=await p.evaluate(()=>({
    labor:document.body.classList.contains('test-lab-active'),
    imSpiel:!document.getElementById('game').classList.contains('hidden'),
    hauptmenue:window.__k('#gameMenuBtn'),
    kampflog:window.__k('#combatLogBtn'),
    matchbar:window.__k('#game .matchbar'),
    infoKnopf:window.__k('#battleInfoBtn'),
    infoReihe:window.__k('#game .battle-info-row'),
    faehigkeiten:window.__k('#abilityState'),
    aufgaben:window.__k('#campaignTaskProgress'),
    wuerfel:window.__k('#dice'),
    wurfknopf:window.__k('#primaryBtn')
  }));

  pruefe('Normales Spiel laeuft (keine Testumgebung)',stand.imSpiel&&!stand.labor,true);
  pruefe('Kampflog-Knopf steht im normalen Spiel',!!stand.kampflog&&stand.kampflog.b>0,true);
  pruefe('Kampflog traegt das Hauptmenue-Design',
    !!stand.kampflog&&stand.kampflog.klassen.split(/\s+/).includes('game-menu-btn'),true);
  const gleicheZeile=stand.kampflog&&stand.hauptmenue
    &&Math.abs(stand.kampflog.y-stand.hauptmenue.y)<=2
    &&Math.abs(stand.kampflog.h-stand.hauptmenue.h)<=2;
  pruefe('Kampflog steht neben dem Hauptmenue',!!gleicheZeile,true);
  pruefe('Matchbar bleibt einzeilig',stand.matchbar.h<=Math.max(stand.hauptmenue.h+12,56),true);

  const mitte=k=>k.x+k.b/2;
  const infoOk=stand.infoKnopf&&stand.wuerfel
    &&stand.infoKnopf.y+stand.infoKnopf.h<=stand.wuerfel.y
    &&Math.abs(mitte(stand.infoKnopf)-mitte(stand.wuerfel))<=6;
  pruefe('Infos-Knopf steht mittig ueber den Wuerfeln',!!infoOk,true);
  pruefe('Infos-Knopf ist klein',!!stand.infoKnopf&&stand.infoKnopf.h<=36&&stand.infoKnopf.b<=stand.wuerfel.b*0.5,true);
  pruefe('Faehigkeitszeilen belegen im Zug keinen Platz',stand.faehigkeiten.h===0&&stand.faehigkeiten.anzeige==='none',true);
  pruefe('Aufgabenfortschritt belegt im Zug keinen Platz',stand.aufgaben.h===0,true);

  // 7. Der Wurfknopf: kurz, und der Zusatzknopf steht DANEBEN.
  pruefe('Wurfknopf heisst "Würfeln"',stand.wurfknopf.text==='Würfeln',true);
  const reihe=await p.evaluate(()=>{
    // Blutpreis ist der laengste Zusatzknopf, der im Angriff neben dem
    // Wurfknopf steht. Gemessen wird die Lage, nicht der Weg dorthin.
    const zusatz=document.getElementById('bloodLowerBtn');
    zusatz.classList.remove('hidden');
    zusatz.textContent='Blutpreis';
    const leiste=document.getElementById('primaryBtn').parentElement;
    const sichtbar=[...leiste.children].filter(b=>!b.classList.contains('hidden')&&getComputedStyle(b).display!=='none');
    const zeilen=new Set(sichtbar.map(b=>Math.round(b.getBoundingClientRect().y)));
    // Bricht ein Text im Knopf um? Verschiedene Oberkanten der Textrechtecke.
    const textzeilen=b=>{const tops=new Set();
      for(const kind of b.childNodes){ if(kind.nodeType===3&&kind.textContent.trim()){
        const rg=document.createRange();rg.selectNodeContents(kind);
        [...rg.getClientRects()].forEach(x=>tops.add(Math.round(x.top)));}}
      return tops.size;};
    const lage={zeilen:zeilen.size,hoehe:Math.round(leiste.getBoundingClientRect().height),
      knoepfe:sichtbar.map(b=>({id:b.id,text:b.textContent.trim(),
        b:Math.round(b.getBoundingClientRect().width),textzeilen:textzeilen(b),
        ueberlauf:b.scrollWidth>b.clientWidth+1}))};
    zusatz.classList.add('hidden');
    return lage;
  });
  pruefe('Zusatzknopf steht neben dem Wurfknopf',reihe.zeilen===1&&reihe.knoepfe.length===2,true);
  pruefe('Kein Knopftext bricht um',reihe.knoepfe.every(k=>k.textzeilen<=1&&!k.ueberlauf),true);
  if(reihe.zeilen!==1||!reihe.knoepfe.every(k=>k.textzeilen<=1&&!k.ueberlauf))
    console.log(`      Knopfleiste: ${JSON.stringify(reihe)}`);

  // 5. Kampflog: Reihenfolge, keine Sprites, frisch gelesen.
  await p.evaluate(()=>{addLog('Erste Aktion');addLog('Zweite Aktion');addLog('Dritte Aktion');});
  await p.click('#combatLogBtn');await p.waitForTimeout(300);
  const log=await p.evaluate(()=>({
    titel:document.getElementById('battleSheetTitle').textContent,
    zeilen:[...document.querySelectorAll('.battle-log-list li')].map(l=>l.textContent),
    sprites:document.querySelectorAll('#battleSheetBody img').length,
    quelle:[...document.getElementById('log').children].map(k=>k.textContent)
  }));
  pruefe('Kampflog-Blatt geht auf',log.titel==='Kampflog'&&log.zeilen.length>0,true);
  // Zeile 1 ist die ERSTE Aktion. #log haelt sie hinten, addLog stellt vorne ein.
  pruefe('Kampflog steht in Kampfreihenfolge',
    log.zeilen.join('|')===[...log.quelle].reverse().join('|')
    &&log.zeilen[log.zeilen.length-1]==='Dritte Aktion'
    &&log.zeilen[log.zeilen.length-3]==='Erste Aktion',true);
  pruefe('Kampflog zeigt kein einziges Sprite',log.sprites===0,true);
  if(log.sprites)console.log(`      Sprites im Log: ${log.sprites}`);
  await p.click('#battleSheetCloseBtn');await p.waitForTimeout(200);
  await p.evaluate(()=>addLog('Vierte Aktion'));
  await p.click('#combatLogBtn');await p.waitForTimeout(300);
  const nachgelesen=await p.evaluate(()=>[...document.querySelectorAll('.battle-log-list li')].map(l=>l.textContent));
  pruefe('Kampflog liest bei jedem Oeffnen neu',
    nachgelesen.length===log.zeilen.length+1&&nachgelesen[nachgelesen.length-1]==='Vierte Aktion',true);
  await p.click('#battleSheetCloseBtn');await p.waitForTimeout(200);

  // 3./6. Infos-Blatt: Inhalt, Kopie statt Umzug.
  await p.click('#battleInfoBtn');await p.waitForTimeout(300);
  const blatt=await p.evaluate(()=>{
    const norm=t=>String(t||'').replace(/[\s ]+/g,' ').replace(/[^\p{L}\p{N} ·.,:!?+-]/gu,'').trim();
    return {
      offen:!document.getElementById('battleSheetOverlay').classList.contains('hidden'),
      titel:document.getElementById('battleSheetTitle').textContent,
      koepfe:[...document.querySelectorAll('.battle-sheet-head')].map(k=>k.textContent),
      text:norm(document.getElementById('battleSheetBody').textContent),
      quelle:norm(document.getElementById('abilityState').textContent),
      doppelt:['abilityState','campaignTaskProgress','battleSheetBody'].map(id=>document.querySelectorAll(`#${id}`).length)
    };
  });
  pruefe('Infos-Blatt geht auf',blatt.offen&&blatt.titel==='Infos',true);
  pruefe('Infos-Blatt zeigt die Faehigkeiten',
    blatt.koepfe.includes('Fähigkeiten')&&blatt.quelle.length>0&&blatt.text.includes(blatt.quelle),true);
  if(!blatt.text.includes(blatt.quelle))console.log(`      Blatt: ${JSON.stringify(blatt)}`);
  pruefe('Keine doppelten ids',blatt.doppelt.every(n=>n===1),true);
  await p.click('#battleSheetCloseBtn');await p.waitForTimeout(200);

  // 3b. Kein Inhalt, kein Knopf.
  const ohne=await p.evaluate(()=>{
    abilityState.innerHTML='';campaignTaskProgress.innerHTML='';
    refreshBattleInfoButton();
    return window.__k('#game .battle-info-row');
  });
  pruefe('Infos-Knopf verschwindet, wenn es nichts zu zeigen gibt',ohne.h===0||ohne.anzeige==='none',true);
  await p.close();

  // 7b. Englisch: derselbe Knopf heisst "Roll".
  const e=await seite('en-US');
  await normalesSpiel(e);
  const englisch=await e.evaluate(()=>({
    wurf:window.__k('#primaryBtn').text,
    log:window.__k('#combatLogBtn').text,
    infos:window.__k('#battleInfoBtn').text
  }));
  pruefe('Englisch: Wurfknopf heisst "Roll"',englisch.wurf==='Roll',true);
  pruefe('Englisch: Kampflog und Infos sind uebersetzt',
    englisch.log==='Combat Log'&&englisch.infos==='Info',true);
  if(englisch.wurf!=='Roll'||englisch.log!=='Combat Log')
    console.log(`      Englisch: ${JSON.stringify(englisch)}`);
  await e.close();

  // 8. Testumgebung: Werkbank eingeklappt, Kampf ohne Scrollen.
  const l=await seite();
  await l.click('#menuTutorialBtn');await l.waitForTimeout(250);
  await l.click('#tutorialHubLabBtn');await l.waitForTimeout(350);
  const karten=l.locator('#testLabAbilityGrid > *');
  await karten.nth(2).click();await karten.nth(10).click();
  await l.click('#testLabStartBtn');await l.waitForTimeout(800);
  const labor=await l.evaluate(()=>({
    aktiv:document.body.classList.contains('test-lab-active'),
    eingeklappt:document.getElementById('testLabBenchBody')?.classList.contains('hidden'),
    werkbank:window.__k('#testLabWorkbench'),
    wurfknopf:window.__k('#primaryBtn'),
    fenster:innerHeight
  }));
  pruefe('Testumgebung: Werkbank startet eingeklappt',labor.aktiv&&labor.eingeklappt===true&&labor.werkbank.h<120,true);
  // Aufgeklappt stand der Wurfknopf bei y=1080 von 844 sichtbaren Pixeln.
  pruefe('Testumgebung: Kampf passt ohne Scrollen',labor.wurfknopf.y+labor.wurfknopf.h<=labor.fenster,true);
  await l.close();
}catch(e){absturz=e;}

const ERWARTET=22;
let fehler=ergebnisse.length<ERWARTET?1:0;
if(fehler)console.log(`ACHTUNG: nur ${ergebnisse.length} von ${ERWARTET} Zusicherungen erreicht.`);
const breite=Math.max(1,...ergebnisse.map(r=>r[0].length));
for(const [name,ist,soll] of ergebnisse){
  const ok=ist===soll;if(!ok)fehler++;
  console.log(`${ok?'  ok  ':' FEHL '} ${name.padEnd(breite)}  ist=${String(ist).padStart(5)} soll=${String(soll).padStart(5)}`);
}
await browser.close();server.close();
if(absturz)console.log('\nAbbruch: '+absturz.message.split('\n')[0]);
if(errors.length){console.log('\nSeitenfehler:\n'+errors.join('\n'));fehler++;}
console.log(fehler?`\n${fehler} Abweichung(en).`:'\nAlle Zusicherungen erfuellt.');
process.exit(fehler?1:0);
