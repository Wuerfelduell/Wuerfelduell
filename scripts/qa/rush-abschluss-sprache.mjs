/* Die Abschlusstafel des Boss Rush darf im englischen Spiel kein Deutsch
 * zeigen - weder gewonnen noch verloren, in beiden Modi.
 *
 * Anlass: im englischen Spiel stand dort "Besiegt: 0 / 10 · +0 Base boss XP
 * behalten". Zwei Fehler uebereinander:
 *   1. tr(`... ${tr("Basis-Boss-XP")}`) - das innere tr uebersetzt zuerst,
 *      danach passt die zusammengesetzte Zeile auf gar kein Muster mehr.
 *      Wortersetzung greift auch nicht, die Zeile ist zu lang.
 *   2. Die Muster in lang/en-campaign.js erwarten "Boss XP je Profil",
 *      der Code baut aber "Basis-Boss-XP".
 *
 * Geprueft wird die gerenderte Tafel, nicht der Quelltext: der Erkenner aus
 * js/00-i18n.js laeuft ueber den sichtbaren Text.
 */
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';
const {chromium}=await import(process.env.WD_PLAYWRIGHT||'/opt/node22/lib/node_modules/playwright/index.mjs');
const root=process.cwd(),errors=[];
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{try{
  const file=path.join(root,new URL(req.url,'http://x').pathname);let body=fs.readFileSync(file);
  if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|online\/01-online)\.js[^>]*><\/script>/g,'');
  if(file.endsWith('44-trio-boss-rush.js'))body=body.toString().replace('  window.WDTrioBossRush=','  window.__trioQA={getRun:()=>run,showOutcome};\n  window.WDTrioBossRush=');
  if(file.endsWith('37-duo-boss-rush.js'))body=body.toString().replace('  window.WDDuoBossRush=','  window.__duoQA={getRun:()=>run,showOutcome};\n  window.WDDuoBossRush=');
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/tmp/chromium',args:['--no-sandbox']});
const p=await browser.newPage({locale:'en-US',viewport:{width:390,height:844},serviceWorkers:'block'});
p.on('pageerror',e=>errors.push(e.message));
const ergebnisse=[];const pruefe=(n,i,s)=>ergebnisse.push([n,i,s]);
let absturz=null;
try{
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  const hints=await p.evaluate(()=>{
    const src=document.querySelector('script[src*="00-i18n"]');
    return !!src;
  });
  void hints;
  // Denselben Erkenner benutzen wie das Spiel.
  const quelle=fs.readFileSync(path.join(root,'js/00-i18n.js'),'utf8');
  const germanHints=eval(quelle.match(/const germanHints\s*=\s*(\/.*?\/[a-z]*);/s)[1]);

  const ids=await p.evaluate(()=>{
    const a=createProfile('Alpha'),b=createProfile('Bravo'),c=createProfile('Charlie');
    [a,b,c].forEach(x=>x.campaign.completedEncounters.push('black_table'));
    saveGameData();return[a.id,b.id,c.id];
  });

  const lauf=async(modus)=>{
    // Nach einer Abschlusstafel steht die Seite im Spielbildschirm; der
    // Startknopf ist dann nicht klickbar. Ohne das Neuladen lief der zweite
    // Durchgang in einen Klick-Timeout und das Skript brach ab - die ersten
    // beiden Zusicherungen standen dabei auf gruen.
    await p.reload();await p.waitForTimeout(350);
    await p.evaluate(()=>{saveData.trioBossRushRuns={};saveData.bossRushRuns={};saveGameData();});
    if(modus==='trio'){
      await p.evaluate(ids=>{
        trioProfile1Id=ids[0];trioProfile2Id=ids[1];trioProfile3Id=ids[2];
        openTrioCampaignScreen();
        $('trioProfile1Select').value=ids[0];$('trioProfile2Select').value=ids[1];$('trioProfile3Select').value=ids[2];
        renderTrioCampaign();
        $('trioAbility1Select').value='3';$('trioAbility2Select').value='3';$('trioAbility3Select').value='3';
        window.WDTrioBossRush.refreshButton();
      },ids);
      await p.click('#trioBossRushStartBtn');
    }else{
      await p.evaluate(ids=>{
        duoProfile1Id=ids[0];duoProfile2Id=ids[1];
        openDuoCampaignScreen();
        $('duoProfile1Select').value=ids[0];$('duoProfile2Select').value=ids[1];
        renderDuoCampaign();
        $('duoAbility1Select').value='3';$('duoAbility2Select').value='3';
        window.WDDuoBossRush.refreshButton();
      },ids);
      await p.click('#duoBossRushStartBtn');
    }
    await p.waitForTimeout(400);
    await p.locator('[data-rush-path]').first().click();
    await p.waitForTimeout(600);
  };

  for(const modus of ['duo','trio']){
    const qa=modus==='trio'?'__trioQA':'__duoQA';
    for(const gewonnen of [true,false]){
      await lauf(modus);
      await p.evaluate(([qa,gewonnen])=>{
        const run=window[qa].getRun();
        run.cleared=gewonnen?run.stageCount??10:3;
        run.bossXpEarned=120;
        window[qa].showOutcome(gewonnen);
      },[qa,gewonnen]);
      await p.waitForTimeout(500);
      const text=await p.evaluate(()=>{
        const teile=[document.getElementById('roundResultText')?.textContent||'',
                     document.getElementById('winnerText')?.textContent||'',
                     document.getElementById('roundStandings')?.textContent||''];
        return teile.join(' | ');
      });
      const name=`${modus} · ${gewonnen?'gewonnen':'verloren'}`;
      pruefe(`${name}: Tafel hat Inhalt`,text.replace(/\|/g,'').trim().length>20,true);

      // germanHints allein reicht hier NICHT: "Besiegt: 0 / 10 · +0 Base boss
      // XP behalten" enthaelt weder ein Wort aus der Liste noch einen Umlaut.
      // Ein erster Entwurf pruefte nur damit und war deshalb gruen, obwohl der
      // Fehler offen dastand. Geprueft wird jetzt zweifach: der erwartete
      // englische Satz MUSS da sein, und eine Liste deutscher Woerter, die in
      // genau diesen Zeilen vorkommen, darf NICHT da sein.
      const erwartet=gewonnen?'Run complete:':'Defeated:';
      pruefe(`${name}: "${erwartet}" steht da`,text.includes(erwartet),true);

      const deutscheWoerter=['Besiegt','behalten','abgeschlossen','Bossstufen','gefallen',
                             'Basis','gesamt','Spieler','wurden','Euer Team'];
      const gefunden=deutscheWoerter.filter(w=>text.includes(w));
      pruefe(`${name}: kein deutsches Wort`,gefunden.length===0,true);
      if(gefunden.length)console.log(`      gefunden: ${gefunden.join(', ')}  in: "${text.trim().slice(0,170)}"`);
      if(germanHints.test(text))console.log(`      (germanHints schlaegt zusaetzlich an)`);
    }
  }
}catch(e){absturz=e;}finally{
  const ERWARTET=12;
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
  if(fehler){console.log(`\n${fehler} Abweichung(en).`);process.exit(1);}
  console.log('\nAlle Zusicherungen erfuellt.');
}
