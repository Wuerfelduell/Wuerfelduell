/* Sechs Regeln im Boss Rush, die der Codex-Durchgang am 14.09. als verletzt
 * gemeldet hat. Gegen die Anforderung geschrieben, nicht gegen die Umsetzung:
 *
 *   1. Das Maximum waechst in BEIDEN Modi je Stufe um 5. Der Heilungsdeckel
 *      gilt in beiden; ohne den Ausgleich sind die Heilperks im Duo tot.
 *   2. Ein gespeicherter Stand mit hp > maxHp wird beim Start gedeckelt.
 *   3. Zweiter Atem hebt einen gefallenen Helden nie ueber sein Maximum.
 *   4. Weitergeben umgeht die Kopiengrenze nicht: hat das Ziel in dieser
 *      Stufe schon eine Kopie, rueckt die weitergegebene eine Stufe nach.
 *   5. Eine ABGELEHNTE Verschnaufpause blockiert no_rest_for_legends nicht.
 *   6. Abgelehnte und weitergegebene Kopien zaehlen bei der Empfaengerwahl
 *      nicht als erhalten.
 *
 * Vor dem Patch muss dieses Skript rot sein - sonst misst es nichts.
 */
import fs from 'node:fs';import path from 'node:path';import {createServer} from 'node:http';
const {chromium}=await import(process.env.WD_PLAYWRIGHT||'/opt/node22/lib/node_modules/playwright/index.mjs');
const root=process.cwd(),errors=[];
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const hook=(name,globals)=>`  window.${name}={${globals}};\n`;
const server=createServer((req,res)=>{try{
  const file=path.join(root,new URL(req.url,'http://x').pathname);let body=fs.readFileSync(file);
  if(file.endsWith('index.html'))body=body.toString().replace(/<script[^>]+src="js\/(?:backend-config|online\/01-online)\.js[^>]*><\/script>/g,'');
  if(file.endsWith('44-trio-boss-rush.js'))body=body.toString().replace('  window.WDTrioBossRush=',hook('__trioQA','getRun:()=>run,setRun:r=>{run=r;},heroState,startingVitals,copyPartner,passCopy,currentTask,persistRun,restWasTaken:(typeof restWasTaken===\'function\'?restWasTaken:null)')+'  window.WDTrioBossRush=');
  if(file.endsWith('37-duo-boss-rush.js'))body=body.toString().replace('  window.WDDuoBossRush=',hook('__duoQA','getRun:()=>run,setRun:r=>{run=r;},heroState,startingVitals,persistRun,restWasTaken:(typeof restWasTaken===\'function\'?restWasTaken:null)')+'  window.WDDuoBossRush=');
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||'/tmp/chromium',args:['--no-sandbox']});
const p=await browser.newPage({locale:'de-DE',viewport:{width:390,height:844},serviceWorkers:'block'});
p.on('pageerror',e=>errors.push(e.message));
p.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);});
const ergebnisse=[];
const pruefe=(name,ist,soll)=>ergebnisse.push([name,ist,soll]);

