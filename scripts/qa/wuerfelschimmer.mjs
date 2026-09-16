/* Wuerfeleffekte in der Testumgebung.
 *
 * Aus dem Spiel: "ein gelber Glow, der von links nach rechts ueber jeden
 * Wuerfel einzeln drueberfaehrt", 500-700 ms, nur in der Testumgebung.
 * Dazu: "neuen cosmetic tab rein nur in der test, dann sehe ich mir an, zu
 * welchen Wuerfeln wir welchen Effekt pinnen".
 *
 * Geprueft wird:
 *   1. In der Testumgebung traegt jeder Wuerfel den Schimmer, ueber der
 *      Artwork-Flaeche (z-index 3 gegen 2).
 *   2. Der Versatz je Wuerfel steigt - sonst blitzen alle gleichzeitig
 *      statt als Welle von links nach rechts zu laufen.
 *   3. Der sichtbare Durchlauf liegt zwischen 500 und 700 ms. Er ist nicht
 *      die halbe Fahrtdauer: bei background-size 300% ist nur ein Drittel
 *      des Verlaufs im Bild, der helle Streifen steht also nur waehrend der
 *      mittleren HAELFTE der Positionsfahrt darin.
 *   4. Waehrend des Wurfs ist er aus - dort dreht sich der 3D-Kubus.
 *   5. Im normalen Spiel gibt es ihn nicht.
 *   5b. Der Regler in der Werkbank kennt alle Effekte, und jeder schaltet
 *      wirklich um - "keiner" laesst nichts stehen.
 *   6. Die Wuerfel behalten overflow:visible. Das ist die Falle an dieser
 *      Aufgabe: die Artwork-Flaeche wird mit scale(1.24) ueber den Rand
 *      hinaus gezeichnet. Wer den Wuerfel beschneidet, um einen wandernden
 *      Streifen zu begrenzen, macht jedes Artwork-Design sichtbar kleiner.
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

async function seite(){
  const p=await browser.newPage({locale:'de-DE',viewport:{width:390,height:844},serviceWorkers:'block'});
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForTimeout(400);
  return p;
}

// Aus den Keyframes ablesen, wie lange der helle Streifen wirklich zu sehen
// ist - nicht aus der Gesamtdauer raten.
function sichtbarerDurchlauf(dauerMs,anteilProzent,hintergrundGroesseProzent){
  const fahrt=dauerMs*anteilProzent/100;                // Dauer der Positionsfahrt
  const fenster=100/hintergrundGroesseProzent;          // Anteil des Verlaufs im Bild
  // Das Fenster wandert nur ueber (1-fenster) des Verlaufs; der helle
  // Streifen steht darin, solange die Fensterbreite ihn ueberdeckt. Also
  // fenster/(1-fenster) der Fahrt, bei 300% genau die Haelfte.
  return fahrt*fenster/(1-fenster);
}

try{
  const p=await seite();
  await p.click('#menuTutorialBtn');await p.waitForTimeout(250);
  await p.click('#tutorialHubLabBtn');await p.waitForTimeout(350);
  const karten=p.locator('#testLabAbilityGrid > *');
  await karten.nth(2).click();await karten.nth(10).click();
  await p.click('#testLabStartBtn');await p.waitForTimeout(900);

  const labor=await p.evaluate(()=>{
    const wuerfel=[...document.querySelectorAll('#dice .die')];
    const lies=(el,pseudo)=>{const cs=getComputedStyle(el,pseudo);return {
      name:cs.animationName,dauer:cs.animationDuration,verzoegerung:cs.animationDelay,
      zeitfunktion:cs.animationTimingFunction,zIndex:cs.zIndex,groesse:cs.backgroundSize};};
    return {
      anzahl:wuerfel.length,
      schimmer:wuerfel.map(w=>lies(w,'::after')),
      sprite:wuerfel[0]?getComputedStyle(wuerfel[0].querySelector('.die-art-sprite')||wuerfel[0]).zIndex:null,
      overflow:wuerfel.map(w=>getComputedStyle(w).overflow)
    };
  });

  pruefe('Testumgebung: jeder Wuerfel traegt den Schimmer',
    labor.anzahl>=5&&labor.schimmer.every(s=>s.name==='wuerfelSchimmer'),true);
  if(!labor.schimmer.every(s=>s.name==='wuerfelSchimmer'))
    console.log(`      Schimmer: ${JSON.stringify(labor.schimmer.map(s=>s.name))}`);

  // Er muss UEBER der Artwork-Flaeche liegen, sonst schimmert es unter den
  // Augen und man sieht fast nichts.
  pruefe('Schimmer liegt ueber der Artwork-Flaeche',labor.schimmer.every(s=>Number(s.zIndex)>=3),true);

  const verzoegerungen=labor.schimmer.map(s=>Math.round(parseFloat(s.verzoegerung)*1000));
  const steigend=verzoegerungen.every((v,i)=>i===0?v===0:v>verzoegerungen[i-1]);
  pruefe('Versatz je Wuerfel steigt (Welle statt Blitz)',steigend,true);
  if(!steigend)console.log(`      Versatz: ${JSON.stringify(verzoegerungen)}`);

  // 3. Sichtbarer Durchlauf aus den echten Keyframes rechnen.
  const takt=await p.evaluate(()=>{
    for(const blatt of document.styleSheets){
      let regeln;try{regeln=[...blatt.cssRules];}catch{continue;}
      for(const r of regeln){
        if(r.type===CSSRule.KEYFRAMES_RULE&&r.name==='wuerfelSchimmer'){
          const marken=[...r.cssRules].map(k=>({bei:parseFloat(k.keyText),wert:k.style.backgroundPosition}));
          // Die Fahrt endet, sobald sich die Position nicht mehr aendert.
          const ende=marken.find((m,i)=>i>0&&m.wert===marken[marken.length-1].wert);
          return {ende:ende?ende.bei:null,marken};
        }
      }
    }
    return null;
  });
  const dauerMs=parseFloat(labor.schimmer[0].dauer)*1000;
  const groesse=parseFloat(labor.schimmer[0].groesse);
  const durchlauf=takt?.ende?Math.round(sichtbarerDurchlauf(dauerMs,takt.ende,groesse)):0;
  pruefe('Sichtbarer Durchlauf zwischen 500 und 700 ms',durchlauf>=500&&durchlauf<=700,true);
  console.log(`      Durchlauf: ${durchlauf} ms (Takt ${dauerMs} ms, Fahrt bis ${takt?.ende}%, Hintergrund ${groesse}%)`);

  // Linear, nicht beschleunigt: mit ease-in-out huscht der Streifen in der
  // Mitte durch und wirkt wie ein Blitz.
  pruefe('Durchlauf laeuft gleichmaessig',labor.schimmer[0].zeitfunktion==='linear',true);

  // 6. Die Wuerfel duerfen nicht beschnitten werden.
  pruefe('Wuerfel bleiben unbeschnitten (Artwork ragt bewusst hinaus)',
    labor.overflow.every(o=>o==='visible'),true);
  if(!labor.overflow.every(o=>o==='visible'))console.log(`      overflow: ${JSON.stringify(labor.overflow)}`);

  // 5b. Der Regler schaltet wirklich um. Geprueft wird der Animationsname
  // am Wuerfel, nicht der Wert im Auswahlfeld: ein Regler, der nichts
  // bewirkt, waere sonst gruen.
  const regler=await p.evaluate(async()=>{
    const sel=document.getElementById('testLabDiceFxSelect');
    if(!sel) return {fehlt:true};
    const werte=[...sel.options].map(o=>o.value);
    const gemessen={};
    for(const w of werte){
      sel.value=w;sel.dispatchEvent(new Event('change',{bubbles:true}));
      await new Promise(r=>setTimeout(r,60));
      const d=document.querySelector('#dice .die');
      const cs=getComputedStyle(d,'::after');
      // Der Kantenlaeufer laeuft nicht auf ::after, sondern auf eigenen
      // Knoten im Wuerfel. Wer nur ::after misst, haelt ihn faelschlich
      // fuer einen Regler ohne Wirkung.
      const glied=d.querySelector(':scope > i.die-kante');
      gemessen[w]={name:cs.animationName!=='none'?cs.animationName
        :(glied?getComputedStyle(glied).animationName:'none'),inhalt:cs.content};
    }
    sel.value='schimmer-gold';sel.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(r=>setTimeout(r,60));
    return {werte,gemessen};
  });
  pruefe('Werkbank bietet den Effektregler',!regler.fehlt&&regler.werte.length>=4,true);
  const namen=Object.entries(regler.gemessen||{}).filter(([k])=>k!=='keiner').map(([,v])=>v.name);
  const alleWirken=namen.length>=3&&namen.every(n=>n&&n!=='none')&&new Set(namen).size>=2;
  pruefe('Jeder Effekt schaltet wirklich um',alleWirken,true);
  if(!alleWirken)console.log(`      Regler: ${JSON.stringify(regler.gemessen)}`);
  pruefe('"Keiner" laesst nichts stehen',regler.gemessen?.keiner?.inhalt==='none',true);
  if(regler.gemessen?.keiner?.inhalt!=='none')console.log(`      keiner: ${JSON.stringify(regler.gemessen?.keiner)}`);

  // Aus dem Spieltest: "Randgluehen und Puls sehen zu erzwungen aus, die
  // machen einmal einen kurzen Tick und sind dann wieder weg." Ursache war
  // der Versatz je Wuerfel: bei einem ATMENDEN Effekt blitzt die Reihe
  // dadurch innerhalb einer halben Sekunde durch und ruht dann. Wandernde
  // Effekte brauchen den Versatz, atmende duerfen ihn nicht haben.
  const versatz=await p.evaluate(async()=>{
    const sel=document.getElementById('testLabDiceFxSelect');
    const messe=async w=>{
      sel.value=w;sel.dispatchEvent(new Event('change',{bubbles:true}));
      await new Promise(r=>setTimeout(r,60));
      return [...document.querySelectorAll('#dice .die')]
        .map(d=>Math.round(parseFloat(getComputedStyle(d,'::after').animationDelay)*1000));
    };
    const aus={wandernd:await messe('schimmer-gold'),atmend:await messe('rand'),puls:await messe('puls')};
    sel.value='schimmer-gold';sel.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(r=>setTimeout(r,60));
    return aus;
  });
  pruefe('Wandernde Effekte laufen versetzt',versatz.wandernd.some((v,i)=>i>0&&v>0),true);
  const atmenGleich=versatz.atmend.every(v=>v===0)&&versatz.puls.every(v=>v===0);
  pruefe('Atmende Effekte atmen gleichzeitig',atmenGleich,true);
  if(!atmenGleich)console.log(`      Versatz: ${JSON.stringify(versatz)}`);

  // Und sie duerfen nie ganz ausgehen, sonst wirkt das Atmen wie ein Tick.
  const boden=await p.evaluate(async()=>{
    const sel=document.getElementById('testLabDiceFxSelect');
    const tiefste={};
    for(const w of ['rand','puls']){
      sel.value=w;sel.dispatchEvent(new Event('change',{bubbles:true}));
      await new Promise(r=>setTimeout(r,60));
      for(const blatt of document.styleSheets){
        let regeln;try{regeln=[...blatt.cssRules];}catch{continue;}
        for(const r of regeln){
          if(r.type!==CSSRule.KEYFRAMES_RULE)continue;
          if(!/wuerfel(Rand|Puls)/.test(r.name))continue;
          const werte=[...r.cssRules].map(k=>parseFloat(k.style.opacity)).filter(x=>!Number.isNaN(x));
          tiefste[r.name]={boden:Math.min(...werte),spitze:Math.max(...werte)};
        }
      }
    }
    sel.value='schimmer-gold';sel.dispatchEvent(new Event('change',{bubbles:true}));
    return tiefste;
  });
  const nieAus=Object.values(boden).length>=2&&Object.values(boden).every(b=>b.boden>=0.15&&b.spitze-b.boden<=0.6);
  pruefe('Atmende Effekte gehen nie ganz aus',nieAus,true);
  console.log(`      Atem: ${JSON.stringify(boden)}`);

  // Der Kantenlaeufer ist ein Kometenschweif aus einzelnen Punkten auf
  // EINER Bahn. Genau daran haengt der Effekt, und genau das ging dreimal
  // schief, solange der Schweif ein gemalter Kegelverlauf war: ein Verlauf
  // misst in Winkeln um die Wuerfelmitte, die Fahrt misst in Streckenlaenge
  // auf der Kante. Die Pruefung unten misst deshalb nicht Stilwerte,
  // sondern LAGE - ueber eine ganze Runde, im Lauf, ohne Pausieren.
  const laeufer=await p.evaluate(async()=>{
    const sel=document.getElementById('testLabDiceFxSelect');
    sel.value='kante';sel.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(r=>setTimeout(r,200));
    const d=document.querySelector('#dice .die');
    const g=[...d.querySelectorAll(':scope > i.die-kante')];
    if(g.length<2) return {glieder:g.length};
    const wf=d.getBoundingClientRect();
    // getComputedStyle liefert ein LEBENDES Objekt. Die Werte muessen
    // abgeschrieben werden, solange der Effekt noch laeuft - nach dem
    // Umschalten unten sind die Knoten weg und alles liest 0.
    const kopfRadius=getComputedStyle(g[0]).borderRadius;
    const kopfDauer=getComputedStyle(g[0]).animationDuration;
    const gliedDauer=getComputedStyle(g[g.length-1]).animationDuration;
    const proben=await new Promise(fertig=>{
      const aus=[],start=performance.now();
      (function frame(){
        aus.push(g.map(e=>{const b=e.getBoundingClientRect();
          return [b.x+b.width/2-wf.x, b.y+b.height/2-wf.y];}));
        if(performance.now()-start<4700) requestAnimationFrame(frame); else fertig(aus);
      })();
    });
    sel.value='schimmer-gold';sel.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(r=>setTimeout(r,120));
    const ohne=document.querySelectorAll('#dice .die > i.die-kante').length;
    return {glieder:g.length,breite:wf.width,proben,ohne,kopfRadius,kopfDauer,gliedDauer};
  });

  pruefe('Kantenlaeufer hat Kopf und Schweif auf einer Bahn',laeufer.glieder>=8,true);
  if(laeufer.glieder<8)console.log(`      Glieder: ${laeufer.glieder}`);

  if(laeufer.proben){
    const weg=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
    // Schrittweite je Bild, fuer Kopf und fuer das letzte Schweifglied.
    // Sprungwerte beim Rundenschluss werden verworfen.
    const tempo=i=>{const v=[];
      for(let k=1;k<laeufer.proben.length;k++){
        const s=weg(laeufer.proben[k-1][i],laeufer.proben[k][i]);
        if(s<laeufer.breite/2) v.push(s);}
      return v.sort((a,b)=>a-b);};
    const mittel=v=>v.reduce((a,b)=>a+b,0)/v.length;
    const tk=tempo(0),tl=tempo(laeufer.glieder-1);
    // DIE Kernpruefung: Kopf und Schweifende muessen im Mittel gleich
    // schnell sein. Beim Kegelverlauf lagen hier 1,53-fach dazwischen -
    // aus dem Spieltest: "jetzt ist der Streifen schneller".
    const verhaeltnis=mittel(tk)/mittel(tl);
    pruefe('Kopf und Schweifende laufen gleich schnell',
      verhaeltnis>0.97&&verhaeltnis<1.03,true);
    console.log(`      Tempo: Kopf ${mittel(tk).toFixed(2)} px/Bild, Schweifende ${mittel(tl).toFixed(2)} px/Bild (${verhaeltnis.toFixed(3)}-fach)`);

    // Der Schweif darf sich nicht vom Kopf loesen und nicht ueber die
    // Wuerfelkante hinausstehen - beides waren Spieltestbefunde.
    let maxAbstand=0,raus=0;
    for(const z of laeufer.proben){
      for(let j=0;j<z.length-1;j++) maxAbstand=Math.max(maxAbstand,weg(z[j],z[j+1]));
      for(const e of z) raus=Math.max(raus,-e[0],-e[1],e[0]-laeufer.breite,e[1]-laeufer.breite);
    }
    pruefe('Schweif haengt am Kopf (keine Luecke)',maxAbstand<=laeufer.breite*0.12,true);
    console.log(`      groesste Luecke: ${maxAbstand.toFixed(2)} px bei ${laeufer.breite.toFixed(1)} px Wuerfel`);
    pruefe('Nichts steht ueber die Wuerfelkante hinaus',raus<=0.5,true);
    if(raus>0.5)console.log(`      Ueberstand: ${raus.toFixed(2)} px`);
  }

  pruefe('Kopf ist rund und laeuft im selben Takt wie der Schweif',
    /50%|999/.test(laeufer.kopfRadius||'')&&laeufer.kopfDauer===laeufer.gliedDauer
    &&parseFloat(laeufer.kopfDauer||'0')>0,true);
  pruefe('Kein Kantenlaeufer bei den uebrigen Effekten',laeufer.ohne===0,true);

  // 4. Waehrend des Wurfs aus.
  const imWurf=await p.evaluate(async()=>{
    document.querySelector('#primaryBtn')?.click();
    await new Promise(r=>setTimeout(r,120));
    const w=document.querySelector('#dice .die.rolling');
    return w?getComputedStyle(w,'::after').animationName:'kein rollender Wuerfel';
  });
  pruefe('Waehrend des Wurfs kein Schimmer',imWurf==='none',true);
  if(imWurf!=='none')console.log(`      im Wurf: ${imWurf}`);
  await p.close();

  // 5. Im normalen Spiel gibt es ihn nicht.
  const n=await seite();
  await n.evaluate(()=>{createProfile('Prueferin');saveGameData();});
  await n.click('#menuPlayBtn');await n.waitForTimeout(400);
  await n.selectOption('#botChoice0','human');
  await n.selectOption('#botChoice1','easy');
  await n.waitForTimeout(200);
  await n.click('#rollAbilities');await n.waitForTimeout(900);
  await n.evaluate(()=>{
    document.querySelectorAll('.ability-choice:not(.hidden)').forEach(sel=>{
      const wahl=[...sel.options].find(o=>o.value&&!o.disabled);
      if(wahl){sel.value=wahl.value;sel.dispatchEvent(new Event('change',{bubbles:true}));}
    });
  });
  await n.waitForTimeout(200);
  await n.click('#startGame');await n.waitForTimeout(900);
  await n.locator('#primaryBtn').waitFor({state:'visible',timeout:45000});
  const spiel=await n.evaluate(()=>({
    labor:document.body.classList.contains('test-lab-active'),
    namen:[...document.querySelectorAll('#dice .die')].map(w=>getComputedStyle(w,'::after').animationName)
  }));
  pruefe('Normales Spiel bleibt ohne Schimmer',!spiel.labor&&spiel.namen.every(x=>x==='none'),true);
  if(!spiel.namen.every(x=>x==='none'))console.log(`      Spiel: ${JSON.stringify(spiel.namen)}`);
  await n.close();
}catch(e){absturz=e;}

const ERWARTET=17;
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
