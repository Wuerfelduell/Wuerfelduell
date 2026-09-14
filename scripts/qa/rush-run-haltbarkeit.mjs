/* Gespeicherte Boss-Rush-Runs muessen eine Balanceaenderung ueberleben.
 *
 * Geschrieben gegen die Anforderung, nicht gegen die Umsetzung:
 *
 *   1. Ein Run, der unter einer frueheren Stufenkurve gespeichert wurde,
 *      bleibt beim Start erhalten und laesst sich fortsetzen.
 *   2. Ein Run mit manipulierten Gegnerwerten wird weiterhin abgelehnt.
 *   3. Ein strukturell kaputter Run wird weiterhin abgelehnt.
 *   4. Ein frisch erzeugter Run gilt unveraendert als gueltig.
 *
 * Punkt 1 ist der eigentliche Anlass: validStored verglich jedes gespeicherte
 * Angebot per JSON.stringify mit einem frisch gerechneten optionFor, also mit
 * der HEUTIGEN Kurve. V28.12.9 hob STAGES[14] von 445 auf 560 und fuehrte
 * FINAL_MIN_HP ein - damit galt jeder offene 15-Stufen-Run als ungueltig und
 * start() loeschte ihn ohne Rueckfrage.
 *
 * Das Skript faelscht die Vergangenheit nicht nach, sondern erzeugt einen Run
 * unter einer kuenstlich verschobenen Kurve und prueft ihn dann gegen die
 * echte. Das ist genau der Uebergang, um den es geht.
 */
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.WD_PLAYWRIGHT||'/opt/node22/lib/node_modules/playwright/index.mjs');
const root=process.cwd(),errors=[];
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{try{
  const file=path.join(root,new URL(req.url,'http://x').pathname);let body=fs.readFileSync(file);
  if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|online\/01-online)\.js[^>]*><\/script>/g,'');
  // Die Modulinterna der beiden Rush-Dateien werden fuer den Test geoeffnet.
  if(file.endsWith('44-trio-boss-rush.js'))body=body.toString().replace('  window.WDTrioBossRush=','  window.__trioQA={getRun:()=>run,validStored,persistRun,optionFor,ensurePaths};\n  window.WDTrioBossRush=');
  if(file.endsWith('37-duo-boss-rush.js'))body=body.toString().replace('  window.WDDuoBossRush=','  window.__duoQA={getRun:()=>run,validStored,persistRun,optionFor,ensurePaths};\n  window.WDDuoBossRush=');
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/tmp/chromium',args:['--no-sandbox']});
const p=await browser.newPage({locale:'de-DE',viewport:{width:390,height:844},serviceWorkers:'block'});
p.on('pageerror',e=>errors.push(e.message));
p.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);});
const ergebnisse=[];
try{
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);

  // ---- Trio: drei Profile, offener Run auf Stufe 10 ----
  const ids=await p.evaluate(()=>{
    const a=createProfile('Held A'),b=createProfile('Held B'),c=createProfile('Held C');
    [a,b,c].forEach(x=>x.campaign.completedEncounters.push('black_table'));
    saveGameData();return[a.id,b.id,c.id];
  });
  await p.evaluate(ids=>{
    trioProfile1Id=ids[0];trioProfile2Id=ids[1];trioProfile3Id=ids[2];
    openTrioCampaignScreen();
    $('trioProfile1Select').value=ids[0];$('trioProfile2Select').value=ids[1];$('trioProfile3Select').value=ids[2];
    renderTrioCampaign();
    $('trioAbility1Select').value='3';$('trioAbility2Select').value='3';$('trioAbility3Select').value='3';
    window.WDTrioBossRush.refreshButton();
  },ids);
  await p.click('#trioBossRushStartBtn');await p.waitForTimeout(500);

  const basis=await p.evaluate(()=>{
    const run=window.__trioQA.getRun();
    return {stageCount:run.stageCount,pfade:run.paths.filter(Boolean).length};
  });
  assert.equal(basis.stageCount,15,'Trio-Run muss 15 Stufen haben');

  // (4) Frisch erzeugt = gueltig.
  ergebnisse.push(['trio','frisch erzeugt',await p.evaluate(ids=>window.__trioQA.validStored(window.__trioQA.getRun(),ids),ids),true]);

  // (1) Derselbe Run, aber unter einer aelteren Kurve erzeugt.
  //     ensurePaths legt nur den Vorrat der AKTUELLEN Stufe an - run.paths hat
  //     am Anfang genau einen Eintrag. Ein erster Versuch mutierte die Stufen
  //     10 bis 14, die es noch gar nicht gab, und mass deshalb nichts: der
  //     Fall lief gruen durch, obwohl er rot sein musste. Mutiert wird jetzt
  //     jeder tatsaechlich vorhandene Eintrag - genau das, was ein Run aus
  //     V28.12.4 auf der Platte stehen haette.
  const altRun=await p.evaluate(()=>{
    const run=JSON.parse(JSON.stringify(window.__trioQA.getRun()));
    let beruehrt=0;
    run.paths.forEach(optionen=>{
      if(!optionen)return;
      optionen.forEach(o=>{
        beruehrt++;
        o.enemies=o.enemies.map(e=>({...e,hp:Math.max(1,Math.round(e.hp*0.86))}));
        o.pressure=o.enemies.reduce((n,e)=>n+e.hp,0)*(1+0.25*(o.enemies.length-1));
      });
    });
    return {run,beruehrt};
  });
  assert(altRun.beruehrt>0,'Der Testfall muss mindestens ein Angebot veraendern, sonst misst er nichts');
  ergebnisse.push(['trio','alte Kurve, sonst unveraendert',await p.evaluate(([run,ids])=>window.__trioQA.validStored(run,ids),[altRun.run,ids]),true]);

  // (2) Manipuliert: Gegner auf Trivial-HP gesetzt.
  const gefaelscht=JSON.parse(JSON.stringify(altRun.run));
  for(const optionen of gefaelscht.paths){if(!optionen)continue;for(const o of optionen)o.enemies=o.enemies.map(e=>({...e,hp:1}));}
  ergebnisse.push(['trio','Gegner-HP auf 1 gefaelscht',await p.evaluate(([run,ids])=>window.__trioQA.validStored(run,ids),[gefaelscht,ids]),false]);

  // (2b) Manipuliert: ein Gegner weniger.
  const weniger=JSON.parse(JSON.stringify(altRun.run));
  for(const optionen of weniger.paths){if(!optionen)continue;for(const o of optionen)if(o.enemies.length>1){o.enemies=o.enemies.slice(0,-1);o.label=o.enemies.map(e=>e.name).join(' + ');}}
  ergebnisse.push(['trio','ein Gegner entfernt',await p.evaluate(([run,ids])=>window.__trioQA.validStored(run,ids),[weniger,ids]),false]);

  // (2c) Manipuliert: unbekanntes Encounter untergeschoben.
  const fremd=JSON.parse(JSON.stringify(altRun.run));
  for(const optionen of fremd.paths){if(!optionen)continue;for(const o of optionen)o.encounterId='gibt_es_nicht';}
  ergebnisse.push(['trio','unbekanntes Encounter',await p.evaluate(([run,ids])=>window.__trioQA.validStored(run,ids),[fremd,ids]),false]);

  // (3) Strukturell kaputt.
  const kaputt=JSON.parse(JSON.stringify(altRun.run));kaputt.rewardTasks='keine Liste';
  ergebnisse.push(['trio','rewardTasks kein Array',await p.evaluate(([run,ids])=>window.__trioQA.validStored(run,ids),[kaputt,ids]),false]);

  const falschePhase=JSON.parse(JSON.stringify(altRun.run));falschePhase.phase='irgendwas';
  ergebnisse.push(['trio','unbekannte Phase',await p.evaluate(([run,ids])=>window.__trioQA.validStored(run,ids),[falschePhase,ids]),false]);

  // (1b) Der eigentliche Nachweis: start() darf den Run nicht loeschen.
  await p.evaluate(([run,ids])=>{
    saveData.trioBossRushRuns={};
    // Derselbe Schluessel wie trioKey im Modul.
    saveData.trioBossRushRuns[JSON.stringify([...ids].map(String).sort())]=run;
    saveGameData();
  },[altRun.run,ids]);
  await p.reload();await p.waitForTimeout(400);
  await p.evaluate(ids=>{
    trioProfile1Id=ids[0];trioProfile2Id=ids[1];trioProfile3Id=ids[2];
    openTrioCampaignScreen();
    $('trioProfile1Select').value=ids[0];$('trioProfile2Select').value=ids[1];$('trioProfile3Select').value=ids[2];
    renderTrioCampaign();
    $('trioAbility1Select').value='3';$('trioAbility2Select').value='3';$('trioAbility3Select').value='3';
    window.WDTrioBossRush.refreshButton();
  },ids);
  await p.click('#trioBossRushStartBtn');await p.waitForTimeout(500);
  // Nur zu zaehlen, ob ueberhaupt ein Run gespeichert ist, reicht nicht:
  // wird der alte geloescht, legt newRun() sofort einen neuen unter demselben
  // Schluessel an, und die Zaehlung bleibt gruen. Geprueft wird deshalb, ob es
  // noch DERSELBE Run ist - an den mutierten Gegnerwerten erkennbar.
  const nachStart=await p.evaluate(marker=>{
    const runs=Object.values(saveData.trioBossRushRuns||{});
    const hp=runs[0]?.paths?.[0]?.[0]?.enemies?.map(e=>e.hp).join(',')??null;
    return {dialog:document.querySelectorAll('[data-rush-resume]').length,hp,marker};
  },altRun.run.paths[0][0].enemies.map(e=>e.hp).join(','));
  ergebnisse.push(['trio','start() bietet Fortsetzen an',nachStart.dialog===2,true]);
  ergebnisse.push(['trio','derselbe Run liegt noch im Speicher',nachStart.hp===nachStart.marker,true]);

}finally{
  const breite=Math.max(...ergebnisse.map(r=>r[1].length));
  let fehler=0;
  for(const [modus,name,ist,soll] of ergebnisse){
    const ok=ist===soll;if(!ok)fehler++;
    console.log(`${ok?'  ok  ':' FEHL '} ${modus} · ${name.padEnd(breite)}  ist=${String(ist).padStart(5)} soll=${String(soll).padStart(5)}`);
  }
  await browser.close();server.close();
  if(errors.length){console.log('\nSeitenfehler:\n'+errors.join('\n'));fehler++;}
  if(fehler){console.log(`\n${fehler} Abweichung(en).`);process.exit(1);}
  console.log('\nAlle Zusicherungen erfuellt.');
}