let absturz=null;
try{
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);

  const ids=await p.evaluate(()=>{
    const a=createProfile('Held A'),b=createProfile('Held B'),c=createProfile('Held C');
    [a,b,c].forEach(x=>x.campaign.completedEncounters.push('black_table'));
    saveGameData();return[a.id,b.id,c.id];
  });

  const frisch=()=>p.evaluate(()=>{saveData.trioBossRushRuns={};saveData.bossRushRuns={};saveGameData();});
  const starteTrio=async()=>{
    await frisch();
    await p.evaluate(ids=>{
      trioProfile1Id=ids[0];trioProfile2Id=ids[1];trioProfile3Id=ids[2];
      openTrioCampaignScreen();
      $('trioProfile1Select').value=ids[0];$('trioProfile2Select').value=ids[1];$('trioProfile3Select').value=ids[2];
      renderTrioCampaign();
      $('trioAbility1Select').value='3';$('trioAbility2Select').value='3';$('trioAbility3Select').value='3';
      window.WDTrioBossRush.refreshButton();
    },ids);
    await p.click('#trioBossRushStartBtn');await p.waitForTimeout(450);
  };
  const starteDuo=async()=>{
    await frisch();
    await p.evaluate(ids=>{
      duoProfile1Id=ids[0];duoProfile2Id=ids[1];
      openDuoCampaignScreen();
      $('duoProfile1Select').value=ids[0];$('duoProfile2Select').value=ids[1];
      renderDuoCampaign();
      $('duoAbility1Select').value='3';$('duoAbility2Select').value='3';
      window.WDDuoBossRush.refreshButton();
    },ids);
    await p.click('#duoBossRushStartBtn');await p.waitForTimeout(450);
  };

  // ---------- (1) Maximum waechst je Stufe, in beiden Modi ----------
  // Am echten Stufenwechsel gemessen, nicht an der Modulquelle: ein erster
  // Entwurf suchte die Zuwachszeile per Regex im Dateitext - das prueft die
  // Schreibweise, nicht das Verhalten.
  const stufenwechsel=async(qa,startBtn,pathSel)=>{
    const vorher=await p.evaluate(qa=>window[qa].heroState(window[qa].getRun().profileIds[0]).maxHp,qa);
    // Kampf gewinnen, alle Belohnungen abraeumen, naechste Stufe betreten.
    await p.evaluate(qa=>{
      players.filter(x=>x.campaignTeam==='enemy').forEach(x=>x.hp=0);
      (qa==='__trioQA'?window.WDTrioBossRush:window.WDDuoBossRush).finishEncounter(true);
    },qa);
    await p.waitForTimeout(350);
    for(let i=0;i<40;i++){
      const phase=await p.evaluate(qa=>window[qa].getRun().phase,qa);
      if(phase!=='reward')break;
      const slots=p.locator('[data-rush-slot]');
      if(await slots.count())await slots.first().click();
      else{
        const opts=p.locator('[data-boss-rush-reward]');
        if(await opts.count())await opts.first().click();else break;
      }
      await p.waitForTimeout(220);
    }
    await p.waitForTimeout(250);
    if(await p.locator(pathSel).count())await p.locator(pathSel).first().click();
    await p.waitForTimeout(450);
    const nachher=await p.evaluate(qa=>({
      maxHp:window[qa].heroState(window[qa].getRun().profileIds[0]).maxHp,
      stage:window[qa].getRun().stage
    }),qa);
    return {vorher,...nachher};
  };

  await starteTrio();
  await p.locator('[data-rush-path]').first().click();await p.waitForTimeout(500);
  const trioWachstum=await stufenwechsel('__trioQA','#trioBossRushStartBtn','[data-rush-path]');
  pruefe('Trio: Stufenwechsel erreicht',trioWachstum.stage===1,true);
  pruefe('Trio: Maximum waechst um 5',trioWachstum.maxHp-trioWachstum.vorher===5,true);

  // ---------- (2) Deckel beim Start, (3) Zweiter Atem ----------
  const vitals=await p.evaluate(ids=>{
    const q=window.__trioQA,hero=q.heroState(ids[0]);
    const profil=getProfile(ids[0]);
    hero.maxHp=27;hero.hp=370;
    const ueberheilt=q.startingVitals(profil,25);
    hero.maxHp=10;hero.hp=0;hero.perks={...(hero.perks||{}),second_wind:1};
    const zweiterAtem=q.startingVitals(profil,25);
    hero.maxHp=30;hero.hp=0;delete hero.perks.second_wind;
    const normal=q.startingVitals(profil,25);
    return {ueberheilt,zweiterAtem,normal};
  },ids);
  pruefe('Trio: gespeicherte 370 HP werden auf 27 gedeckelt',vitals.ueberheilt.hp<=vitals.ueberheilt.maxHp,true);
  pruefe('Trio: Zweiter Atem bleibt im Maximum',vitals.zweiterAtem.hp<=vitals.zweiterAtem.maxHp,true);
  pruefe('Trio: gefallener Held kehrt mit 1 HP zurueck',vitals.normal.hp===1,true);

  // ---------- (5) Abgelehnte Verschnaufpause ----------
  const rest=await p.evaluate(()=>{
    const q=window.__trioQA,run=q.getRun();
    const setze=h=>{run.rewardHistory=h;return q.restWasTaken?q.restWasTaken():null;};
    return {
      abgelehnt:setze([{stage:1,profileId:'x',rewardId:'rest',copy:true,declined:true}]),
      weitergegeben:setze([{stage:1,profileId:'x',rewardId:'rest',copy:true,passedTo:'y'}]),
      genommen:setze([{stage:1,profileId:'x',rewardId:'rest'}])
    };
  });
  pruefe('Trio: abgelehnte Verschnaufpause blockiert nicht',rest.abgelehnt===false,true);
  pruefe('Trio: weitergegebene Verschnaufpause blockiert nicht',rest.weitergegeben===false,true);
  pruefe('Trio: genommene Verschnaufpause blockiert sehr wohl',rest.genommen===true,true);

  // ---------- (6) Empfaengerwahl zaehlt nur behaltene Kopien ----------
  const partner=await p.evaluate(ids=>{
    const q=window.__trioQA,run=q.getRun();
    // B hat eine Kopie behalten, C hat zwei abgelehnt bzw. weitergegeben.
    run.rewardHistory=[
      {stage:1,profileId:String(ids[1]),rewardId:'damage',copy:true},
      {stage:1,profileId:String(ids[2]),rewardId:'damage',copy:true,declined:true},
      {stage:2,profileId:String(ids[2]),rewardId:'damage',copy:true,passedTo:String(ids[1])}
    ];
    return String(q.copyPartner(ids[0]));
  },ids);
  pruefe('Trio: Empfaenger ist der mit den wenigsten BEHALTENEN Kopien',partner===String(ids[2]),true);

  // ---------- (4) Weitergeben umgeht die Kopiengrenze nicht ----------
  // passCopy ruft completeReward, und das rendert die naechste Aufgabe - laeuft
  // die Warteschlange dabei leer, setzt completeReward rewardTasks auf [] und
  // jede Zaehlung danach ergibt 0. Ein erster Entwurf war deshalb gruen,
  // obwohl der Fehler da war. Zwei normale Fueller-Aufgaben halten die
  // Schlange offen, damit hinterher noch etwas zu zaehlen ist.
  // Frisch geladen, sonst blockt das selectionLocked aus den Klicks davor den
  // Aufruf still weg - dann passiert nichts und die Zaehlung sieht gut aus.
  await p.reload();await p.waitForTimeout(300);
  await starteTrio();
  const weiter=await p.evaluate(ids=>{
    const q=window.__trioQA,run=q.getRun();
    run.phase='reward';run.stage=2;run.finished=false;
    run.rewardHistory=[];run.deferredRewards=[];
    run.rewardTasks=[
      {profileId:String(ids[1]),copy:true,from:String(ids[0]),count:1,choices:['damage']},
      {profileId:String(ids[2]),copy:true,from:String(ids[0]),count:1,choices:['rest']},
      {profileId:String(ids[0]),count:3,choices:['rest','damage','regen']},
      {profileId:String(ids[1]),count:3,choices:['rest','damage','regen']}
    ];
    run.rewardTurn=0;run.swapPending=null;
    q.passCopy();
    const offen=run.rewardTasks.filter(t=>t?.copy&&String(t.profileId)===String(ids[2])).length;
    const nachgerueckt=run.deferredRewards.filter(r=>String(r.profileId)===String(ids[2])&&r.dueStage>run.stage).length;
    const gehandelt=run.rewardHistory.some(h=>h.passedTo);
    return {offen,nachgerueckt,laenge:run.rewardTasks.length,gehandelt};
  },ids);
  pruefe('Trio: passCopy hat ueberhaupt gehandelt',weiter.gehandelt,true);
  pruefe('Trio: Warteschlange ist nicht leergelaufen',weiter.laenge>0,true);
  pruefe('Trio: Ziel bekommt hoechstens eine Kopie je Stufe',weiter.offen<=1,true);
  pruefe('Trio: die zweite Kopie rueckt eine Stufe nach',weiter.nachgerueckt===1,true);

  // ---------- Duo: Wachstum, Deckel und Zweiter Atem ----------
  await p.reload();await p.waitForTimeout(300);
  await starteDuo();
  await p.locator('[data-rush-path]').first().click();await p.waitForTimeout(500);
  const duoWachstum=await stufenwechsel('__duoQA','#duoBossRushStartBtn','[data-rush-path]');
  pruefe('Duo:  Stufenwechsel erreicht',duoWachstum.stage===1,true);
  pruefe('Duo:  Maximum waechst um 5',duoWachstum.maxHp-duoWachstum.vorher===5,true);
  const duoVitals=await p.evaluate(ids=>{
    const q=window.__duoQA,hero=q.heroState(ids[0]),profil=getProfile(ids[0]);
    hero.maxHp=27;hero.hp=370;
    const ueberheilt=q.startingVitals(profil,25);
    hero.maxHp=10;hero.hp=0;hero.perks={...(hero.perks||{}),second_wind:1};
    const zweiterAtem=q.startingVitals(profil,25);
    return {ueberheilt,zweiterAtem};
  },ids);
  pruefe('Duo:  gespeicherte 370 HP werden auf 27 gedeckelt',duoVitals.ueberheilt.hp<=duoVitals.ueberheilt.maxHp,true);
  pruefe('Duo:  Zweiter Atem bleibt im Maximum',duoVitals.zweiterAtem.hp<=duoVitals.zweiterAtem.maxHp,true);

  const duoRest=await p.evaluate(()=>{
    const q=window.__duoQA,run=q.getRun();
    run.rewardHistory=[{stage:1,profileId:'x',rewardId:'rest',copy:true,declined:true}];
    return q.restWasTaken?q.restWasTaken():null;
  });
  pruefe('Duo:  abgelehnte Verschnaufpause blockiert nicht',duoRest===false,true);

  // ---------- Der Speicher selbst ----------
  // Die Bereinigung laeuft beim LADEN, nicht beim Speichern - deshalb wird
  // der manipulierte Stand geschrieben und die Seite danach neu geladen.
  const key=await p.evaluate(ids=>{
    const key=JSON.stringify([String(ids[0]),String(ids[1])].sort());
    const run=JSON.parse(JSON.stringify(window.__duoQA.getRun()));
    run.heroes[ids[0]].hp=999;run.heroes[ids[0]].maxHp=30;
    saveData.bossRushRuns={[key]:run};
    saveGameData();return key;
  },ids);
  await p.reload();await p.waitForTimeout(400);
  const speicher=await p.evaluate(([key,id])=>{
    const h=saveData.bossRushRuns?.[key]?.heroes?.[id];
    return {hp:h?.hp??null,maxHp:h?.maxHp??null,vorhanden:!!h};
  },[key,ids[0]]);
  pruefe('Speicher: der Run ueberlebt die Bereinigung',speicher.vorhanden,true);
  pruefe('Speicher: hp wird beim Bereinigen auf maxHp gedeckelt',
    speicher.hp==null||speicher.maxHp==null||speicher.hp<=speicher.maxHp,true);

}catch(e){absturz=e;}finally{
  // Ein Absturz vor der ersten Zusicherung liess frueher "alle gruen" stehen,
  // weil die Liste leer war. Eine leere oder zu kurze Liste ist ein Fehler.
  const ERWARTET=18;
  let fehler=ergebnisse.length<ERWARTET?1:0;
  if(fehler)console.log(`ACHTUNG: nur ${ergebnisse.length} von ${ERWARTET} Zusicherungen erreicht - das Skript ist unterwegs abgebrochen.`);
  const breite=Math.max(1,...ergebnisse.map(r=>r[0].length));
  for(const [name,ist,soll] of ergebnisse){
    const ok=ist===soll;if(!ok)fehler++;
    console.log(`${ok?'  ok  ':' FEHL '} ${name.padEnd(breite)}  ist=${String(ist).padStart(5)} soll=${String(soll).padStart(5)}`);
  }
  await browser.close();server.close();
  if(absturz){console.log('\nAbbruch: '+absturz.message.split('\n')[0]);}
  if(errors.length){console.log('\nSeitenfehler:\n'+errors.join('\n'));fehler++;}
  if(fehler){console.log(`\n${fehler} Abweichung(en).`);process.exit(1);}
  console.log('\nAlle Zusicherungen erfuellt.');
}
