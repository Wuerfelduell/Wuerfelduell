/* Platzmanagement im Kampf – erster Versuch, vorerst nur Testumgebung.
 *
 * Gewuenscht (aus dem Spiel formuliert):
 *   "neben dem Hauptmenue-Knopf oben einen Knopf fuer Kampflog, den mussten
 *    wir zuerst entfernen aus Platzgruenden, aber er waere sehr hilfreich um
 *    fuer Bugs nachzuschlagen - dasselbe Design wie den Hauptmenue-Knopf.
 *    Dann die Faehigkeiten und die Aufgaben bzw. Aufgabenfortschritt in ein
 *    Untermenue packen, dafuer ueber den Wuerfeln einen kleinen Knopf der
 *    'Infos' heisst."
 *
 * Geprueft wird der laufende Kampf, nicht der Quelltext:
 *   1. Die FX-Werkbank startet eingeklappt, der Kampf passt ohne Scrollen.
 *   2. Kampflog-Knopf steht neben dem Hauptmenue, gleiche Familie, gleiche
 *      Zeile - er darf die Leiste nicht hoeher machen.
 *   3. Infos-Knopf steht mittig ueber den Wuerfeln und ist klein.
 *   4. Die Faehigkeitszeilen belegen im Zug keinen Platz mehr, die Wuerfel
 *      ruecken dadurch nach oben.
 *   5. Beide Blaetter zeigen, was drinstehen soll - und lesen bei jedem
 *      Oeffnen neu, der Log neueste zuerst.
 *   6. Keine doppelten ids: die Blaetter zeigen KOPIEN.
 *   7. Ausserhalb der Testumgebung ist der Kampf unveraendert.
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

const kasten=`(sel)=>{const e=document.querySelector(sel);if(!e)return null;
  const r=e.getBoundingClientRect();const cs=getComputedStyle(e);
  return {x:Math.round(r.x),y:Math.round(r.y),b:Math.round(r.width),h:Math.round(r.height),
    anzeige:cs.display,klassen:e.className};}`;

try{
  const p=await browser.newPage({locale:'de-DE',viewport:{width:390,height:844},serviceWorkers:'block'});
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForTimeout(400);
  await p.evaluate(k=>{window.__k=eval(k);},kasten);

  // --- Testumgebung starten: Hub -> Labor -> zwei Faehigkeiten -> Start
  await p.click('#menuTutorialBtn');await p.waitForTimeout(250);
  await p.click('#tutorialHubLabBtn');await p.waitForTimeout(350);
  const karten=p.locator('#testLabAbilityGrid > *');
  await karten.nth(2).click();await karten.nth(10).click();
  await p.click('#testLabStartBtn');await p.waitForTimeout(800);

  const stand=await p.evaluate(()=>({
    labor:document.body.classList.contains('test-lab-active'),
    werkbankKoerper:document.getElementById('testLabBenchBody')?.classList.contains('hidden'),
    werkbank:window.__k('#testLabWorkbench'),
    matchbar:window.__k('#game .matchbar'),
    hauptmenue:window.__k('#gameMenuBtn'),
    kampflog:window.__k('#combatLogBtn'),
    infoKnopf:window.__k('#battleInfoBtn'),
    infoReihe:window.__k('#game .battle-info-row'),
    faehigkeiten:window.__k('#abilityState'),
    aufgaben:window.__k('#campaignTaskProgress'),
    wuerfel:window.__k('#dice'),
    wurfknopf:window.__k('#primaryBtn'),
    fenster:innerHeight
  }));

  pruefe('Testumgebung laeuft',stand.labor,true);
  // 1. Eingeklappte Werkbank: der Kampf muss ohne Scrollen sichtbar sein.
  pruefe('Werkbank startet eingeklappt',stand.werkbankKoerper===true&&stand.werkbank.h<120,true);
  // Nicht die Dokumenthoehe messen: die bleibt beim Fenster stehen, der
  // Kampf rutscht nur darunter. Entscheidend ist, ob der Wurfknopf ohne
  // Scrollen zu sehen ist - aufgeklappt stand er bei y=1080 von 844.
  pruefe('Kampf passt ohne Scrollen',stand.wurfknopf.y+stand.wurfknopf.h<=stand.fenster,true);

  // 2. Kampflog-Knopf: da, gleiche Familie, gleiche Zeile wie das Hauptmenue.
  pruefe('Kampflog-Knopf vorhanden',!!stand.kampflog&&stand.kampflog.b>0,true);
  pruefe('Kampflog traegt das Hauptmenue-Design',
    !!stand.kampflog&&stand.kampflog.klassen.split(/\s+/).includes('game-menu-btn'),true);
  const gleicheZeile=stand.kampflog&&stand.hauptmenue
    &&Math.abs(stand.kampflog.y-stand.hauptmenue.y)<=2
    &&Math.abs(stand.kampflog.h-stand.hauptmenue.h)<=2;
  pruefe('Kampflog steht neben dem Hauptmenue',!!gleicheZeile,true);
  pruefe('Matchbar bleibt einzeilig',stand.matchbar.h<=Math.max(stand.hauptmenue.h+12,56),true);

  // 3. Infos-Knopf: mittig ueber den Wuerfeln, klein.
  const mitte=k=>k.x+k.b/2;
  const infoOk=stand.infoKnopf&&stand.wuerfel
    &&stand.infoKnopf.y+stand.infoKnopf.h<=stand.wuerfel.y
    &&Math.abs(mitte(stand.infoKnopf)-mitte(stand.wuerfel))<=6;
  pruefe('Infos-Knopf steht mittig ueber den Wuerfeln',!!infoOk,true);
  pruefe('Infos-Knopf ist klein',!!stand.infoKnopf&&stand.infoKnopf.h<=36&&stand.infoKnopf.b<=stand.wuerfel.b*0.5,true);

  // 4. Der Zug ist kuerzer geworden: die Faehigkeitszeilen sind raus.
  pruefe('Faehigkeitszeilen belegen im Zug keinen Platz',stand.faehigkeiten.h===0&&stand.faehigkeiten.anzeige==='none',true);
  pruefe('Aufgabenfortschritt belegt im Zug keinen Platz',stand.aufgaben.h===0,true);

  // 5a. Infos-Blatt zeigt die Faehigkeiten, wortgleich zur Quelle.
  await p.click('#battleInfoBtn');await p.waitForTimeout(300);
  const blatt=await p.evaluate(()=>{
    const norm=t=>String(t||'').replace(/[\s ]+/g,' ').replace(/[^\p{L}\p{N} ·.,:!?+-]/gu,'').trim();
    const koerper=document.getElementById('battleSheetBody');
    return {
      offen:!document.getElementById('battleSheetOverlay').classList.contains('hidden'),
      titel:document.getElementById('battleSheetTitle').textContent,
      koepfe:[...document.querySelectorAll('.battle-sheet-head')].map(k=>k.textContent),
      text:norm(koerper.textContent),
      quelle:norm(document.getElementById('abilityState').textContent),
      doppelt:['abilityState','campaignTaskProgress','battleSheetBody']
        .map(id=>document.querySelectorAll(`#${id}`).length)
    };
  });
  pruefe('Infos-Blatt geht auf',blatt.offen&&blatt.titel==='Infos',true);
  pruefe('Infos-Blatt zeigt die Faehigkeiten',blatt.koepfe.includes('Fähigkeiten')&&blatt.quelle.length>0&&blatt.text.includes(blatt.quelle),true);
  if(!blatt.text.includes(blatt.quelle))console.log(`      Blatt: ${JSON.stringify(blatt)}`);
  // 6. Kopie, kein Umzug: die Originale stehen weiter genau einmal im Baum.
  pruefe('Keine doppelten ids',blatt.doppelt.every(n=>n===1),true);

  await p.click('#battleSheetCloseBtn');await p.waitForTimeout(200);

  // 5b. Kampflog: zeigt den Verlauf, neueste zuerst, und zwar den AKTUELLEN.
  // Der Kampflog fuellt sich ueber addLog - dieselbe Funktion, die der Kampf
  // an hunderten Stellen ruft. Geprueft wird, dass das Blatt bei jedem
  // Oeffnen neu liest und nichts zwischenspeichert.
  await p.click('#combatLogBtn');await p.waitForTimeout(300);
  const logVorher=await p.evaluate(()=>document.querySelectorAll('.battle-log-list li').length);
  await p.click('#battleSheetCloseBtn');await p.waitForTimeout(200);
  await p.evaluate(()=>addLog('Pruefzeile aus dem Pruefstand'));
  await p.click('#combatLogBtn');await p.waitForTimeout(300);
  const log=await p.evaluate(()=>({
    titel:document.getElementById('battleSheetTitle').textContent,
    zeilen:[...document.querySelectorAll('.battle-log-list li')].map(l=>l.textContent),
    quelle:[...document.getElementById('log').children].map(k=>k.textContent)
  }));
  pruefe('Kampflog-Blatt geht auf',log.titel==='Kampflog'&&log.zeilen.length>0,true);
  pruefe('Kampflog liest bei jedem Oeffnen neu',log.zeilen.length===logVorher+1,true);
  // addLog stellt neue Eintraege VORNE ein - dieselbe Reihenfolge im Blatt.
  pruefe('Kampflog steht neueste zuerst',
    log.zeilen.join('|')===log.quelle.join('|')&&log.zeilen[0]==='Pruefzeile aus dem Pruefstand',true);
  if(log.zeilen.join('|')!==log.quelle.join('|'))
    console.log(`      Log: Blatt=${log.zeilen.length} Quelle=${log.quelle.length}`);
  await p.click('#battleSheetCloseBtn');await p.waitForTimeout(200);

  // 7. Ausserhalb der Testumgebung bleibt der Kampf, wie er war.
  await p.evaluate(()=>{quitModal.classList.remove('hidden');});
  await p.click('#quitConfirmBtn');await p.waitForTimeout(400);
  await p.click('#menuPlayBtn');await p.waitForTimeout(400);
  const danach=await p.evaluate(()=>({
    labor:document.body.classList.contains('test-lab-active'),
    kampflog:!!document.getElementById('combatLogBtn'),
    infoKnopf:!!document.getElementById('battleInfoBtn'),
    infoReihe:!!document.querySelector('#game .battle-info-row'),
    blatt:!!document.getElementById('battleSheetOverlay'),
    faehigkeitenAnzeige:getComputedStyle(document.getElementById('abilityState')).display
  }));
  pruefe('Testumgebung ist verlassen',danach.labor===false,true);
  pruefe('Kampf-Infos sind wieder weg',!danach.kampflog&&!danach.infoKnopf&&!danach.infoReihe&&!danach.blatt,true);
  pruefe('Faehigkeitszeilen stehen wieder im Zug',danach.faehigkeitenAnzeige!=='none',true);

  await p.close();
}catch(e){absturz=e;}

const ERWARTET=18;
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
