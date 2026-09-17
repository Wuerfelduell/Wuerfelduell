// Browser spielt den bisherigen lokalen Pfad; Node wiederholt dieselben
// Reducer-Aktionen mit den im Browser aufgezeichneten Regelziehungen.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createServer} from 'node:http';
import {chromium} from 'playwright';

for(const file of ['01-rng.js','02-definitions.js','03-state.js','04-rules.js','05-reduce.js','06-adapter.js'])
  vm.runInThisContext(fs.readFileSync(path.join('js','engine',file),'utf8'),{filename:file});
const adapter=globalThis.WDEngineAdapter;
const full=process.argv.includes('--full')||process.env.WD_ENGINE_PARITY_FULL==='1';
const onlySeed=process.env.WD_ENGINE_PARITY_SEED?Number(process.env.WD_ENGINE_PARITY_SEED):null;
const firstSeed=process.env.WD_ENGINE_PARITY_SEED_START?Number(process.env.WD_ENGINE_PARITY_SEED_START):null;
const lastSeed=process.env.WD_ENGINE_PARITY_SEED_END?Number(process.env.WD_ENGINE_PARITY_SEED_END):null;
const onlyMode=process.env.WD_ENGINE_PARITY_MODE||null;
const onlyPlayers=process.env.WD_ENGINE_PARITY_PLAYERS?Number(process.env.WD_ENGINE_PARITY_PLAYERS):null;
const plan=full?[
  ['classic',2,1000],['endurance50',2,100],['overload75',2,100],['mayhem',2,100],
  ['classic',3,50],['classic',4,50],['mayhem',3,50],['mayhem',4,50]
]:[
  ['classic',2,12],['endurance50',2,4],['overload75',2,4],['mayhem',2,4],
  ['classic',3,2],['classic',4,2],['mayhem',3,2],['mayhem',4,2]
];

const root=process.cwd(),types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml',
  '.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://x').pathname),file=path.join(root,pathname);
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));

let browser,page,totalMatches=0,totalActions=0,pageErrors=[];
const failures=[];
async function openPage(){
  page=await browser.newPage({viewport:{width:390,height:844},locale:'de-DE',serviceWorkers:'block'});
  page.setDefaultTimeout(15000);
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.route(/\/js\/(?:backend-config|41-supabase-core|42-supabase-account|43-supabase-battle|online\/01-online)\.js/,
    route=>route.fulfill({contentType:'text/javascript',body:''}));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.fulfill({body:''}));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  if(pageErrors.length) throw new Error(pageErrors.join('\n'));
  await page.waitForFunction(()=>window.WDEngineAdapter&&typeof performBotAction==='function');
}

