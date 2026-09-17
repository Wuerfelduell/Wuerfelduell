// Reiner Browser-/Reducer-Uebersetzer und fluechtiger Schattenlauf fuer lokale Duelle.
(function(root){
  'use strict';
  const engine=root.WDEngine;
  if(!engine?.actions || !engine?.createState || !engine?.reduce)
    throw new Error('Duell-Engine muss vor dem Adapter geladen werden');
  const A=engine.actions,copy=value=>JSON.parse(JSON.stringify(value));

  const moveTypes=Object.freeze({
    rollBase:A.ROLL_BASE,useBaseReroll:A.USE_LUCK_REROLL,useLoadedDice:A.USE_LOADED_DICE,
    useSnakeEyes:A.USE_SNAKE_EYES,lockSelected:A.LOCK_SELECTED,rollInsurance:A.ROLL_INSURANCE,
    useBloodPrice:A.USE_BLOOD_PRICE,useBloodRushSelfHarm:A.USE_BLOOD_RUSH_SELF_HARM,
    rollAttack:A.ROLL_ATTACK,useAttackPower:A.USE_ATTACK_POWER,
    continueDoubleTapAttack:A.CONTINUE_DOUBLE_TAP,resolveCurrentAttackRoll:A.RESOLVE_ATTACK,
    rollCounterattack:A.ROLL_COUNTERATTACK,rollGamblingMan:A.ROLL_GAMBLING,
    startGamblingRetry:A.ACCEPT_GAMBLING_RETRY,declineGamblingRetry:A.DECLINE_GAMBLING_RETRY,
    rollPerfect25:A.ROLL_PERFECT25,rollPerfect25D4:A.ROLL_PERFECT25_D4,
    rollHighStakes:A.ROLL_HIGH_STAKES,skipHighStakes:A.SKIP_HIGH_STAKES,
    chooseSecondAbility:A.CHOOSE_ABILITY,advanceTurn:A.END_TURN,startNextRound:A.PREPARE_ROUND
  });
  const hookNames=Object.freeze(Object.keys(moveTypes).filter(name=>name!=='startNextRound'));

  function decisionSeat(state){return state.turn.decision?.seat??state.turn.currentSeat;}
  function selectionActions(state,browserState){
    if(!Array.isArray(browserState?.dice)) return [];
    const actions=[];
    state.dice.forEach((die,index)=>{
      const wanted=browserState.dice[index]?.selected===true;
      if(!die.locked&&die.value!==null&&die.selected!==wanted)
        actions.push({type:A.TOGGLE_BASE_DIE,seat:decisionSeat(state),index});
    });
    return actions;
  }
  function browserMoveToActions(move,state,browserState){
    const type=moveTypes[move?.name];
    if(!type) return [];
    const actions=(move.name==='lockSelected'||move.name==='useLoadedDice')?selectionActions(state,browserState):[];
    const action={type,seat:decisionSeat(state)};
    if(type===A.CHOOSE_ABILITY) action.abilityId=Number(move.args?.[0]);
    actions.push(action);
    return actions;
  }

  const eventCalls=Object.freeze({
    DiceRolled:event=>[{name:'animateIndices',args:[event.indices]}],
    DiceLocked:()=>[{name:'renderDice',args:[]}],
    DieChanged:()=>[{name:'renderDice',args:[]}],
    DamageApplied:event=>[{name:'applyDamageToPlayer',args:[event.targetSeat,event.amount,event.source]}],
    Healed:event=>[{name:'recordHealing',args:[event.seat,event.amount]},{name:'renderPlayers',args:[]}],
    PlayerEliminated:event=>[{name:'markEliminated',args:[event.seat]}],
    AbilityDraftOpened:()=>[{name:'renderAll',args:[]}],
    AbilityChosen:()=>[{name:'renderAll',args:[]}],
    TurnStarted:()=>[{name:'renderAll',args:[]}],
    RoundEnded:()=>[{name:'checkWinner',args:[]}],
    RoundStarted:()=>[{name:'renderAll',args:[]}],
    DecisionRequired:()=>[{name:'renderAll',args:[]}]
  });
  function reducerEventToBrowserCalls(event){
    const map=eventCalls[event?.type];
    return map?map(event).map(copy):[];
  }

  function normalizedPhase(browserState){
    if(browserState?.roundWinnerHandled||browserState?.winnerSeat!==null&&browserState?.winnerSeat!==undefined)
      return 'round_preparation';
    if(browserState?.draftActive) return 'draft_pending';
    if(browserState?.highStakesOpen) return 'high_stakes';
    return browserState?.phase??null;
  }
  function normalizeBrowserState(browserState){
    const players=(browserState?.players||[]).map(player=>({seat:player.seat,hp:player.hp,
      abilities:(player.abilities||[]).slice(),eliminated:player.hp<=0})).sort((a,b)=>a.seat-b.seat);
    return {players,eliminatedSeats:players.filter(player=>player.eliminated).map(player=>player.seat),
      winnerSeat:browserState?.winnerSeat??null,phase:normalizedPhase(browserState)};
  }
  function normalizeEngineState(state){
    const players=state.players.map(player=>({seat:player.seat,hp:player.hp,abilities:player.abilities.slice(),
      eliminated:player.hp<=0})).sort((a,b)=>a.seat-b.seat);
    return {players,eliminatedSeats:players.filter(player=>player.eliminated).map(player=>player.seat),
      winnerSeat:state.round.winnerSeat,phase:state.turn.phase};
  }
  function differences(left,right,path='',result=[]){
    if(Object.is(left,right)) return result;
    if(typeof left!==typeof right||left===null||right===null){result.push(path||'$');return result;}
    if(Array.isArray(left)||Array.isArray(right)){
      if(!Array.isArray(left)||!Array.isArray(right)||left.length!==right.length){result.push(path||'$');return result;}
      left.forEach((value,index)=>differences(value,right[index],`${path}[${index}]`,result));return result;
    }
    if(typeof left==='object'){
      const keys=new Set([...Object.keys(left),...Object.keys(right)]);
      for(const key of keys) differences(left[key],right[key],path?`${path}.${key}`:key,result);
      return result;
    }
    result.push(path||'$');return result;
  }
  function applyActions(state,actions,draws,browserAfter){
    let drawIndex=0,current=state,events=[];
    const random=()=>{if(drawIndex>=draws.length)throw new Error('shadow_draws_exhausted');return draws[drawIndex++];};
    const applied=[];
    for(const action of actions){
      const result=engine.reduce(current,action,random);
      if(result.rejected) throw new Error('shadow_action_rejected:'+result.reason);
      current=result.state;events.push(...result.events);applied.push(action);
    }
    if(current.turn.phase==='attack_target'){
      const targetSeat=browserAfter?.attackTargetSeat;
      const action={type:A.CHOOSE_ATTACK_TARGET,seat:decisionSeat(current),targetSeat};
      const result=engine.reduce(current,action,random);
      if(result.rejected) throw new Error('shadow_target_rejected:'+result.reason);
      current=result.state;events.push(...result.events);applied.push(action);
    }
    if(current.turn.phase==='turn_done'&&(browserAfter?.phase==='idle'||browserAfter?.roundWinnerHandled)){
      const action={type:A.END_TURN,seat:decisionSeat(current)},result=engine.reduce(current,action,random);
      if(result.rejected) throw new Error('shadow_advance_rejected:'+result.reason);
      current=result.state;events.push(...result.events);applied.push(action);
    }
    return {state:current,events,actions:applied,drawIndex,remaining:draws.length-drawIndex};
  }

  let shadow=null,live=null,hooked=false,originals=new Map();

  function startLive(setup){
    live={setup:copy(setup),state:engine.createState(copy(setup))};
    return getLiveState();
  }
  function stopLive(){const state=getLiveState();live=null;return state;}
  function hasLive(){return !!live;}
  function getLiveState(){return live?copy(live.state):null;}
  function dispatchLiveAction(action,random=root.WDRng?.random){
    if(!live) throw new Error('live_engine_not_started');
    const before=copy(live.state),result=engine.reduce(live.state,copy(action),random);
    if(result.rejected) throw new Error('live_action_rejected:'+result.reason);
    live.state=result.state;
    return {before,state:copy(live.state),events:copy(result.events),actions:[copy(action)]};
  }
  function dispatchLiveMove(name,args,browserState,random=root.WDRng?.random){
    if(!live) throw new Error('live_engine_not_started');
    const before=copy(live.state),move={name,args:copy(args||[])},actions=browserMoveToActions(move,live.state,browserState);
    let events=[];
    for(const action of actions){
      const result=engine.reduce(live.state,action,random);
      if(result.rejected) throw new Error('live_action_rejected:'+result.reason);
      live.state=result.state;events.push(...result.events);
    }
    if(live.state.turn.phase==='attack_target'){
      const targetSeat=engine.baseRules.nextAliveSeat(live.state,live.state.turn.currentSeat);
      const action={type:A.CHOOSE_ATTACK_TARGET,seat:decisionSeat(live.state),targetSeat};
      const result=engine.reduce(live.state,action,random);
      if(result.rejected) throw new Error('live_target_rejected:'+result.reason);
      live.state=result.state;actions.push(action);events.push(...result.events);
    }
    return {before,state:copy(live.state),events:copy(events),actions:copy(actions)};
  }
  function finalizeShadow(){
    if(!shadow?.pending) return null;
    root.WDRng.endAction();
    const trace=root.WDRng.getTrace(),traceEntry=trace?.entries?.at(-1),browserAfter=copy(shadow.snapshot());
    const translated=browserMoveToActions(shadow.pending,shadow.state,shadow.pending.browserBefore);
    const applied=applyActions(shadow.state,translated,traceEntry?.draws||[],browserAfter);
    const browserNormalized=normalizeBrowserState(browserAfter),engineNormalized=normalizeEngineState(applied.state);
    const entry={index:shadow.entries.length,move:copy(shadow.pending),actions:copy(applied.actions),
      draws:(traceEntry?.draws||[]).slice(),events:copy(applied.events),browserState:browserNormalized,
      engineState:engineNormalized,differences:differences(browserNormalized,engineNormalized),
      remainingDraws:applied.remaining};
    if(entry.differences.length||entry.remainingDraws) entry.engineBefore=copy({turn:shadow.state.turn,dice:shadow.state.dice,
      base:shadow.state.base,attack:shadow.state.attack,special:shadow.state.special});
    shadow.state=applied.state;shadow.entries.push(entry);shadow.pending=null;
    return copy(entry);
  }
  function beforeMove(name,args){
    if(!shadow||shadow.pending) return;
    const browserBefore=copy(shadow.snapshot());
    shadow.pending={name,args:copy(args),browserBefore};
    root.WDRng.beginAction({name,args:copy(args)});
  }
  function installHooks(){
    if(hooked) return;
    for(const name of hookNames){
      const original=root[name];
      if(typeof original!=='function') continue;
      originals.set(name,original);
      root[name]=function(...args){beforeMove(name,args);return original.apply(this,args);};
    }
    hooked=true;
  }
  function startShadow(setup,snapshot){
    if(typeof snapshot!=='function') throw new TypeError('snapshot');
    const state=engine.createState(copy(setup));
    shadow={setup:copy(setup),state,snapshot,entries:[],pending:null,
      initialBrowser:normalizeBrowserState(snapshot()),initialEngine:normalizeEngineState(state)};
    root.WDRng.startTrace(shadow.initialBrowser);installHooks();return getShadow();
  }
  function getShadow(){
    if(!shadow) return null;
    return copy({setup:shadow.setup,initialBrowser:shadow.initialBrowser,initialEngine:shadow.initialEngine,
      entries:shadow.entries,state:shadow.state,pending:shadow.pending});
  }
  function stopShadow(){const entry=finalizeShadow(),result=getShadow();shadow=null;return {entry,result};}
  function replay(setup,entries){
    let state=engine.createState(copy(setup));const compared=[];
    for(const entry of entries){
      const applied=applyActions(state,entry.actions,entry.draws,{});state=applied.state;
      const engineState=normalizeEngineState(state),diff=differences(entry.browserState,engineState);
      compared.push({index:entry.index,differences:diff,browserState:entry.browserState,engineState,
        remainingDraws:applied.remaining});
      if(diff.length||applied.remaining) break;
    }
    return {state,compared};
  }

  root.WDEngineAdapter=Object.freeze({moveTypes,browserMoveToActions,reducerEventToBrowserCalls,
    normalizeBrowserState,normalizeEngineState,differences,startShadow,flush:finalizeShadow,
    getShadow,stopShadow,replay,startLive,stopLive,hasLive,getLiveState,dispatchLiveAction,dispatchLiveMove});
})(globalThis);
