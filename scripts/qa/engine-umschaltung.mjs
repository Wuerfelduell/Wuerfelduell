import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {chromium} from 'playwright';

const full=process.argv.includes('--full')||process.env.WD_ENGINE_SWITCH_FULL==='1';
const count=Number(process.env.WD_ENGINE_SWITCH_SEEDS)||(full?300:20);
const debugSeed=Number(process.env.WD_ENGINE_SWITCH_DEBUG_SEED)||0;
const root=process.cwd(),types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml',
  '.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://x').pathname),file=path.join(root,pathname);
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));

let browser,page,pageErrors=[],missing=[];
async function openPage(){
  page=await browser.newPage({viewport:{width:390,height:844},locale:'de-DE',serviceWorkers:'block'});
  page.setDefaultTimeout(15000);page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('response',response=>{if(response.status()===404)missing.push(response.url());});
  await page.route(/\/js\/(?:backend-config|41-supabase-core|42-supabase-account|43-supabase-battle|online\/01-online)\.js/,
    route=>route.fulfill({contentType:'text/javascript',body:''}));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.fulfill({body:''}));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForFunction(()=>window.WDEngineAdapter&&typeof performBotAction==='function');
  if(pageErrors.length) throw new Error(pageErrors.join('\n'));
}

async function play(seed,useEngine,debug=false){
  return page.evaluate(async({seed,useEngine,debug})=>{
    clearBotAutomation();ENGINE_LOKALES_DUELL=useEngine;
    if(!window.__switchTimersReady){
      const cancelled=new Set(),intervals=new Set();let id=0;
      window.setTimeout=(fn,_ms,...args)=>{const token=++id;queueMicrotask(()=>{if(!cancelled.has(token))fn(...args);});return token;};
      window.clearTimeout=token=>cancelled.add(token);
      window.setInterval=(fn,_ms,...args)=>{const token=++id;intervals.add(token);const tick=()=>{if(!intervals.has(token))return;fn(...args);queueMicrotask(tick);};queueMicrotask(tick);return token;};
      window.clearInterval=token=>intervals.delete(token);window.__switchTimersReady=true;
    }
    window.switchWait=()=>Promise.resolve();scheduleBotAction=()=>{};
    localStorage.clear();saveData=createDefaultSave();
    const profiles=[createProfile('Alpha'),createProfile('Beta')];
    WDRng.useSeed(seed>>>0);menuPlayBtn.click();localModeSelect.value='classic';applyLocalModeSetup();
    playerCount.value='2';makeNameFields();
    for(let index=0;index<2;index++){
      const bot=document.getElementById('botChoice'+index);bot.value='human';syncSetupBotChoice(index);
      const profile=document.getElementById('profileChoice'+index);profile.value=profiles[index].id;
      document.getElementById('seatChoice'+index).value=String(index);
    }
    rollSetupAbilities();
    setupAbilityRolls.forEach((roll,index)=>{if(roll===6)document.getElementById('abilityChoice'+index).value=String(CHOOSABLE_ABILITY_IDS[0]);});
    startGameBtn.disabled=false;startGameBtn.onclick();clearBotAutomation();
    players.forEach(player=>{player.botLevel='normal';});
    // Feste Bot-Wahl in Drafts und Rundenvorbereitung, damit beide Pfade dieselbe
    // Auswahl treffen und dieselben Ziehungen verbrauchen; gilt fuer beide Laeufe.
    botPickAbility=ids=>ids[1];
    renderAll=()=>{};renderDice=()=>{};renderPlayers=()=>{};addLog=()=>{};tickSpecialDie=()=>{};
    const trace=[],snapshot=step=>({step,phase:secondAbilityDraftBusy?'draft_pending':phase,currentSeat:players[current]?.seat,hp:players.map(player=>player.hp),
      abilities:players.map(player=>playerAbilities(players.indexOf(player))),dice:dice.map(die=>[die.value,!!die.locked]),
      attack:[attackFace,attackHits,attackDamage],draft:secondAbilityDraftBusy?secondAbilityDraftChoices.slice():null,rng:WDRng.inspect().drawIndex});
    if(debug) trace.push(snapshot(-1));
    // Drei Runden je Seed: Der Rundenwechsel mischt die Sitzreihenfolge, und genau
    // dort lag der Spiegelfehler von V28.14.19. Vor jeder Vorbereitung wird der
    // Zufall neu gesetzt und die Bot-Wahl fest verdrahtet, damit alter und neuer
    // Pfad dieselben Ziehungen in derselben Reihenfolge verbrauchen.
    const rounds=[];
    for(let runde=1;runde<=3;runde++){
      for(let step=0;step<30000&&!roundWinnerHandled;step++){
        if(phase==='gamble_retry_offer') startGamblingRetry();
        else if(phase==='gamble_retry') rollGamblingMan();
        else performBotAction();
        await switchWait();let waits=0;
        while(!roundWinnerHandled&&(isAnimating||gamblingRolling||perfect25Rolling||perfect25D4Rolling||highStakesRolling||insuranceRolling||counterRolling||eventPopupBusy)){
          if(++waits>300) throw new Error('switch_stalled:'+phase);await switchWait();
        }
        for(let settle=0;settle<8;settle++)await switchWait();
        if(debug) trace.push(snapshot(step));
      }
      if(!roundWinnerHandled) throw new Error('switch_match_did_not_finish:'+phase);
      const bySeat=players.map((player,index)=>({seat:player.seat,hp:player.hp,abilities:playerAbilities(index),
        eliminated:player.hp<=0,wins:player.wins||0,roundStats:{...(roundStats[index]||{})}})).sort((a,b)=>a.seat-b.seat);
      rounds.push({round:roundNumber,players:bySeat,winnerSeat:roundWinnerIndex==null?null:players[roundWinnerIndex].seat,
        eliminationSeats:roundEliminationOrder.map(index=>players[index].seat),globalRounds:saveData.global.completedRounds});
      if(runde===3) break;
      WDRng.useSeed(((seed*7919)+runde)>>>0);
      prepareNextRound();for(let settle=0;settle<4;settle++)await switchWait();
      players.forEach((player,index)=>{const select=document.getElementById('nextAbilityChoice'+index);if(select&&!select.disabled)select.value=String(CHOOSABLE_ABILITY_IDS[2]);});
      startNextRound();for(let settle=0;settle<8;settle++)await switchWait();
      if(roundNumber!==runde+1||phase!=='idle') throw new Error('switch_round_start_failed:'+roundNumber+'/'+phase);
    }
    const profileState=saveData.profiles.map(profile=>({name:profile.name,stats:JSON.parse(JSON.stringify(profile.stats)),
      achievements:Object.keys(profile.achievements||{}).filter(key=>profile.achievements[key]).sort(),
      marks:window.WDShop?.wallet?.(profile)?.marken||0})).sort((a,b)=>a.name.localeCompare(b.name));
    const summary={rounds,profiles:profileState};
    return debug?{summary,trace}:summary;
  },{seed,useEngine,debug});
}

