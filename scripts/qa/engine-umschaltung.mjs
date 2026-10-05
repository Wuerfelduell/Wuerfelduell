import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createServer} from 'node:http';
import {chromium} from 'playwright';

const full=process.argv.includes('--full')||process.env.WD_ENGINE_SWITCH_FULL==='1';
const count=Math.max(full?50:1,Number(process.env.WD_ENGINE_SWITCH_SEEDS)||(full?50:5));
const debugSeed=Number(process.env.WD_ENGINE_SWITCH_DEBUG_SEED)||0;
for(const file of ['02-definitions.js','03-state.js'])
  vm.runInThisContext(fs.readFileSync(path.join('js','engine',file),'utf8'),{filename:file});
const cases=Object.values(globalThis.WDEngine.definitions.LOCAL_MODES).flatMap(mode=>
  Array.from({length:mode.maxPlayers-1},(_,index)=>({modeId:mode.id,requestedPlayers:index+2,allowBots:mode.allowBots})))
  .filter(test=>(!process.env.WD_ENGINE_SWITCH_MODE||test.modeId===process.env.WD_ENGINE_SWITCH_MODE)&&
    (!process.env.WD_ENGINE_SWITCH_PLAYERS||test.requestedPlayers===Number(process.env.WD_ENGINE_SWITCH_PLAYERS)));
assert.ok(cases.length,'Die Auswahl muss mindestens eine freigegebene Kombination erreichen');
// Ausnahmen werden mit einem eigenen Kernnachweis und dem aktiven Altpfad
// geprueft; ein gruener Altpfad-Lauf gilt niemals als Engine-Umschaltung.
const momentumFailures=[{modeId:'endurance50',requestedPlayers:2,seed:38},
  {modeId:'endurance50',requestedPlayers:3,seed:35},{modeId:'endurance50',requestedPlayers:4,seed:27},
  {modeId:'overload75',requestedPlayers:3,seed:15},{modeId:'overload75',requestedPlayers:4,seed:15}];
function momentumFailure(test){return momentumFailures.find(item=>item.modeId===test.modeId&&item.requestedPlayers===test.requestedPlayers);}
function targetedMomentumFailure(test){return test.modeId==='classic'&&test.requestedPlayers>=3&&test.requestedPlayers<=6||
  test.modeId==='overload75'&&test.requestedPlayers===2;}
function coreBlocked(test){return test.requestedPlayers>6||test.modeId==='mayhem'||!!momentumFailure(test)||targetedMomentumFailure(test);}
function fallbackReason(test){return test.requestedPlayers>6?'Kern maximal 6 Sitze':
  test.modeId==='mayhem'?'Kern: Wildcard vorgezogen nach Advance-24-Draft':'Kern: Momentum bleibt nach Perfect-25-Ablehnung';}
function seedCount(test){return test.requestedPlayers>6?1:count;}
for(const test of cases.filter(test=>test.requestedPlayers>6)) assert.throws(()=>globalThis.WDEngine.createState({
  modeId:test.modeId,players:Array.from({length:test.requestedPlayers},(_,seat)=>({seat,abilities:[1]}))
}),TypeError,'Der unveraenderte Kern muss sieben/acht Spieler weiterhin ablehnen');
const root=process.cwd(),types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml',
  '.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://x').pathname),file=path.join(root,pathname);
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));

let browser,page,pageErrors=[],missing=[];
async function openPage(){
  const p=await browser.newPage({viewport:{width:390,height:844},locale:'de-DE',serviceWorkers:'block'});
  // Hier werden Spielzustand und Nebenwirkungen gemessen, ohne Dekoration.
  // Die UI-Matrix nutzt eigene, unveraenderte Browserkontexte mit Beobachtern.
  await p.addInitScript(()=>{window.MutationObserver=class{observe(){}disconnect(){}takeRecords(){return [];}};});
  p.setDefaultTimeout(15000);p.on('pageerror',error=>pageErrors.push(error.message));
  p.on('response',response=>{if(response.status()===404)missing.push(response.url());});
  await p.route(/\/js\/(?:backend-config|41-supabase-core|42-supabase-account|43-supabase-battle|online\/01-online)\.js/,
    route=>route.fulfill({contentType:'text/javascript',body:''}));
  await p.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.fulfill({body:''}));
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForFunction(()=>window.WDEngineAdapter&&typeof performBotAction==='function');
  if(pageErrors.length) throw new Error(pageErrors.join('\n'));
  return p;
}

