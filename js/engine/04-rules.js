// Reine Hilfen und Aktionsnamen fuer die gemeinsame Duell-Engine.
(function(root){
  'use strict';
  const engine=root.WDEngine;
  if(!engine?.definitions || !engine?.validateState)
    throw new Error('Definitionen und Zustand muessen vor den Basisregeln geladen werden');

  const ACTIONS=Object.freeze({
    ROLL_BASE:'roll_base',
    TOGGLE_BASE_DIE:'toggle_base_die',
    LOCK_SELECTED:'lock_selected',
    USE_LUCK_REROLL:'use_luck_reroll',
    USE_LOADED_DICE:'use_loaded_dice',
    USE_SNAKE_EYES:'use_snake_eyes',
    ROLL_INSURANCE:'roll_insurance',
    USE_BLOOD_PRICE:'use_blood_price',
    CHOOSE_ATTACK_TARGET:'choose_attack_target',
    ROLL_ATTACK:'roll_attack',
    RESOLVE_ATTACK:'resolve_attack',
    USE_ATTACK_POWER:'use_attack_power',
    CONTINUE_DOUBLE_TAP:'continue_double_tap',
    USE_BLOOD_RUSH_SELF_HARM:'use_blood_rush_self_harm',
    ROLL_COUNTERATTACK:'roll_counterattack'
  });

  function clone(value){return JSON.parse(JSON.stringify(value));}
  function player(state,seat=state.turn.currentSeat){return state.players.find(entry=>entry.seat===seat);}
  function hasAbility(state,id,seat=state.turn.currentSeat){return player(state,seat)?.abilities.includes(id)===true;}
  function mastery(state,minimum){return state.masteryLevel>=minimum;}
  function nextAliveSeat(state,fromSeat=state.turn.currentSeat){
    const start=state.players.findIndex(entry=>entry.seat===fromSeat);
    for(let offset=1;offset<state.players.length;offset++){
      const candidate=state.players[(start+offset)%state.players.length];
      if(candidate.hp>0) return candidate.seat;
    }
    return null;
  }
  function selectedIndices(state){
    const indices=[];
    state.dice.forEach((die,index)=>{if(die.selected&&!die.locked) indices.push(index);});
    return indices;
  }
  function unlockedIndices(state){
    const indices=[];
    state.dice.forEach((die,index)=>{if(!die.locked) indices.push(index);});
    return indices;
  }
  function baseTotal(state){return state.dice.reduce((sum,die)=>sum+(die.value||0),0);}
  function aliveSeats(state){return state.players.filter(entry=>entry.hp>0).map(entry=>entry.seat);}
  function uniqueUnderdog(state,seat=state.turn.currentSeat){
    const active=player(state,seat);
    if(!active || active.hp<=0) return false;
    if(mastery(state,1) && active.effects.underdogTurnActive) return true;
    const alive=state.players.filter(entry=>entry.hp>0);
    if(alive.length<2) return false;
    return mastery(state,1)
      ? alive.every(entry=>entry.seat===seat || active.hp<=entry.hp)
      : alive.every(entry=>entry.seat===seat || active.hp<entry.hp);
  }
  function snakeEyesGroup(state){
    const byFace=new Map();
    for(const index of state.base.lastRollIndices){
      const die=state.dice[index];
      if(!die || die.value===null || die.locked) continue;
      const indices=byFace.get(die.value)||[];
      indices.push(index);byFace.set(die.value,indices);
    }
    for(let face=1;face<=6;face++){
      const indices=byFace.get(face)||[];
      if(indices.length>=3) return {face,indices};
    }
    return null;
  }
  function luckCandidate(state){
    const base=state.base;
    const repeated=mastery(state,1) && base.luckRerollUses>0 && !base.luckRerollSecondUsed &&
      base.luckRerollIndex!==null && !state.dice[base.luckRerollIndex].locked;
    if(repeated) return {index:base.luckRerollIndex,repeated:true};
    const index=state.dice.findIndex(die=>!die.locked&&die.value===1);
    return index<0?null:{index,repeated:false};
  }
  function makeRandom(state,rng){
    const external=typeof rng==='function'?rng:
      typeof rng?.random==='function'?()=>rng.random():
      typeof rng?.nextFloat==='function'?()=>rng.nextFloat():
      typeof rng?.next==='function'?()=>rng.next():null;
    return function random(){
      let value;
      if(external){
        value=external();
      }else if(state.rng.algorithm==='mulberry32'){
        let generatorState=(state.rng.state+0x6D2B79F5)>>>0;
        state.rng.state=generatorState;
        let mixed=generatorState;
        mixed=Math.imul(mixed^(mixed>>>15),mixed|1);
        mixed^=mixed+Math.imul(mixed^(mixed>>>7),mixed|61);
        value=((mixed^(mixed>>>14))>>>0)/4294967296;
      }else{
        throw new TypeError('Ein Zufallsgeber ist fuer diese Aktion erforderlich');
      }
      if(typeof value!=='number' || !Number.isFinite(value) || value<0 || value>=1)
        throw new RangeError('Der Zufallsgeber muss Zahlen im Intervall [0, 1) liefern');
      state.rng.drawIndex++;
      return value;
    };
  }
  function rollDie(state,random,seat=state.turn.currentSeat){
    if(hasAbility(state,7,seat)){
      const sixChance=(1/6)+0.06+(mastery(state,1)?0.01:0)+(mastery(state,2)?0.01:0);
      const value=random();
      if(value<sixChance) return 6;
      return Math.min(5,Math.floor(((value-sixChance)/(1-sixChance))*5)+1);
    }
    return Math.floor(random()*6)+1;
  }

  engine.actions=ACTIONS;
  engine.baseRules=Object.freeze({clone,player,hasAbility,mastery,nextAliveSeat,aliveSeats,uniqueUnderdog,
    selectedIndices,unlockedIndices,baseTotal,snakeEyesGroup,luckCandidate,makeRandom,rollDie});
})(globalThis);