async function openUiPage(width,locale){
  const p=await browser.newPage({viewport:{width,height:844},locale,serviceWorkers:'block'});
  p.setDefaultTimeout(15000);p.on('pageerror',error=>pageErrors.push(`${locale}/${width}: ${error.message}`));
  p.on('response',response=>{if(response.status()===404)missing.push(response.url());});
  await p.route(/\/js\/(?:backend-config|41-supabase-core|42-supabase-account|43-supabase-battle|online\/01-online)\.js/,
    route=>route.fulfill({contentType:'text/javascript',body:''}));
  await p.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.fulfill({body:''}));
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForFunction(()=>window.WDEngineAdapter&&typeof startLocalDuelEngine==='function');
  return p;
}

async function setupHumanBot(p){
  const profileId=await p.evaluate(()=>{
    localStorage.clear();saveData=createDefaultSave();const profile=createProfile('UI Mensch');saveGameData();return profile.id;
  });
  await p.click('#menuPlayBtn');
  await p.evaluate(profileId=>{
    ENGINE_LOKALES_DUELL=true;localModeSelect.value='classic';applyLocalModeSetup();playerCount.value='2';makeNameFields();
    document.getElementById('botChoice0').value='human';syncSetupBotChoice(0);
    document.getElementById('profileChoice0').value=profileId;
    document.getElementById('botChoice1').value='normal';syncSetupBotChoice(1);
    document.getElementById('seatChoice0').value='0';document.getElementById('seatChoice1').value='1';
    WDRng.useTape([0,.04,0]);updateStartAvailability();
  },profileId);
  await p.click('#rollAbilities');await p.click('#startGame');
  await p.evaluate(()=>{
    clearBotAutomation();scheduleBotAction=()=>{};
    const nativeTimeout=window.setTimeout.bind(window);window.qaWait=ms=>new Promise(resolve=>nativeTimeout(resolve,ms));
    window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,Math.min(Number(ms)||0,8),...args);
  });
  const gate=await p.evaluate(()=>({active:window.WDEngineAdapter.hasLive(),flag:ENGINE_LOKALES_DUELL,mode:localModeId,
    players:players.length,rolls:setupAbilityRolls.slice(),startDisabled:startGameBtn.disabled,context:gameContext?.mode,campaign:campaignMode,
    tutorial:tutorialMode,lab:document.body.classList.contains('test-lab-active'),gameHidden:game.classList.contains('hidden')}));
  assert.equal(gate.active,true,'UI-Duell nutzt den Reducer: '+JSON.stringify({gate,pageErrors}));
}

