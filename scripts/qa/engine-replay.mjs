// Anforderung: echte lokale Bot-Partie, zweimaliger Replay, gleiche Ziehungen
// und vollständiger regelwirksamer Endzustand; Diagnose darf Gameplay nicht ändern.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
const rngSource=fs.readFileSync('js/engine/01-rng.js','utf8');
const context=vm.createContext({console,Math:Object.create(Math)});
vm.runInContext(rngSource,context);
const rng=context.WDRng;
context.Math.random=()=>0.375;
assert.equal(rng.random(),0.375,'Standard bleibt Math.random');
rng.useSeed(123);const sequence=Array.from({length:12},()=>rng.random());
rng.useSeed(123);assert.deepEqual(Array.from({length:12},()=>rng.random()),sequence);
rng.useSeed(123);rng.visual(()=>rng.random());assert.equal(rng.random(),sequence[0],'Animation verbraucht keinen Seed');
rng.reset();assert.equal(rng.random(),0.375);
rng.useSeed(0);assert.ok(Number.isFinite(rng.random()));
rng.useTape([0.1]);assert.equal(rng.random(),0.1);assert.throws(()=>rng.random(),/aufgebraucht/);
assert.throws(()=>rng.useTape([1]),/Ungültige/);
rng.reset();rng.startTrace({});rng.beginAction({type:'test'});rng.random();rng.endAction();
const detached=rng.getTrace();detached.entries[0].draws[0]=99;assert.equal(rng.getTrace().entries[0].draws[0],0.375);

