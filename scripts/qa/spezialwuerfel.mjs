/* Der grosse Wuerfel in Insurance, Gambling Man, High Stakes und Perfect 25
 * muss waehrend des Wurfs eine Wuerfelflaeche zeigen, und zwar eine, die sich
 * aendert - in JEDEM Wuerfeldesign.
 *
 * Aus dem Spiel gemeldet: "fehlt die Wuerfelanimation bzw. das spezielle
 * Wuerfeldesign, der Wuerfel ist immer weiss". Nachgemessen stimmt beides,
 * aber die Ursache liegt nicht am Design:
 *
 *   tickClassicSpecialDie (js/13-battle-actions.js) steigt bei jedem Design
 *   MIT artKey sofort aus. Wer ein Artwork-Design traegt, bekommt also gar
 *   keinen Flaechenwechsel; dazu blendet .theme-art-die.rolling die Sprite
 *   aus. Ergebnis: waehrend des Wurfs ist die Flaeche leer.
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
  const proben=[];
  for(let i=0;i<5;i++){
    await p.waitForTimeout(70);
    proben.push(await p.evaluate(()=>{
      const e=insuranceDie;
      const sprite=e.querySelector('img.die-art-sprite');
      const sichtbar=sprite&&getComputedStyle(sprite).display!=='none';
      const pips=e.querySelector('.special-die-flat-pips');
      const pipsSichtbar=pips&&!pips.classList.contains('hidden');
      return {
        rollt:e.classList.contains('rolling'),
        wert:e.dataset.value||'',
        flaeche:sichtbar?(sprite.getAttribute('src').split('/').pop().replace(/\?.*$/,'')):(pipsSichtbar?'pips':'KEINE')
      };
    }));
  }
  // Nach dem Wurf muss die gewuerfelte Flaeche stehenbleiben - ein Fix an der
  // Rollphase darf das Ergebnis nicht verschlucken.
  await p.waitForTimeout(1200);
  const danach=await p.evaluate(()=>{
    const e=insuranceDie,sprite=e.querySelector('img.die-art-sprite');
    const sichtbar=sprite&&getComputedStyle(sprite).display!=='none';
    const pips=e.querySelector('.special-die-flat-pips');
    return {rollt:e.classList.contains('rolling'),wert:e.dataset.value||'',
      flaeche:sichtbar?sprite.getAttribute('src').split('/').pop().replace(/\?.*$/,''):((pips&&!pips.classList.contains('hidden'))?'pips':'KEINE')};
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
    pruefe(`${design}: Wurf laeuft`,rollend.length>=3,true);
    pruefe(`${design}: Wuerfel zeigt waehrend des Wurfs eine Flaeche`,ohneFlaeche.length===0,true);
    pruefe(`${design}: die Flaeche wechselt`,werte.size>=2,true);
    if(ohneFlaeche.length||werte.size<2)
      console.log(`      ${design}: ${JSON.stringify(proben)}`);
    pruefe(`${design}: Ergebnisflaeche bleibt stehen`,danach.rollt===false&&danach.flaeche!=='KEINE'&&danach.wert!=='',true);
    if(danach.rollt||danach.flaeche==='KEINE'||!danach.wert)
      console.log(`      ${design} danach: ${JSON.stringify(danach)}`);
  }
}catch(e){absturz=e;}

const ERWARTET=8;
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