async function play(test,seed,useEngine,mixedBots=false,fightPage=page){
  return fightPage.evaluate(async({test,seed,useEngine,mixedBots})=>{
    const {modeId,requestedPlayers,allowBots,blocked}=test;
    const actions=[];
    window.__switchOriginalReduce??=WDEngine.reduce;
    WDEngine.reduce=(state,action,random)=>{
      if(useEngine)actions.push({round:state.round.number,...action});
      return window.__switchOriginalReduce(state,action,random);
    };
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
    const profiles=Array.from({length:requestedPlayers},(_,index)=>createProfile('Spieler '+(index+1)));
    WDRng.useSeed(seed>>>0);menuPlayBtn.click();localModeSelect.value=modeId;applyLocalModeSetup();
    if(!Array.from(playerCount.options).some(option=>Number(option.value)===requestedPlayers))
      throw new Error('setup_player_count_missing:'+modeId+'/'+requestedPlayers);
    playerCount.value=String(requestedPlayers);makeNameFields();
    for(let index=0;index<requestedPlayers;index++){
      const bot=document.getElementById('botChoice'+index);
      if(!allowBots&&bot&&!bot.disabled)throw new Error('setup_forbidden_bot:'+modeId);
      if(bot)bot.value=mixedBots&&index===requestedPlayers-1?'normal':'human';syncSetupBotChoice(index);
      const profile=document.getElementById('profileChoice'+index);profile.value=profiles[index].id;
      document.getElementById('seatChoice'+index).value=String(index%SEATS.length);
    }
    rollSetupAbilities();
    setupAbilityRolls.forEach((roll,index)=>{if(roll===6)document.getElementById('abilityChoice'+index).value=String(CHOOSABLE_ABILITY_IDS[0]);});
    startGameBtn.disabled=false;startGameBtn.onclick();clearBotAutomation();
    if(players.length!==requestedPlayers||localModeId!==modeId)throw new Error('switch_setup_failed');
    const active=window.WDEngineAdapter.hasLive(),expected=useEngine&&!blocked;
    if(active!==expected)throw new Error('switch_gate:'+modeId+'/'+requestedPlayers+' expected='+expected+' actual='+active);
    if(players.filter(player=>player.botLevel==='normal').length!==(mixedBots?1:0)||
      players.some(player=>!['human','normal'].includes(player.botLevel)))
      throw new Error('switch_controller_changed:'+modeId);
    // In menschenexklusiven Modi ist der Bot nur der externe Test-Aktionsproduzent.
    // Die echte Vorbereitung muss zuvor alle Plaetze als Menschen gestartet haben.
    players.forEach(player=>{player.botLevel='normal';});
    // Feste Bot-Wahl in Drafts und Rundenvorbereitung, damit beide Pfade dieselbe
    // Auswahl treffen und dieselben Ziehungen verbrauchen; gilt fuer beide Laeufe.
    botPickAbility=ids=>ids[1];
    renderAll=()=>{};renderDice=()=>{};renderPlayers=()=>{};addLog=()=>{};tickSpecialDie=()=>{};
    // Die Spielzustandslaeufe brauchen keine Partikel oder Benachrichtigungen.
    // Die unveraenderte Praesentation wird separat mit echten UI-Klicks geprueft.
    window.WDAttackFx={emit:()=>{},kill:()=>{}};queueEventPopup=()=>{};
    const snapshot=label=>({label,round:roundNumber,
      phase:roundWinnerHandled?'round_preparation':secondAbilityDraftBusy?'draft_pending':!highStakesModal.classList.contains('hidden')?'high_stakes':phase,
      current:players[current]?.name,order:players.map(player=>player.name),
      players:players.map((player,index)=>({name:player.name,seat:player.seat,hp:player.hp,maxHp:player.maxHp,
        abilities:playerAbilities(index),wins:player.wins||0,firstClassStreak:player.firstClassStreak||0,
        momentumStreak:player.momentumStreak||0,
        stats:{...(roundStats[index]||{})}})),
      achievements:saveData.profiles.map(profile=>({name:profile.name,
        ids:Object.keys(profile.achievements||{}).filter(key=>profile.achievements[key]).sort()})).sort((a,b)=>a.name.localeCompare(b.name)),
      // Nach Rundenende gibt es keine Wurf-/Angriffsentscheidung mehr; der alte
      // Pfad zeigt noch den letzten Wurf, waehrend der Reducer ihn bereits leert.
      dice:roundWinnerHandled?null:dice.map(die=>[die.value,!!die.locked]),
      attack:roundWinnerHandled?null:[attackFace,attackTarget==null?null:players[attackTarget]?.name,attackHits,attackDamage],
      draft:secondAbilityDraftBusy?{owner:players[secondAbilityDraftIndex]?.name,slot:secondAbilityDraftSlot,choices:secondAbilityDraftChoices.slice()}:null,
      elimination:roundEliminationOrder.map(index=>players[index].name),winner:roundWinnerIndex==null?null:players[roundWinnerIndex]?.name,
      rng:WDRng.inspect().drawIndex});
    let actionIndex=0;
    if(!useEngine)window.__switchExpected=[];
    const compare=label=>{
      const actual=JSON.stringify(snapshot(label));
      if(!useEngine)window.__switchExpected.push(actual);
      else if(actual!==window.__switchExpected[actionIndex])throw new Error('switch_action_mismatch:'+JSON.stringify({
        modeId,requestedPlayers,seed,mixedBots,actionIndex,actions,previous:window.__switchExpected[actionIndex-1],
        legacy:window.__switchExpected[actionIndex],engine:actual}));
      actionIndex++;
    };
    compare('start');
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
        compare('action');
      }
      if(!roundWinnerHandled) throw new Error('switch_match_did_not_finish:'+JSON.stringify({modeId,requestedPlayers,seed,useEngine,
        state:snapshot('stalled'),baseRerollUsed,loadedDiceUsed,snakeEyesUsesThisTurn:roundStats[current]?.snakeEyesUsesThisTurn,
        lastBaseRollIndices,selected:dice.map(die=>!!die.selected)}));
      const byName=players.map((player,index)=>({name:player.name,hp:player.hp,abilities:playerAbilities(index),
        eliminated:player.hp<=0,wins:player.wins||0,roundStats:{...(roundStats[index]||{})}})).sort((a,b)=>a.name.localeCompare(b.name));
      rounds.push({round:roundNumber,players:byName,winner:roundWinnerIndex==null?null:players[roundWinnerIndex].name,
        elimination:roundEliminationOrder.map(index=>players[index].name),globalRounds:saveData.global.completedRounds});
      if(runde===3) break;
      WDRng.useSeed(((seed*7919)+runde)>>>0);
      prepareNextRound();for(let settle=0;settle<4;settle++)await switchWait();
      compare('prepare_round');
      players.forEach((player,index)=>{
        const selects=Array.from(nextRoundAbilities.querySelectorAll('select')).filter(select=>
          select.id==='nextAbilityChoice'+index||select.id.startsWith('nextAbilityChoice'+index+'_'));
        selects.forEach((select,slot)=>{if(!select.disabled)select.value=String(CHOOSABLE_ABILITY_IDS[slot+2]);});
      });
      startNextRound();for(let settle=0;settle<8;settle++)await switchWait();
      if(roundNumber!==runde+1||phase!=='idle') throw new Error('switch_round_start_failed:'+roundNumber+'/'+phase);
      compare('start_round');
    }
    const profileState=saveData.profiles.map(profile=>({name:profile.name,stats:JSON.parse(JSON.stringify(profile.stats)),
      achievements:Object.keys(profile.achievements||{}).filter(key=>profile.achievements[key]).sort(),
      marks:window.WDShop?.wallet?.(profile)?.marken||0})).sort((a,b)=>a.name.localeCompare(b.name));
    if(useEngine&&actionIndex!==window.__switchExpected.length)throw new Error('switch_action_count_mismatch');
    return {rounds,profiles:profileState,actions:actionIndex-1};
  },{test:{...test,blocked:coreBlocked(test)&&!test.forceCore},seed,useEngine,mixedBots});
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
  await p.evaluate(()=>{
    const nativeTimeout=window.setTimeout.bind(window);
    window.qaWait=ms=>new Promise(resolve=>nativeTimeout(resolve,ms));
    window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,Math.min(Number(ms)||0,8),...args);
  });
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
  });
  const gate=await p.evaluate(()=>({active:window.WDEngineAdapter.hasLive(),flag:ENGINE_LOKALES_DUELL,mode:localModeId,
    players:players.length,rolls:setupAbilityRolls.slice(),startDisabled:startGameBtn.disabled,context:gameContext?.mode,campaign:campaignMode,
    tutorial:tutorialMode,lab:document.body.classList.contains('test-lab-active'),gameHidden:game.classList.contains('hidden')}));
  assert.equal(gate.active,true,'UI-Duell nutzt den Reducer: '+JSON.stringify({gate,pageErrors}));
}

