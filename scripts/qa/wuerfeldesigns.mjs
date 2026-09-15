/* Neue Wuerfeldesigns: vollstaendig, masshaltig, nur in der Testumgebung.
 *
 * Aus dem Spiel: "anbei neue Assets fuer neue Wuerfel, bitte wie immer
 * implementieren und downscalen ... die kann man aber alle noch nicht
 * freischalten, aber in der Testumgebung sollten sie rein zum Testen."
 *
 * Geprueft wird:
 *   1. Jedes Design bringt acht Dateien mit (sechs Flaechen, Ruheflaeche,
 *      Vorschau) und jede laedt wirklich.
 *   2. Alle Bilder sind 512x512, und der Wuerfel sitzt in demselben Feld
 *      wie bei den vorhandenen Designs - sonst springt er beim Wechsel.
 *   3. Im Kampf traegt der grosse Wuerfel die Flaeche des Designs.
 *   4. Die Testumgebung kann sie auswaehlen.
 *   5. Im Profil taucht KEINES davon auf: es gibt noch keinen Weg, sie
 *      freizuschalten, ein Schloss ohne Schluessel waere eine Luege.
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

// Das Mass der vorhandenen Designs, am Bild nachgemessen: der Wuerfel
// sitzt waagrecht von 8.8% bis 91.2% der 512er Kante.
const FELD={links:8.8,rechts:91.2,toleranz:1.2};
const NEU=['walnut_lodge','tide_pearl','azure_storm','nebula_veil','solar_relic'];

try{
  const p=await browser.newPage({locale:'de-DE',viewport:{width:390,height:844},serviceWorkers:'block'});
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForTimeout(400);

  // 1./2. Dateien laden und messen - im Browser, nicht am Dateisystem.
  const bilder=await p.evaluate(async neu=>{
    const messe=async quelle=>{
      const img=new Image();img.src=quelle;
      try{await img.decode();}catch{return {quelle,fehler:'laedt nicht'};}
      const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
      const g=c.getContext('2d');g.drawImage(img,0,0);
      const d=g.getImageData(0,0,c.width,c.height).data;
      let links=c.width,rechts=0;
      const mitte=Math.floor(c.height/2);
      for(let y=Math.floor(c.height*0.2);y<c.height*0.8;y+=4){
        for(let x=0;x<c.width;x++){
          if(d[(y*c.width+x)*4+3]>24){if(x<links)links=x;break;}
        }
        for(let x=c.width-1;x>=0;x--){
          if(d[(y*c.width+x)*4+3]>24){if(x>rechts)rechts=x;break;}
        }
      }
      void mitte;
      return {quelle,breite:c.width,hoehe:c.height,
        links:Math.round(1000*links/c.width)/10,rechts:Math.round(1000*(rechts+1)/c.width)/10};
    };
    const aus={};
    for(const schluessel of neu){
      const art=DICE_DESIGNS[schluessel]?.artKey;
      const teile=['1','2','3','4','5','6','question'].map(n=>`assets/ui/v28/png/dice-designs/${art}/${art}-face-${n}.webp?v=${ASSET_REV}`);
      teile.push(DICE_DESIGNS[schluessel].previewAsset+`?v=${ASSET_REV}`);
      aus[schluessel]=[];
      for(const t of teile) aus[schluessel].push(await messe(t));
    }
    return aus;
  },NEU);

  const fehlend=[],falschesMass=[],falschesFeld=[];
  for(const [design,dateien] of Object.entries(bilder)){
    if(dateien.length!==8) fehlend.push(`${design}: ${dateien.length} statt 8`);
    for(const d of dateien){
      const name=d.quelle.split('/').pop().split('?')[0];
      if(d.fehler){fehlend.push(`${design}/${name}`);continue;}
      if(d.breite!==512||d.hoehe!==512) falschesMass.push(`${design}/${name} ${d.breite}x${d.hoehe}`);
      // Die Vorschau ist ein Wuerfelbild, kein Flaechenbild - sie hat ihr
      // eigenes Mass und bleibt hier aussen vor.
      if(name.includes('-beauty')) continue;
      if(Math.abs(d.links-FELD.links)>FELD.toleranz||Math.abs(d.rechts-FELD.rechts)>FELD.toleranz)
        falschesFeld.push(`${design}/${name} ${d.links}..${d.rechts}`);
    }
  }
  pruefe('alle acht Dateien je Design vorhanden',fehlend.length===0,true);
  if(fehlend.length)console.log(`      fehlt: ${fehlend.slice(0,6).join(', ')}`);
  pruefe('alle Bilder 512x512',falschesMass.length===0,true);
  if(falschesMass.length)console.log(`      Mass: ${falschesMass.slice(0,6).join(', ')}`);
  pruefe('Wuerfelfeld wie bei den vorhandenen Designs',falschesFeld.length===0,true);
  if(falschesFeld.length)console.log(`      Feld: ${falschesFeld.slice(0,6).join(', ')}`);

  // 5. Im Profil taucht keines auf.
  await p.evaluate(()=>{createProfile('Prueferin');saveGameData();});
  await p.click('#menuProfilesBtn');await p.waitForTimeout(500);
  const imProfil=await p.evaluate(neu=>{
    const karten=[...document.querySelectorAll('[data-dice-design]')].map(k=>k.dataset.diceDesign);
    return {gefunden:neu.filter(k=>karten.includes(k)),karten:karten.length};
  },NEU);
  // Die Liste muss ueberhaupt gerendert sein, sonst prueft das nichts.
  pruefe('kein neues Design im Profil',imProfil.karten>0&&imProfil.gefunden.length===0,true);
  if(imProfil.gefunden.length||!imProfil.karten)console.log(`      im Profil: ${JSON.stringify(imProfil)}`);

  // 4. Die Testumgebung kennt sie.
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForTimeout(400);
  await p.click('#menuTutorialBtn');await p.waitForTimeout(250);
  await p.click('#tutorialHubLabBtn');await p.waitForTimeout(350);
  const karten=p.locator('#testLabAbilityGrid > *');
  await karten.nth(2).click();await karten.nth(10).click();
  await p.click('#testLabStartBtn');await p.waitForTimeout(800);
  const imLabor=await p.evaluate(neu=>{
    const auswahl=document.getElementById('testLabDiceSelect');
    if(!auswahl) return {fehlt:'Auswahl fehlt'};
    const werte=[...auswahl.options].map(o=>o.value);
    return {fehlen:neu.filter(k=>!werte.includes(k))};
  },NEU);
  pruefe('Testumgebung bietet alle neuen Designs an',imLabor.fehlen?.length===0,true);
  if(imLabor.fehlen?.length||imLabor.fehlt)console.log(`      Labor: ${JSON.stringify(imLabor)}`);

  // 3. Und der Wuerfel traegt im Kampf wirklich die Flaeche des Designs.
  const getragen=[];
  for(const schluessel of NEU){
    const quelle=await p.evaluate(async schluessel=>{
      const auswahl=document.getElementById('testLabDiceSelect');
      auswahl.value=schluessel;
      auswahl.dispatchEvent(new Event('change',{bubbles:true}));
      await new Promise(r=>setTimeout(r,120));
      const w=document.querySelector('#dice .die img.die-art-sprite');
      return w?w.getAttribute('src').split('/').slice(-1)[0]:'keine Sprite';
    },schluessel);
    const art=schluessel.replace(/_/g,'-');
    if(!quelle.startsWith(art)) getragen.push(`${schluessel}: ${quelle}`);
  }
  pruefe('der Wuerfel im Kampf traegt die neue Flaeche',getragen.length===0,true);
  if(getragen.length)console.log(`      Flaeche: ${getragen.join(', ')}`);
  await p.close();
}catch(e){absturz=e;}

const ERWARTET=6;
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