async function browserFight(modeId,playerCount,seed){
  const result=await page.evaluate(async({modeId,playerCount:requestedPlayers,seed})=>{
    clearBotAutomation();scheduleBotAction=()=>{};
    if(!window.__parityTimersReady){
      const cancelledTimeouts=new Set(),activeIntervals=new Set();let timerId=0;
      window.setTimeout=(fn,_ms,...args)=>{
        const id=++timerId;queueMicrotask(()=>{if(!cancelledTimeouts.has(id))fn(...args);});return id;
      };
      window.clearTimeout=id=>cancelledTimeouts.add(id);
      window.setInterval=(fn,_ms,...args)=>{
        const id=++timerId;activeIntervals.add(id);
        const tick=()=>{if(!activeIntervals.has(id))return;fn(...args);queueMicrotask(tick);};
        queueMicrotask(tick);return id;
      };
      window.clearInterval=id=>activeIntervals.delete(id);
      window.__parityTimersReady=true;
    }
    window.parityWait=()=>Promise.resolve();

    WDRng.useSeed(seed>>>0);
    menuPlayBtn.click();localModeSelect.value=modeId;applyLocalModeSetup();
    playerCount.value=String(requestedPlayers);makeNameFields();
    for(let index=0;index<requestedPlayers;index++){
      const choice=document.getElementById('botChoice'+index);
      if(choice){choice.value='normal';syncSetupBotChoice(index);}
    }
    rollSetupAbilities();startGameBtn.disabled=false;startGameBtn.onclick();clearBotAutomation();
    if(!Array.isArray(players)||players.length!==requestedPlayers) throw new Error('browser_setup_failed');
    renderAll=()=>{};renderDice=()=>{};renderPlayers=()=>{};addLog=()=>{};tickSpecialDie=()=>{};
    players.forEach(player=>{player.botLevel='normal';});
    const seatByPlayer=new Map(players.map((player,seat)=>[player,seat]));
    window.paritySnapshot=()=>{
      const winner=roundWinnerIndex==null?null:seatByPlayer.get(players[roundWinnerIndex]);
      return {phase,currentSeat:seatByPlayer.get(players[current]),roundWinnerHandled,winnerSeat:winner,
        draftActive:secondAbilityDraftBusy,highStakesOpen:!highStakesModal.classList.contains('hidden'),
        attackTargetSeat:attackTarget==null||attackTarget<0?null:seatByPlayer.get(players[attackTarget]),
        lastBaseRollIndices:[...lastBaseRollIndices],lastAttackRollIndices:[...lastAttackRollIndices],
        dice:dice.map(die=>({value:die.value,locked:!!die.locked,selected:!!die.selected})),
        players:players.map((player,index)=>({seat:seatByPlayer.get(player),hp:player.hp,abilities:playerAbilities(index)}))};
    };
    const initial=paritySnapshot();
    const setup={modeId,startingSeat:initial.currentSeat,roundNumber,
      players:initial.players.map(player=>({seat:player.seat,abilities:player.abilities}))};
    WDEngineAdapter.startShadow(setup,paritySnapshot);
    const first=WDEngineAdapter.getShadow();
    if(WDEngineAdapter.differences(first.initialBrowser,first.initialEngine).length)
      throw new Error('initial_state_mismatch:'+JSON.stringify({browser:first.initialBrowser,engine:first.initialEngine}));

    for(let step=0;step<20000&&!roundWinnerHandled;step++){
      if(phase==='gamble_retry_offer') startGamblingRetry();
      else if(phase==='gamble_retry') rollGamblingMan();
      else performBotAction();
      await parityWait();
      let waits=0;
      while(!roundWinnerHandled&&(isAnimating||gamblingRolling||perfect25Rolling||perfect25D4Rolling||
        highStakesRolling||insuranceRolling||counterRolling||eventPopupBusy||(phase==='base_auto_end'&&!secondAbilityDraftBusy))){
        if(++waits>200) throw new Error('browser_action_stalled:'+phase);
        await parityWait();
      }
      for(let settle=0;settle<6;settle++) await parityWait();
      const entry=WDEngineAdapter.flush();
      if(entry&&(entry.differences.length||entry.remainingDraws))
        return {setup,entries:WDEngineAdapter.getShadow().entries,browserFailure:entry};
    }
    WDEngineAdapter.flush();
    if(!roundWinnerHandled) throw new Error('browser_match_did_not_finish:'+phase);
    return {setup,entries:WDEngineAdapter.getShadow().entries,browserFailure:null};
  },{modeId,playerCount,seed});
  if(pageErrors.length) throw new Error(pageErrors.join('\n'));
  return result;
}

function firstFailure(replay){
  return replay.compared.find(entry=>entry.differences.length||entry.remainingDraws)||null;
}

try{
  browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined),args:['--no-sandbox']});
  await openPage();
  for(const [modeId,playerCount,count] of plan){
    if(onlyMode&&modeId!==onlyMode||onlyPlayers&&playerCount!==onlyPlayers) continue;
    for(let seed=1;seed<=count;seed++){
      if(onlySeed!==null&&seed!==onlySeed) continue;
      if(firstSeed!==null&&seed<firstSeed||lastSeed!==null&&seed>lastSeed) continue;
      let trace;
      try{trace=await browserFight(modeId,playerCount,seed);}
      catch(error){throw new Error(`Paritaetslauf ${modeId}/${playerCount}/Seed ${seed}: ${error.message}`,{cause:error});}
      const replay=adapter.replay(trace.setup,trace.entries);
      const failure=trace.browserFailure||firstFailure(replay);
      if(failure){
        failures.push({modeId,playerCount,seed,actionIndex:failure.index,differences:failure.differences,
          move:failure.move,actions:failure.actions,draws:failure.draws,events:failure.events,engineBefore:failure.engineBefore,
          browserState:failure.browserState,engineState:failure.engineState,remainingDraws:failure.remainingDraws});
        break;
      }
      totalMatches++;totalActions+=trace.entries.length;
    }
    if(failures.length) break;
  }
  assert.deepEqual(failures,[],failures.length?`Paritaetsabweichung: ${JSON.stringify(failures[0],null,2)}`:'');
  console.log(`Engine-Paritaet ${full?'Vollumfang':'Check-Stichprobe'}: ${totalMatches} Duelle, ${totalActions} Aktionen, keine Abweichung.`);
}finally{
  await page?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));
}