async function setupUiDuel(p,test){
  // Kernproben verwenden funktionale Browserkontexte; dort sind die UI-Timer
  // noch nicht installiert. Ein vorhandenes qaWait bleibt immer nativ.
  await p.evaluate(()=>{
    if(typeof window.qaWait==='function')return;
    const nativeTimeout=window.setTimeout.bind(window);
    window.qaWait=ms=>new Promise(resolve=>nativeTimeout(resolve,ms));
    window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,Math.min(Number(ms)||0,8),...args);
  });
  const profiles=await p.evaluate(count=>{
    localStorage.clear();saveData=createDefaultSave();
    const ids=Array.from({length:count},(_,index)=>createProfile('UI '+(index+1)).id);saveGameData();return ids;
  },test.requestedPlayers);
  await p.click('#menuPlayBtn');
  await p.evaluate(({test,profiles})=>{
    ENGINE_LOKALES_DUELL=true;localModeSelect.value=test.modeId;applyLocalModeSetup();
    playerCount.value=String(test.requestedPlayers);makeNameFields();
    profiles.forEach((id,index)=>{
      const bot=document.getElementById('botChoice'+index);if(bot)bot.value='human';syncSetupBotChoice(index);
      document.getElementById('profileChoice'+index).value=id;
      document.getElementById('seatChoice'+index).value=String(index%SEATS.length);
    });
    WDRng.useSeed(12345);updateStartAvailability();
  },{test,profiles});
  await p.click('#rollAbilities');
  await p.evaluate(()=>{
    setupAbilityRolls.forEach((roll,index)=>{if(roll===6)document.getElementById('abilityChoice'+index).value=String(CHOOSABLE_ABILITY_IDS[0]);});
    updateStartAvailability();
  });
  await p.click('#startGame');
  await p.evaluate(()=>{
    clearBotAutomation();scheduleBotAction=()=>{};
  });
  const gate=await p.evaluate(()=>({active:WDEngineAdapter.hasLive(),mode:localModeId,count:players.length,
    controllers:players.map(player=>player.botLevel),hp:players.map(player=>player.hp),abilities:players.map((_,index)=>playerAbilities(index).length)}));
  assert.equal(gate.active,!coreBlocked(test),JSON.stringify({test,gate}));
  assert.equal(gate.count,test.requestedPlayers);assert.equal(gate.mode,test.modeId);
  assert.ok(gate.controllers.every(level=>level==='human'));
  const rules=globalThis.WDEngine.definitions.LOCAL_MODES[test.modeId];
  assert.ok(gate.hp.every(hp=>hp===rules.startHp));assert.ok(gate.abilities.every(count=>count===rules.startAbilityCount));
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
  let views=0,nextView=0;
  const matrix=cases.flatMap(test=>['de-DE','en-US'].flatMap(locale=>
    [320,360,390,412,1280].map(width=>({test,locale,width}))));
  async function worker(){while(nextView<matrix.length){
    const {test,locale,width}=matrix[nextView++];
    const p=await openUiPage(width,locale);await setupUiDuel(p,test);views++;
    assert.equal(await p.locator('html').getAttribute('lang'),locale.slice(0,2));assert.equal(await p.locator('#game').isVisible(),true);
    const layout=await p.evaluate(async()=>{
      // Die Startaktion loest Dekoration und Uebersetzung in Folgeframes aus.
      // Feste vier Frames abwarten, ohne auf ein ruhiges DOM zu pollen:
      // Eine dauerhafte Beobachterschleife bleibt in der Messung sichtbar.
      for(let frame=0;frame<4;frame++)await new Promise(requestAnimationFrame);
      let mutations=0;const changes=[];const observer=new MutationObserver(entries=>{
        mutations+=entries.length;
        for(const entry of entries){if(changes.length<12)changes.push({type:entry.type,
          target:entry.target.id||entry.target.parentElement?.id||entry.target.nodeName,attribute:entry.attributeName});}
      });
      observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});await qaWait(180);observer.disconnect();
      return {mutations,changes,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    const label=`${test.modeId}/${test.requestedPlayers}, ${locale}/${width}`;
    assert.equal(layout.mutations,0,`${label}: Leerlauf ${JSON.stringify(layout.changes)}`);assert.ok(layout.overflow<=1,`${label}: Überlauf ${layout.overflow}`);
    if(width===390&&[['endurance50',3],['overload75',2],['mayhem',6]].some(([mode,count])=>test.modeId===mode&&test.requestedPlayers===count))
      await exerciseModeRoundPreparation(p,test,locale);
    if(test.modeId==='classic'&&test.requestedPlayers===2&&locale==='de-DE'&&width===390)coveragePage=p;else await p.close();
    if(views%30===0)console.log(`Engine-Umschaltung UI: ${views}/${matrix.length} Ansichten geprueft`);
  }}
  const workers=await Promise.allSettled(Array.from({length:Math.min(4,matrix.length)},()=>worker()));
  const failed=workers.find(result=>result.status==='rejected');if(failed)throw failed.reason;
  if(coveragePage){await coveragePage.evaluate(()=>openMainMenu(true));await setupHumanBot(coveragePage);await exerciseClicks(coveragePage);await checkExcludedContexts(coveragePage);await coveragePage.close();}
  assert.deepEqual(pageErrors,[],'Browserfehler: '+pageErrors.join('\n'));assert.deepEqual(missing,[],'404: '+missing.join('\n'));
  console.log(`Engine-Umschaltung UI: ${views} Ansichten aller freigegebenen Kombinationen in DE/EN und fuenf Breiten; keine Fehler, 404, Ueberlaeufe oder Leerlaufmutationen. Classic-1:1 mit echten Klicks fuer Wurf, Lock, Angriff, Specials, Counter, Draft und Rundenwechsel; Spezialmodi mit zwei/einer/keiner freien Wahl in DE/EN. Ausgeschlossene Kontexte bleiben auf dem Altpfad.`);
}