const errors=[],missing=[],root=process.cwd();
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{try{const file=path.join(root,new URL(req.url,'http://x').pathname);res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
async function page(width=390,locale='de-DE'){
  const p=await browser.newPage({viewport:{width,height:844},locale,serviceWorkers:'block'});
  p.setDefaultTimeout(15000);
  p.on('console',m=>{if(m.text().startsWith('Replay:'))console.log(m.text());});
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()===404)missing.push(r.url());});
  await p.route(/\/js\/(?:backend-config|41-supabase-core|42-supabase-account|43-supabase-battle|online\/01-online)\.js/,r=>r.fulfill({contentType:'text/javascript',body:''}));
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.fallback():r.fulfill({body:''}));
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  if(errors.length)throw Error(errors.join('\n'));
  await p.waitForFunction(()=>window.WDRng&&typeof performBotAction==='function');
  return p;
}
async function setup(p){
  await p.evaluate(()=>{
    clearBotAutomation();scheduleBotAction=()=>{};
    // Nur Wartezeiten beschleunigen; sämtliche Regeln, Bots, Renderer bleiben echt.
    const nativeTimeout=window.setTimeout.bind(window);
    window.replayWait=ms=>new Promise(r=>nativeTimeout(r,ms));
    window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,Math.min(Number(ms)||0,5),...args);
    WDRng.useSeed(0x13579);
    document.getElementById('menuPlayBtn').click();
    playerCount.value='2';makeNameFields();
    for(let i=0;i<2;i++){document.getElementById('botChoice'+i).value='normal';syncSetupBotChoice(i);}
    rollSetupAbilities();startGameBtn.click();clearBotAutomation();
    window.replayState=()=>JSON.parse(JSON.stringify({players,dice,current,phase,roundStats,turnDamageThisTurn,roundNumber,roundWinnerIndex,roundWinnerHandled,roundEliminationOrder,lastPlaceIndex,attackFace,attackTarget,attackHits,attackDamage,firstAttackRoll,currentAttackRollNewHits,baseRerollUsed,loadedDiceUsed,lastBaseRollIndices,attackPowerUsed,precisionUses,luckRerollIndex,luckRerollSecondUsed,luckRerollUses,loadedDiceUses,attackPowerUses,lastAttackRollIndices,attackRollCount,attackMasteryRollCount,normalAttackHitsThisAttack,exactFaceHitsThisAttack,wildcardAttackHitsThisAttack,wildcardSecondRollArmed,wildcardTriggeredThisAttack,masteryL2AttackBonusesApplied,bloodPricePaidThisRoll,bloodPriceWasPreActivatedThisRoll,currentAttackSource,currentAttackBaseTotal,gamblingRetryUsed,gamblingRetryPending,momentumBonus,bloodPriceNeighbors,bloodRushActiveThisAttack,doubleTapApplied,nextRoundAbilityRolls,secondAbilityDraftBusy,secondAbilityDraftIndex,secondAbilityDraftSlot,deferredBaseAdvance,gamblingBaseTotal,highStakesDecisionThisAttack,perfect25BaseTotal,pendingPerfect25Total,wildcardFace,insuranceContext,counterContext,counterDiceState,counterHits,counterFirstRoll,pendingCounterattack,deferredAttackFinish,secondAbilityDraftChoices,secondAbilityDraftQueue}));
  });
}
async function fight(tape){
  console.log(tape?'Replay startet':'Bot-Partie startet');
  const p=await page();await setup(p);
  console.log('Lokale Partie eingerichtet');
  const result=await p.evaluate(async tape=>{
    const initial=replayState();
    if(tape)WDRng.useTape(tape.entries.flatMap(e=>e.draws));
    WDRng.startTrace(initial);
    for(let i=0;i<400&&!roundWinnerHandled;i++){
      if(i%50===0)console.log('Replay: Schritt '+i+' / '+phase);
      const action=tape?tape.entries[i]?.action:{type:'bot_step',owner:botActionOwner(),phase};
      if(!action||action.owner!==botActionOwner()||action.phase!==phase)throw Error('Replay-Aktion passt nicht zum Zustand');
      WDRng.beginAction(action);performBotAction();
      // Auch verschachtelte Abschluss-/Popup-Timer müssen beendet sein.
      await replayWait(120);
      let waits=0;
      while(!roundWinnerHandled&&(isAnimating||gamblingRolling||perfect25Rolling||perfect25D4Rolling||highStakesRolling||insuranceRolling||counterRolling||eventPopupBusy||(phase==='base_auto_end'&&!secondAbilityDraftBusy))){
        if(++waits>200)throw Error('Aktion nicht abgeschlossen: '+phase);
        await replayWait(20);
      }
      WDRng.endAction();
    }
    if(!roundWinnerHandled)throw Error('Bot-Partie endet nicht: '+phase);
    return {initial,state:replayState(),trace:WDRng.getTrace(),remaining:WDRng.remaining()};
  },tape||null);
  await p.close();return result;
}
try{
  browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined),args:['--no-sandbox']});
  const original=await fight();assert.ok(original.trace.entries.length>10);
  for(let i=0;i<2;i++){const replay=await fight(original.trace);assert.deepEqual(replay.initial,original.initial);assert.deepEqual(replay.state,original.state);assert.deepEqual(replay.trace.entries,original.trace.entries);assert.equal(replay.remaining,0);}
  console.log(`Engine-Replay: ${original.trace.entries.length} Bot-Aktionen zweimal identisch nachgespielt.`);
  // Derselbe Aufzeichnungspfad am tatsächlichen Host-Einstieg, ohne Backend.
  const host=await page();
  const hostResult=await host.evaluate(async()=>{
    const match={id:'qa-match',roomCode:'ABCDEF',players:[{uid:'host',name:'Host',ability:1},{uid:'guest',name:'Gast',ability:2}]};
    WDOnlineBridge.startMatch(match,'host',null,true);WDRng.useSeed(17);
    const published=[];
    const state=await WDOnlineBridge.hostExecuteAction({id:'a1',actorUid:'host',type:'primary',payload:{}},s=>published.push(s));
    const trace=WDRng.getTrace();
    let rejected=false;try{await WDOnlineBridge.hostExecuteAction({id:'wrong',actorUid:'guest',type:'primary'});}catch{rejected=true;}
    return {trace,state,published,rejected,count:WDRng.getTrace().entries.length};
  });
  assert.equal(hostResult.trace.entries.length,1);assert.equal(hostResult.trace.entries[0].draws.length,5);
  assert.equal(hostResult.trace.entries[0].status,'ok');assert.equal(hostResult.state.settled,true);
  assert.equal(hostResult.published.length,1);assert.equal(hostResult.published[0].settled,false);
  assert.equal(hostResult.rejected,true);assert.equal(hostResult.count,1);
  assert.ok(!('trace' in hostResult.state),'Online-Payload enthält kein Diagnoseprotokoll');
  const late=await host.evaluate(async()=>{
    openInsurance(24,1,'finish');
    await WDOnlineBridge.hostExecuteAction({id:'a2',actorUid:'host',type:'insurance_roll',payload:{}});
    return WDRng.getTrace().entries.at(-1);
  });
  assert.equal(late.status,'ok');assert.equal(late.draws.length,1,'Späte Regelziehung erfasst, Animationsaugen ausgenommen');
  const diagnosticFailure=await host.evaluate(async()=>{
    WDOnlineBridge.startMatch({id:'qa-fail',players:[{uid:'host',ability:1},{uid:'guest',ability:2}]},'host',null,true);
    const original=WDRng;
    window.WDRng={...original,startTrace(){throw Error('Absichtlicher Diagnosefehler');}};
    try{return (await WDOnlineBridge.hostExecuteAction({id:'a3',actorUid:'host',type:'primary',payload:{}})).settled;}
    finally{window.WDRng=original;}
  });
  assert.equal(diagnosticFailure,true,'Diagnosefehler blockiert Host-Aktion nicht');
  const lab=await host.evaluate(()=>{
    WDOnlineBridge.stopMatch();gameContext.mode='test-lab';WDRng.useSeed(19);
    const first=Array.from({length:20},()=>randDieForPlayer(0));WDRng.useSeed(19);
    return {first,second:Array.from({length:20},()=>randDieForPlayer(0))};
  });
  assert.deepEqual(lab.first,lab.second);assert.ok(lab.first.every(v=>v===5||v===6));
  await host.close();
  for(const locale of ['de-DE','en-US'])for(const width of [320,360,390,412,1280]){
    const p=await page(width,locale);await setup(p);await p.waitForTimeout(400);
    assert.equal(await p.locator('html').getAttribute('lang'),locale.slice(0,2));
    assert.equal(await p.locator('#game').isVisible(),true);
    const layout=await p.evaluate(async()=>{
      let mutations=0;const observer=new MutationObserver(es=>mutations+=es.length);
      observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
      await replayWait(1000);observer.disconnect();
      return {mutations,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.equal(layout.mutations,0,`${locale}/${width}: Leerlauf`);assert.ok(layout.overflow<=1,`${locale}/${width}: Überlauf ${layout.overflow}`);
    if(process.env.WD_ENGINE_SCREENSHOTS){fs.mkdirSync(process.env.WD_ENGINE_SCREENSHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.WD_ENGINE_SCREENSHOTS,`battle-${locale}-${width}.png`)});}
    await p.close();
  }
  console.log('Host-Protokoll und Kampfansicht: 10 DE/EN-Größen, keine JS-Fehler, 404, Überläufe oder Leerlaufmutationen.');
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