async function configureScenario(p,humanAbility,botAbility=2,startingSeat=0){
  await p.evaluate(({humanAbility,botAbility,startingSeat})=>{
    clearBotAutomation();roundWinnerHandled=false;roundWinnerIndex=null;roundEliminationOrder=[];lastPlaceIndex=null;
    players.forEach(player=>{
      const ability=player.seat===0?humanAbility:botAbility;
      player.ability=ability;player.secondAbility=null;player.thirdAbility=null;player.secondAbilityUnlocked=false;player.thirdAbilityUnlocked=false;
      player.secondAbilityWasChosen=false;player.thirdAbilityWasChosen=false;player.hp=25;player.maxHp=25;player.wins=0;player.botBloodUsesThisAttack=0;
    });
    current=players.findIndex(player=>player.seat===startingSeat);resetRoundStats();startLocalDuelEngine();
    winnerBox.classList.add('hidden');nextRoundBox.classList.add('hidden');game.classList.remove('hidden');document.body.classList.add('playing');
    presentLocalEngineState();renderAll();
  },{humanAbility,botAbility,startingSeat});
}

async function clickBaseAndLock(p,draws){
  await p.evaluate(values=>WDRng.useTape(values),draws);await p.click('#primaryBtn');
  await p.waitForFunction(()=>phase==='base_select'&&!isAnimating);
  for(let index=0;index<5;index++)await p.locator('#dice > .die').nth(index).click();
  await p.click('#lockBtn');
}

async function exerciseClicks(p){
  await configureScenario(p,13);await clickBaseAndLock(p,Array(5).fill(.9));
  assert.equal(await p.evaluate(()=>phase),'attack_ready');
  await p.evaluate(()=>WDRng.useTape(Array(5).fill(.7)));await p.click('#primaryBtn');
  await p.waitForFunction(()=>phase==='attack_after_roll'&&!isAnimating);await p.click('#resolveAttackBtn');
  await p.waitForFunction(()=>phase==='high_stakes');await p.evaluate(()=>WDRng.useTape([.9]));await p.click('#highStakesDie');
  await p.waitForFunction(()=>phase!=='high_stakes'&&!highStakesRolling);

  await configureScenario(p,12);await clickBaseAndLock(p,Array(5).fill(.9));
  await p.waitForFunction(()=>phase==='gamble_attack');await p.evaluate(()=>WDRng.useTape([.3]));await p.click('#gamblingDie');
  await p.waitForFunction(()=>phase==='attack_ready'&&!gamblingRolling);

  await configureScenario(p,15);await clickBaseAndLock(p,Array(5).fill(.7));
  await p.waitForFunction(()=>phase==='perfect25');await p.evaluate(()=>WDRng.useTape([.9,.1]));await p.click('#perfect25Die');
  await p.waitForFunction(()=>phase==='perfect25_d4'&&!perfect25Rolling);await p.click('#perfect25D4Die');
  await p.waitForFunction(()=>phase==='attack_ready'&&!perfect25D4Rolling);

  await configureScenario(p,19);await clickBaseAndLock(p,Array(5).fill(.55));
  await p.waitForFunction(()=>phase==='insurance');await p.evaluate(()=>WDRng.useTape([.9]));await p.click('#insuranceDie');
  await p.waitForFunction(()=>phase!=='insurance'&&!insuranceRolling);

  await configureScenario(p,21,1,1);
  await p.evaluate(async()=>{
    WDRng.useTape(Array(5).fill(.9));runLocalEngineMove('rollBase');await qaWait(30);
    dice.forEach(die=>die.selected=true);runLocalEngineMove('lockSelected');
    WDRng.useTape([.7,0,0,0,0]);runLocalEngineMove('rollAttack');await qaWait(30);runLocalEngineMove('resolveCurrentAttackRoll');
    WDRng.useTape([0,0,0,0]);runLocalEngineMove('rollAttack');await qaWait(30);runLocalEngineMove('resolveCurrentAttackRoll');await qaWait(30);
  });
  const counterState=await p.evaluate(()=>({phase,currentSeat:players[current]?.seat,targetSeat:attackTarget==null?null:players[attackTarget]?.seat,
    abilities:players.map((player,index)=>[player.seat,playerAbilities(index)]),attackHits,attackDamage,
    live:window.WDEngineAdapter.getLiveState()}));
  assert.equal(counterState.phase,'counterattack','Counter vorbereitet: '+JSON.stringify(counterState));
  await p.evaluate(()=>WDRng.useTape(Array(5).fill(.05)));
  await p.click('#counterRollBtn');await p.waitForFunction(()=>phase!=='counterattack'&&!counterRolling);

  await configureScenario(p,1);await clickBaseAndLock(p,Array(30).fill(0));
  await p.waitForFunction(()=>secondAbilityDraftBusy);await p.locator('#secondAbilityOptions .second-ability-card').first().click();
  await p.waitForFunction(()=>!secondAbilityDraftBusy);

  await configureScenario(p,1,2,0);
  await p.evaluate(async()=>{
    WDRng.useSeed(0x51a7);players.forEach(player=>player.botLevel='normal');
    for(let step=0;step<30000&&!roundWinnerHandled;step++){
      if(phase==='gamble_retry_offer')startGamblingRetry();else if(phase==='gamble_retry')rollGamblingMan();else performBotAction();
      await qaWait(20);
    }
    players.find(player=>player.seat===0).botLevel='human';renderAll();
  });
  assert.equal(await p.evaluate(()=>roundWinnerHandled),true,'UI-Runde endet');
  assert.equal(await p.locator('#secondAbilityModal').isHidden(),true,'kein Draft nach rundenentscheidendem Kill');
  await p.click('#nextRoundPrepBtn');assert.equal(await p.locator('#nextRoundBox').isVisible(),true);
  await p.click('#startNextRoundBtn');await p.waitForFunction(()=>roundNumber===2&&phase==='idle');
  assert.equal(await p.evaluate(()=>players.every((player,index)=>playerAbilities(index).length===1)),true,'keine gewählte Fähigkeit wird mitgenommen');
}