async function exerciseModeRoundPreparation(p,test,locale){
  const rules=globalThis.WDEngine.definitions.LOCAL_MODES[test.modeId];
  const lastName=await p.evaluate(async abilityCount=>{
    players.forEach(player=>{
      player.ability=3;player.secondAbility=abilityCount>=2?4:null;player.thirdAbility=abilityCount>=3?5:null;
      player.secondAbilityUnlocked=abilityCount>=2;player.thirdAbilityUnlocked=abilityCount>=3;
    });
    startLocalDuelEngine();renderAll();WDRng.useTape(Array(5000).fill(0));
    for(let step=0;step<300&&!roundWinnerHandled;step++){
      if(secondAbilityDraftBusy)chooseSecondAbility(secondAbilityDraftChoices.find(id=>id!==14)||secondAbilityDraftChoices[0]);
      else if(phase==='idle'||phase==='base_ready')rollBase();
      else if(phase==='base_select'){dice.forEach(die=>die.selected=!die.locked);lockSelected();}
      else if(phase==='insurance')rollInsurance();
      else if(phase==='turn_done')advanceTurn();
      await qaWait(30);
    }
    if(!roundWinnerHandled)throw new Error('ui_round_not_finished:'+phase);
    return players[lastPlaceIndex].name;
  },rules.startAbilityCount);
  await p.click('#nextRoundPrepBtn');assert.equal(await p.locator('#nextRoundBox').isVisible(),true);
  const selects=await p.locator('#nextRoundAbilities select').all();
  assert.equal(selects.length,rules.lastPlaceFreeChoices,`${locale}/${test.modeId}: freie Startfaehigkeiten`);
  for(let slot=0;slot<selects.length;slot++)await selects[slot].selectOption(String(slot+3));
  const layout=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(layout<=1,`${locale}/${test.modeId}: Rundenvorbereitung laeuft ueber`);
  await p.click('#startNextRoundBtn');await p.waitForFunction(()=>roundNumber===2&&phase==='idle');
  const round=await p.evaluate(()=>({starter:players[current].name,
    players:players.map((player,index)=>({name:player.name,abilities:playerAbilities(index),hp:player.hp}))}));
  assert.equal(round.starter,lastName);assert.ok(round.players.every(player=>player.hp===rules.startHp&&player.abilities.length===rules.startAbilityCount));
  const last=round.players.find(player=>player.name===lastName);
  for(let slot=0;slot<rules.lastPlaceFreeChoices;slot++)assert.ok(last.abilities.includes(slot+3));
}

