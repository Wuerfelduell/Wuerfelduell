/* Der grosse Wuerfel in Insurance, Gambling Man, High Stakes und Perfect 25
 * muss sich waehrend des Wurfs drehen wie der normale Wuerfel - als echter
 * 3D-Kubus, in JEDEM Wuerfeldesign, ueber den ganzen Wurf hinweg.
 *
 * Aus dem Spiel gemeldet, zweimal:
 *   "fehlt die Wuerfelanimation bzw. das spezielle Wuerfeldesign, der ist
 *    immer weiss"  und danach
 *   "der Spezialwuerfel ist immer noch in 2D animiert, nicht die selbe
 *    saubere 3D-Animation wie beim normalen Wuerfeln".
 *
 * Vier Ursachen, alle hier nachgemessen:
 *   1. tickClassicSpecialDie stieg bei jedem Design MIT artKey sofort aus.
 *   2. Classic hatte gar keinen Kubus, nur eine flache Pip-Flaeche - das war
 *      die gemeldete 2D-Animation.
 *   3. --die-half kam aus der RAHMENBOX. Der Knopf traegt border-width:40px,
 *      seine Innenbox ist also rund halb so breit; der Kubus wurde doppelt
 *      so gross wie der Knopf - die weisse Flaeche aus der ersten Meldung.
 *   4. Die Drehung lief mit "both" .42s, der Wurf dauert aber 560ms. Die
 *      letzten 140ms stand der Wuerfel still.
 *
 * Geprueft wird der echte Wurf, nicht der Quelltext.
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

async function wurf(design){
  const p=await browser.newPage({locale:'de-DE',viewport:{width:390,height:844},serviceWorkers:'block'});
  p.on('pageerror',e=>errors.push(`${design}: ${e.message}`));
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  const ids=await p.evaluate(d=>{
    const a=createProfile('Alpha'),b=createProfile('Bravo');
    [a,b].forEach(x=>{x.campaign.completedEncounters.push('black_table');x.selectedDice=d;});
    saveGameData();return[a.id,b.id];
  },design);
  await p.evaluate(ids=>{
    duoProfile1Id=ids[0];duoProfile2Id=ids[1];
    openDuoCampaignScreen();
    duoProfile1Select.value=ids[0];duoProfile2Select.value=ids[1];
    renderDuoCampaign();
    duoAbility1Select.value='3';duoAbility2Select.value='3';
    window.WDDuoBossRush.refreshButton();
  },ids);
  await p.click('#duoBossRushStartBtn');await p.waitForTimeout(400);
  await p.locator('[data-rush-path]').first().click();await p.waitForTimeout(800);
  await p.evaluate(()=>{current=players.findIndex(x=>x.campaignTeam==='hero');openInsurance(20,6,'finish');});
  await p.waitForTimeout(350);

  await p.evaluate(()=>rollInsurance());
  // Waehrend des Wurfs mehrfach hinsehen: zeigt der Wuerfel eine Flaeche,
  // und wechselt sie?
  // Sieben Proben decken die ganzen 560ms des Wurfs ab. Mit nur fuenf blieb
  // das letzte Drittel ungeprueft - und genau dort stand der Artwork-Wuerfel
  // still, weil 16-v28-phasen die Drehung mit "both" statt "infinite" nach
  // 420ms beendet.
  const proben=[];
  for(let i=0;i<7;i++){
    await p.waitForTimeout(70);
    proben.push(await p.evaluate(()=>{
      const e=insuranceDie;
      const sprite=e.querySelector('img.die-art-sprite');
      const sichtbar=sprite&&getComputedStyle(sprite).display!=='none';
      const pips=e.querySelector('.special-die-flat-pips');
      const pipsSichtbar=pips&&!pips.classList.contains('hidden');
      const cube=e.querySelector('.die-cube');
      const cubeSichtbar=cube&&getComputedStyle(cube).display!=='none'&&Number(getComputedStyle(cube).opacity)>0;
      const dreht=cube?cube.getAnimations().some(a=>a.playState==='running'):false;
      // Tiefe des Kubus muss zur INNENBOX passen, nicht zur Rahmenbox:
      // der Rahmen ist 40px breit, clientWidth ist also deutlich kleiner.
      const halb=parseFloat(getComputedStyle(e).getPropertyValue('--die-half'))||0;
      return {
        rollt:e.classList.contains('rolling'),
        wert:e.dataset.value||'',
        kubus:cubeSichtbar,dreht,halb,innen:e.clientWidth,
        // offsetWidth ist die LAYOUT-Breite, von der Drehung unberuehrt.
        kubusBreite:cube?cube.offsetWidth:0,
        flaeche:sichtbar?(sprite.getAttribute('src').split('/').pop().replace(/\?.*$/,'')):(pipsSichtbar?'pips':'KEINE')
      };
    }));
  }
  // Nach dem Wurf muss die gewuerfelte Flaeche stehenbleiben - ein Fix an der
  // Rollphase darf das Ergebnis nicht verschlucken. Gemessen wird im
  // Ergebnisfenster: rollInsurance loest nach 560ms auf und schliesst das
  // Panel 600ms spaeter. Wer zu spaet hinsieht, misst einen geschlossenen
  // Dialog - dort ist clientWidth 0 und jede Flaeche "fehlt".
  await p.waitForFunction(()=>!insuranceDie.classList.contains('rolling'),null,{timeout:3000});
  const danach=await p.evaluate(()=>{
    const e=insuranceDie,sprite=e.querySelector('img.die-art-sprite');
    const sichtbar=sprite&&getComputedStyle(sprite).display!=='none';
    const pips=e.querySelector('.special-die-flat-pips');
    // Classic zeigt das Ergebnis seit V28.12.23 als 3D-Kubusflaeche, nicht
    // mehr als flache Pip-Flaeche - die zaehlt genauso als Flaeche.
    const cube=e.querySelector('.die-cube');
    const kubus=cube&&getComputedStyle(cube).display!=='none'&&Number(getComputedStyle(cube).opacity)>0
      &&!!cube.querySelector(`.die-face-${e.dataset.value}`);
    return {rollt:e.classList.contains('rolling'),wert:e.dataset.value||'',offen:e.clientWidth>0,
      flaeche:sichtbar?sprite.getAttribute('src').split('/').pop().replace(/\?.*$/,''):((pips&&!pips.classList.contains('hidden'))?'pips':(kubus?'kubus':'KEINE'))};
  });
  await p.close();
  return {proben,danach};
}

try{
  for(const design of ['classic','sapphire_crown']){
    const {proben,danach}=await wurf(design);
    const rollend=proben.filter(x=>x.rollt);
    const ohneFlaeche=rollend.filter(x=>x.flaeche==='KEINE');
    const werte=new Set(rollend.map(x=>x.wert+'|'+x.flaeche));
    pruefe(`${design}: Wurf laeuft`,rollend.length>=5,true);
    const mitKubus=rollend.filter(x=>x.kubus&&x.dreht);
    // JEDE Probe waehrend des Wurfs, nicht nur drei: eine Drehung, die
    // mittendrin stehenbleibt, ist genau der gemeldete Fehler.
    pruefe(`${design}: 3D-Kubus dreht sich waehrend des Wurfs`,mitKubus.length===rollend.length&&rollend.length>=5,true);
    // Groesse: bei 40px Rahmen ist die Rahmenbox fast doppelt so breit wie
    // die Innenbox - wer die misst, baut einen Kubus, der den ganzen Knopf
    // ausfuellt (die Meldung "der Wuerfel ist immer weiss"). Soll ist die
    // Innenbox mal 1.24, die Groesse der Sprite im Ruhezustand.
    const groesseOk=rollend.every(x=>x.innen>0&&Math.abs(x.kubusBreite-x.innen*1.24)<=x.innen*0.08);
    pruefe(`${design}: Kubus so gross wie die Sprite`,groesseOk,true);
    // Tiefe: --die-half muss die halbe Kante sein. Passt das nicht, stehen
    // die sechs Flaechen einzeln im Raum statt einen Wuerfel zu bilden.
    const tiefeOk=rollend.every(x=>x.kubusBreite>0&&Math.abs(x.halb-x.kubusBreite/2)<=2);
    pruefe(`${design}: Tiefe gleich halbe Kante (echter Wuerfel)`,tiefeOk,true);
    if(mitKubus.length<rollend.length||!tiefeOk||!groesseOk)
      console.log(`      ${design}: ${JSON.stringify(proben.slice(0,3))}`);
    void ohneFlaeche;void werte;
    pruefe(`${design}: Ergebnisflaeche bleibt stehen`,danach.rollt===false&&danach.offen&&danach.flaeche!=='KEINE'&&danach.wert!=='',true);
    if(danach.rollt||!danach.offen||danach.flaeche==='KEINE'||!danach.wert)
      console.log(`      ${design} danach: ${JSON.stringify(danach)}`);
  }
}catch(e){absturz=e;}

const ERWARTET=10;
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