async function checkUiMatrix(){
  let coveragePage=null;
  for(const locale of ['de-DE','en-US'])for(const width of [320,360,390,412,1280]){
    const p=await openUiPage(width,locale);await setupHumanBot(p);
    assert.equal(await p.locator('html').getAttribute('lang'),locale.slice(0,2));assert.equal(await p.locator('#game').isVisible(),true);
    const layout=await p.evaluate(async()=>{
      let mutations=0;const observer=new MutationObserver(entries=>mutations+=entries.length);
      observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});await qaWait(180);observer.disconnect();
      return {mutations,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.equal(layout.mutations,0,`${locale}/${width}: Leerlauf`);assert.ok(layout.overflow<=1,`${locale}/${width}: Überlauf ${layout.overflow}`);
    if(locale==='de-DE'&&width===390)coveragePage=p;else await p.close();
  }
  await exerciseClicks(coveragePage);await coveragePage.close();
  assert.deepEqual(pageErrors,[],'Browserfehler: '+pageErrors.join('\n'));assert.deepEqual(missing,[],'404: '+missing.join('\n'));
  console.log('Engine-Umschaltung UI: echte Klicks für Wurf, Lock, Angriff, Specials, Counter, Draft und Rundenwechsel; 10 DE/EN-Größen ohne Fehler, 404, Überlauf oder Leerlaufmutation.');
}

try{
  browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined),args:['--no-sandbox']});
  await openPage();
  if(debugSeed){
    const legacy=await play(debugSeed,false,true),engine=await play(debugSeed,true,true);
    const length=Math.max(legacy.trace.length,engine.trace.length);let first=-1;
    for(let index=0;index<length;index++)if(JSON.stringify(legacy.trace[index])!==JSON.stringify(engine.trace[index])){first=index;break;}
    console.log(JSON.stringify({seed:debugSeed,first,legacy:legacy.trace[first],engine:engine.trace[first],
      legacyBefore:legacy.trace[first-1],engineBefore:engine.trace[first-1]},null,2));
  }else{
  for(let seed=1;seed<=count;seed++){
    const legacy=await play(seed,false),engine=await play(seed,true);
    assert.deepEqual(engine,legacy,`Umschaltungsabweichung bei Seed ${seed}:\n${JSON.stringify({legacy,engine},null,2)}`);
  }
  assert.deepEqual(pageErrors,[],'Browserfehler: '+pageErrors.join('\n'));
  console.log(`Engine-Umschaltung ${full?'Vollumfang':'Check-Stichprobe'}: ${count} Classic-1:1-Partien über je drei Runden mit identischen Spiel- und Nebenwirkungszuständen.`);
  await page.close();page=null;await checkUiMatrix();
  }
}finally{
  await page?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));
}