async function checkExcludedContexts(p){
  await p.evaluate(()=>{
    const original={mode:gameContext.mode,campaign:campaignMode,tutorial:tutorialMode,flag:ENGINE_LOKALES_DUELL};
    try{
      if(!localEngineEligible())throw new Error('gate_local_missing');
      for(const mode of ['campaign','encounter','boss-rush','tutorial','test-lab','online','setup','menu']){
        gameContext.mode=mode;if(localEngineEligible())throw new Error('gate_excluded_context:'+mode);
      }
      gameContext.mode=original.mode;
      campaignMode=true;if(localEngineEligible())throw new Error('gate_campaign');campaignMode=original.campaign;
      tutorialMode=true;if(localEngineEligible())throw new Error('gate_tutorial');tutorialMode=original.tutorial;
      ENGINE_LOKALES_DUELL=false;if(localEngineEligible())throw new Error('gate_switch');ENGINE_LOKALES_DUELL=original.flag;
      document.body.classList.add('test-lab-active');if(localEngineEligible())throw new Error('gate_lab');
    }finally{
      gameContext.mode=original.mode;campaignMode=original.campaign;tutorialMode=original.tutorial;
      ENGINE_LOKALES_DUELL=original.flag;document.body.classList.remove('test-lab-active');
    }
  });
}

