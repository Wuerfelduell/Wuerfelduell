/* Spielerkarten: liegt Text unter dem gemalten Rahmen?
 *
 * Aus dem Spiel gemeldet, mit Bildschirmfoto: "teilweise gehen die Texte
 * noch immer raus aus dem Feld (ist mir am Desktop aufgefallen), vor allem
 * beim Boss Rush faellt's auf". Im Trio-Boss-Rush war vom Gegnernamen nur
 * das Ende zu lesen - "...oreman" statt "Foreman".
 *
 * Die Ursache ist in beiden Kartenarten dieselbe: der Rahmen wird IN die
 * Innenflaeche gemalt, der Inhalt beginnt aber am Kartenrand.
 *   - Die normalen Spielerkarten zeichnen ihn mit border-image-width
 *     (19/22px, Boss 26/32px) bei border-width:0. Eine echte Randbreite
 *     bekommen sie nur unter 540px.
 *   - Die Gegnerkarten im Boss Rush malen ihn als ::after ueber die Karte
 *     und ziehen das Bild auf 100% 100%. Das Band ist dort ein ANTEIL der
 *     Karte: am Bild gemessen bis 9.8% der Breite je Seite.
 *
 * Geprueft wird die Lage am laufenden Kampf, gegen das Band, das die Karte
 * sich selbst gibt - nicht gegen eine Zahl aus dem Stylesheet.
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

// Das breiteste gemessene Band der Weltrahmen, als Anteil der Karte.
// Quelle: die Bilder selbst (assets/ui/v28/png/worlds/*-frame-rect.webp),
// von der Mitte nach aussen bis zum ersten undurchsichtigen Pixel.
const WELTBAND={seite:0.098};

const MESSUNG=`(band)=>{
  const treffer=[];
  document.querySelectorAll('#players .player').forEach((karte,i)=>{
    const cs=getComputedStyle(karte);
    const kr=karte.getBoundingClientRect();
    const px=w=>parseFloat(w)||0;
    // Wie weit malt die Karte ihren Rahmen nach innen?
    let bandL=0,bandR=0,bandO=0,bandU=0;
    if(cs.borderImageSource!=='none'){
      const [o,r,u,l]=(cs.borderImageWidth||'0px').split(' ');
      const w=[o,r||o,u||o,l||r||o].map(px);
      bandO=Math.max(0,w[0]-px(cs.borderTopWidth));
      bandR=Math.max(0,w[1]-px(cs.borderRightWidth));
      bandU=Math.max(0,w[2]-px(cs.borderBottomWidth));
      bandL=Math.max(0,w[3]-px(cs.borderLeftWidth));
    }
    // Rahmenschicht als ::after mit gestrecktem Bild: Anteil der Karte.
    // Nur bei den Rush-Gegnern - die aktive Spielerkarte traegt ebenfalls
    // ein ::after, aber als Schein bei inset:-11px, also AUSSERHALB.
    const nach=getComputedStyle(karte,'::after');
    if(karte.classList.contains('boss-rush-world-enemy')
       &&nach.content!=='none'&&/frame|card/.test(nach.backgroundImage)){
      // Nur die Seiten. Oben und unten ueberlappt der gemalte Rahmen
      // bewusst - das Bild bleibt ungeschnitten (feste Entscheidung,
      // verify-build.mjs wacht darueber), und dort steht der Name lesbar.
      bandL=Math.max(bandL,kr.width*band.seite);
      bandR=Math.max(bandR,kr.width*band.seite);
    }
    const frei={
      links:kr.left+px(cs.borderLeftWidth)+bandL,
      rechts:kr.right-px(cs.borderRightWidth)-bandR,
      oben:kr.top+px(cs.borderTopWidth)+bandO,
      unten:kr.bottom-px(cs.borderBottomWidth)-bandU};
    karte.querySelectorAll('*').forEach(el=>{
      if(el.children.length) return;
      const t=(el.textContent||'').trim();
      if(!t) return;
      const r=el.getBoundingClientRect();
      if(r.width<=0||r.height<=0) return;
      const drunter=Math.round(Math.max(frei.links-r.left,r.right-frei.rechts,
                                        frei.oben-r.top,r.bottom-frei.unten));
      if(drunter>1) treffer.push({karte:i,
        art:karte.className.includes('boss-rush-world-enemy')?'rush-gegner'
           :karte.className.includes('v28-boss-player')?'boss':'held',
        el:String(el.className).slice(0,20)||el.tagName,
        text:t.replace(/\\s+/g,' ').slice(0,20),drunter});
    });
  });
  return treffer;
}`;

async function trioRush(breite){
  const p=await browser.newPage({locale:'de-DE',viewport:{width:breite,height:900},serviceWorkers:'block'});
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForTimeout(400);
  const ids=await p.evaluate(()=>{
    const ps=['Seb','Jürgen','Luk'].map(n=>{const x=createProfile(n);x.campaign.completedEncounters.push('black_table');return x;});
    saveGameData();return ps.map(x=>x.id);
  });
  await p.evaluate(ids=>{
    trioProfile1Id=ids[0];trioProfile2Id=ids[1];trioProfile3Id=ids[2];
    openTrioCampaignScreen();
    trioProfile1Select.value=ids[0];trioProfile2Select.value=ids[1];trioProfile3Select.value=ids[2];
    renderTrioCampaign();
    trioAbility1Select.value='3';trioAbility2Select.value='3';trioAbility3Select.value='3';
    window.WDTrioBossRush.refreshButton();},ids);
  await p.click('#trioBossRushStartBtn');await p.waitForTimeout(500);
  await p.locator('[data-rush-path]').first().click();await p.waitForTimeout(1000);
  return p;
}

try{
  for(const breite of [700,1000,1280,1600]){
    const p=await trioRush(breite);
    const treffer=await p.evaluate(`(${MESSUNG})(${JSON.stringify(WELTBAND)})`);
    pruefe(`${breite}px: kein Text unter dem Rahmen`,treffer.length===0,true);
    if(treffer.length){
      const kurz=treffer.slice(0,6).map(t=>`${t.art}/${t.el} "${t.text}" ${t.drunter}px`);
      console.log(`      ${breite}px: ${kurz.join(' · ')}`);
    }
    // Der Rahmen darf nicht in die Innenflaeche malen: wo eine Karte ein
    // border-image traegt, muss die Randbreite mindestens so gross sein.
    const uebermalt=await p.evaluate(()=>{
      const raus=[];
      document.querySelectorAll('#players .player').forEach(karte=>{
        const cs=getComputedStyle(karte);
        if(cs.borderImageSource==='none') return;
        const px=w=>parseFloat(w)||0;
        const [o,r,u,l]=(cs.borderImageWidth||'0px').split(' ');
        const w=[o,r||o,u||o,l||r||o].map(px);
        const rand=[px(cs.borderTopWidth),px(cs.borderRightWidth),px(cs.borderBottomWidth),px(cs.borderLeftWidth)];
        // Ohne echte Randbreite ersetzt die Polsterung sie.
        const polster=[px(cs.paddingTop),px(cs.paddingRight),px(cs.paddingBottom),px(cs.paddingLeft)];
        const fehlt=w.map((band,k)=>Math.round(band-rand[k]-polster[k])).filter(x=>x>0);
        if(fehlt.length) raus.push({klasse:String(karte.className).slice(0,40),band:w.join('/'),rand:rand.join('/'),polster:polster.join('/')});
      });
      return raus;
    });
    pruefe(`${breite}px: Rahmen malt nicht in die Innenflaeche`,uebermalt.length===0,true);
    if(uebermalt.length)console.log(`      ${breite}px: ${JSON.stringify(uebermalt[0])}`);
    await p.close();
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