async function checkCoreDraftOrder(){
  for(const test of cases.filter(test=>test.modeId==='mayhem')){
    const p=await openPage();
    try{
      await setupUiDuel(p,test);
      const probe=async useEngine=>p.evaluate(async useEngine=>{
        const eligible=localEngineEligible,createState=WDEngine.createState;
        try{
          // Ein legaler Zwischenstand: Advance/Counterattack mit 31 HP.
          // Nur fuer diesen Nachweis wird der produktive Fallback ueberbrueckt.
          ENGINE_LOKALES_DUELL=useEngine;localEngineEligible=()=>ENGINE_LOKALES_DUELL;
          clearBotAutomation();current=0;roundWinnerHandled=false;roundWinnerIndex=null;lastPlaceIndex=null;roundEliminationOrder=[];
          players.forEach((player,index)=>{
            player.ability=index===0?5:3;player.secondAbility=index===0?21:4;player.thirdAbility=null;
            player.secondAbilityUnlocked=true;player.thirdAbilityUnlocked=false;player.hp=index===0?31:65;player.maxHp=65;
          });
          WDEngine.createState=setup=>{
            const state=createState(setup);state.players.find(player=>player.seat===setup.startingSeat).hp=31;
            if(!WDEngine.validateState(state).valid)throw new Error('invalid_draft_probe');return state;
          };
          WDEngineAdapter.stopLive();if(useEngine)startLocalDuelEngine();
          phase='idle';dice=freshDice();attackFace=null;attackTarget=null;secondAbilityDraftBusy=false;resetRoundStats();
          WDRng.useTape([.4,.7,.9,.7,.7]);rollBase();await qaWait(40);
          dice.forEach(die=>die.selected=true);WDRng.useSeed(2);lockSelected();await qaWait(80);
          const before={phase:secondAbilityDraftBusy?'draft_pending':phase,choices:secondAbilityDraftChoices.slice(),attackFace};
          if(!before.choices.includes(17))throw new Error('probe_wildcard_missing');
          chooseSecondAbility(17);await qaWait(80);
          return {before,after:{phase,hp:players[current].hp,abilities:playerAbilities(current),wildcardFace,rng:WDRng.inspect().drawIndex}};
        }finally{localEngineEligible=eligible;WDEngine.createState=createState;WDEngineAdapter.stopLive();}
      },useEngine);
      const legacy=await probe(false),engine=await probe(true);
      assert.deepEqual(legacy.before.choices,[20,17]);assert.deepEqual(engine.before.choices,legacy.before.choices);
      assert.equal(legacy.after.phase,'attack_ready');assert.equal(engine.after.phase,'attack_ready');
      assert.equal(legacy.after.hp,30);assert.equal(engine.after.hp,30);
      assert.deepEqual(legacy.after.abilities,[5,21,17]);assert.deepEqual(engine.after.abilities,legacy.after.abilities);
      assert.equal(legacy.after.wildcardFace,null,'Altpfad initialisiert den Angriff vor der neuen Wildcard');
      assert.ok(Number.isInteger(engine.after.wildcardFace),'Kern aktiviert die neue Wildcard schon im laufenden Angriff');
      assert.equal(engine.after.rng,legacy.after.rng+1);
      console.log(`Kern-Ausnahme mayhem/${test.requestedPlayers}, Seed 2: 31 HP, [5,21], Wurf [3,5,6,5,5], alle locken, Draft [20,17], 17 waehlen. Altpfad: keine Wildcard; Kern: Wildcard ${engine.after.wildcardFace} und eine zusaetzliche Regelziehung.`);
    }finally{await p.close();}
  }
}

async function checkCoreMomentum(){
  for(const test of cases.filter(momentumFailure)){
    const p=await openPage(),{seed}=momentumFailure(test);
    try{
      // Kontrollierter Kernlauf trotz produktivem Fallback; dieselbe echte
      // Vorbereitung und dieselben drei Runden wie in der Paritaetsmessung.
      await p.evaluate(()=>{window.__switchEligible=localEngineEligible;localEngineEligible=()=>ENGINE_LOKALES_DUELL;});
      const forced={...test,forceCore:true};await play(forced,seed,false,false,p);
      let mismatch;
      try{await play(forced,seed,true,false,p);}catch(error){
        const serialized=error.message.split('switch_action_mismatch:')[1]?.split('\n')[0];
        if(!serialized)throw error;mismatch=JSON.parse(serialized);
      }
      assert.ok(mismatch,`Kern-Ausnahme muss reproduzierbar bleiben: ${test.modeId}/${test.requestedPlayers}`);
      const legacy=JSON.parse(mismatch.legacy),engine=JSON.parse(mismatch.engine);
      const index=legacy.players.findIndex((player,index)=>player.momentumStreak!==engine.players[index].momentumStreak);
      assert.ok(index>=0);assert.equal(legacy.players[index].momentumStreak,0);assert.ok(engine.players[index].momentumStreak>0);
      assert.ok(mismatch.actions.slice(-3).some(action=>action.type==='roll_perfect25'));
      console.log(`Kern-Ausnahme ${test.modeId}/${test.requestedPlayers}, Seed ${seed}, Aktion ${mismatch.actionIndex}: Perfect 25 abgelehnt, Momentum Altpfad 0 / Kern ${engine.players[index].momentumStreak}. Folgeangriffe erhalten unberechtigt mehr Schaden.`);
    }finally{
      await p.evaluate(()=>{localEngineEligible=window.__switchEligible;});await p.close();
    }
  }
}

// Zufaellige Partien treffen nicht jeden erlaubten Faehigkeiten-Zwischenstand.
// Dieser zulaessige Zwischenstand erzwingt den gemeinsamen Kernfehler unabhaengig
// von der Stichprobe und zeigt den Folgeschaden; keine produktive Kernkorrektur.
async function checkCoreTargetedMomentum(){
  for(const test of cases.filter(targetedMomentumFailure)){
    const p=await openPage();
    try{await setupUiDuel(p,test);
    const probe=async useEngine=>p.evaluate(async({useEngine,test})=>{
      const createState=WDEngine.createState,eligible=localEngineEligible;
      try{
        clearBotAutomation();scheduleBotAction=()=>{};ENGINE_LOKALES_DUELL=useEngine;localEngineEligible=()=>ENGINE_LOKALES_DUELL;renderAll=()=>{};renderDice=()=>{};renderPlayers=()=>{};addLog=()=>{};tickSpecialDie=()=>{};queueEventPopup=()=>{};window.WDAttackFx={emit:()=>{},kill:()=>{}};
        const count=LOCAL_MODES[test.modeId].startAbilityCount;
        current=0;roundWinnerHandled=false;roundWinnerIndex=null;lastPlaceIndex=null;roundEliminationOrder=[];
        players.forEach((player,index)=>{
          player.ability=index===0?15:3;player.secondAbility=index===0?10:count>=2?4:null;player.thirdAbility=count>=3?(index===0?3:9):null;
          player.secondAbilityUnlocked=index===0||count>=2;player.thirdAbilityUnlocked=count>=3;
          player.hp=index===0?(test.modeId==='classic'?11:LOCAL_MODES[test.modeId].startHp):LOCAL_MODES[test.modeId].startHp;
          player.maxHp=LOCAL_MODES[test.modeId].startHp;player.momentumStreak=index===0?2:0;
        });
        WDEngine.createState=setup=>{
          const state=createState({...setup,players:setup.players.map(player=>({...player,abilities:player.abilities.slice(0,count)}))});
          const active=state.players.find(player=>player.seat===setup.startingSeat);
          active.abilities=players[current].thirdAbility?[15,10,3]:[15,10];active.hp=players[current].hp;
          active.bonusAbilityUnlocked=test.modeId==='classic';active.effects.momentumStreak=2;
          state.turn.number=3*setup.players.length+1;state.sequence.action=100*setup.players.length;state.sequence.event=200*setup.players.length;
          const validation=WDEngine.validateState(state);if(!validation.valid)throw new Error(JSON.stringify(validation));return state;
        };
        WDEngineAdapter.stopLive();if(useEngine)startLocalDuelEngine();
        phase='idle';dice=freshDice();attackFace=null;attackTarget=null;secondAbilityDraftBusy=false;resetRoundStats();renderAll();
        WDRng.useTape(Array(5).fill(.7));rollBase();await qaWait(40);dice.forEach(die=>die.selected=true);lockSelected();await qaWait(60);
        if(phase!=='perfect25')throw new Error('probe_phase:'+phase);
        WDRng.useSeed(7);rollPerfect25();await qaWait(400);
        const momentum=players[0].momentumStreak,permitRng=WDRng.inspect().drawIndex;
        for(let turn=1;turn<players.length;turn++){
          WDRng.useTape(Array(5).fill(.7));rollBase();await qaWait(40);dice.forEach(die=>die.selected=true);lockSelected();await qaWait(400);
        }
        if(current!==0||phase!=='idle')throw new Error('probe_next_turn:'+current+'/'+phase);
        WDRng.useTape(Array(5).fill(.9));rollBase();await qaWait(40);dice.forEach(die=>die.selected=true);lockSelected();await qaWait(80);
        if(phase!=='attack_ready')throw new Error('probe_attack:'+phase);
        const target=attackTarget,beforeHp=players[target].hp;
        WDRng.useTape([.7,.7,0,0,0]);rollAttack();await qaWait(40);resolveCurrentAttackRoll();await qaWait(80);
        WDRng.useTape(Array(100).fill(0));rollAttack();await qaWait(40);resolveCurrentAttackRoll();await qaWait(80);
        return {momentum,hp:players[0].hp,phase,permitRng,targetHp:players[target].hp,damage:beforeHp-players[target].hp};
      }finally{WDEngine.createState=createState;localEngineEligible=eligible;WDEngineAdapter.stopLive();}
    },{useEngine,test});
    const legacy=await probe(false),engine=await probe(true);
      assert.equal(legacy.momentum,0);assert.equal(engine.momentum,2);
      assert.equal(legacy.permitRng,1);assert.equal(engine.permitRng,1);
      assert.equal(legacy.damage,10);assert.equal(engine.damage,14);
      assert.equal(legacy.targetHp-engine.targetHp,4);
      console.log(`Kern-Ausnahme ${test.modeId}/${test.requestedPlayers}, Seed 7 im legalen 15+10-Zwischenstand: Momentum 2, Basiswurf 25, Perfect 25 D6=1 abgelehnt. Altpfad Momentum 0 / Kern 2; naechster Angriff mit zwei 5er-Treffern: ${legacy.damage} / ${engine.damage} HP Schaden.`);
    }finally{await p.close();}
  }
}


try{
  browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined),args:['--no-sandbox']});
  const results=[],failures=[];
  let nextCase=0;
  // Getrennte Browserkontexte: keine gemeinsam benutzten Spieler, Saves oder
  // Zufallsfolgen. Vier Kombinationen duerfen unabhaengig voneinander laufen.
  async function worker(){
    const fightPage=await openPage();
    try{while(nextCase<cases.length){
    const test=cases[nextCase++];
    const row={Kombination:`${test.modeId} / ${test.requestedPlayers}`,Seeds:0,Aktionen:0,Abweichungen:0,
      Pfad:coreBlocked(test)?'Altpfad: '+fallbackReason(test):'Engine'};
    try{
      for(let seed=debugSeed||1;seed<=(debugSeed||seedCount(test));seed++){
        const legacy=await play(test,seed,false,false,fightPage),engine=await play(test,seed,true,false,fightPage);
        assert.deepEqual(engine,legacy,`Umschaltungsabweichung ${row.Kombination}, Seed ${seed}`);
        row.Seeds++;row.Aktionen+=engine.actions;
        if(full&&row.Seeds%10===0)console.log(`${row.Kombination}: ${row.Seeds}/${count} Seeds geprueft`);
      }
      if(test.allowBots){
        const legacy=await play(test,0x51a7,false,true,fightPage),engine=await play(test,0x51a7,true,true,fightPage);
        assert.deepEqual(engine,legacy,`Botfreigabe ${row.Kombination}`);row.Aktionen+=engine.actions;
      }
    }catch(error){row.Abweichungen++;failures.push({test:row.Kombination,error:error.message});console.error(row.Kombination+'\n'+error.message);}
    results.push(row);console.log(JSON.stringify(row));
    }}finally{await fightPage.close();}
  }
  await Promise.all(Array.from({length:Math.min(4,cases.length)},()=>worker()));
  results.sort((a,b)=>cases.findIndex(test=>`${test.modeId} / ${test.requestedPlayers}`===a.Kombination)-
    cases.findIndex(test=>`${test.modeId} / ${test.requestedPlayers}`===b.Kombination));
  console.table(results);
  if(failures.length)throw new Error(`${failures.length} Kombinationen fehlgeschlagen`);
  assert.deepEqual(pageErrors,[],'Browserfehler: '+pageErrors.join('\n'));
  console.log(`Engine-Umschaltung ${full?'Vollumfang':'Check-Stichprobe'}: ${cases.filter(test=>!coreBlocked(test)).length} Engine-Kombinationen und ${cases.filter(test=>coreBlocked(test)&&test.requestedPlayers<=6).length} begruendete Altpfade mit ${debugSeed?1:count} Seeds, ${cases.filter(test=>test.requestedPlayers>6).length} Classic-Altpfade mit einem Seed; je drei Runden, Spielzustand nach jeder Aktion und Nebenwirkungen identisch.`);
  await checkCoreDraftOrder();
  await checkCoreMomentum();
  await checkCoreTargetedMomentum();
  if(!debugSeed)await checkUiMatrix();
}finally{
  await page?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));
}
