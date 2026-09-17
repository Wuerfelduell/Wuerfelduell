// DOM-freier Reducer fuer Basis- und Angriffsphase. Automatische Folgen
// enden an der naechsten echten Spielerentscheidung.
(function(root){
  'use strict';
  const engine=root.WDEngine;
  if(!engine?.actions || !engine?.baseRules)
    throw new Error('Basisregeln muessen vor dem Reducer geladen werden');
  const A=engine.actions,R=engine.baseRules,D=engine.definitions;

  function reject(state,reason){return {state,events:[],rejected:true,reason};}
  function attackSnakeEyesGroup(state){
    const byFace=new Map();
    for(const index of state.attack.lastRollIndices){
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
  function actionReason(state,action){
    if(!action || typeof action!=='object' || Array.isArray(action)) return 'Aktion muss ein Objekt sein';
    if(typeof action.type!=='string') return 'Aktionstyp fehlt';
    if(!Object.values(A).includes(action.type)) return 'Unbekannter Aktionstyp';
    const owner=state.turn.decision?.seat??state.turn.currentSeat;
    if(!Number.isInteger(action.seat) || action.seat!==owner) return 'Falscher Aktionsinhaber';
    const phase=state.turn.phase;
    if(action.type===A.ROLL_BASE && !['idle','base_ready'].includes(phase)) return 'Basiswurf ist in dieser Phase nicht erlaubt';
    if(action.type===A.TOGGLE_BASE_DIE){
      if(phase!=='base_select') return 'Wuerfelauswahl ist in dieser Phase nicht erlaubt';
      if(!Number.isInteger(action.index) || action.index<0 || action.index>=state.dice.length) return 'Ungueltiger Wuerfelindex';
      const die=state.dice[action.index];
      if(die.locked || die.value===null) return 'Dieser Wuerfel kann nicht ausgewaehlt werden';
    }
    if(action.type===A.LOCK_SELECTED){
      if(phase!=='base_select') return 'Locken ist in dieser Phase nicht erlaubt';
      if(!R.selectedIndices(state).length) return 'Kein Wuerfel ist ausgewaehlt';
    }
    if(action.type===A.USE_LUCK_REROLL){
      if(phase!=='base_select') return 'Glueckswurf ist in dieser Phase nicht erlaubt';
      if(!R.hasAbility(state,3)) return 'Glueckswurf ist nicht vorhanden';
      const candidate=R.luckCandidate(state),maximum=R.mastery(state,2)?2:1;
      if(!candidate || (!candidate.repeated&&state.base.luckRerollUses>=maximum)) return 'Glueckswurf ist nicht verfuegbar';
    }
    if(action.type===A.USE_LOADED_DICE){
      if(phase!=='base_select') return 'Loaded Dice ist in dieser Phase nicht erlaubt';
      if(!R.hasAbility(state,18)) return 'Loaded Dice ist nicht vorhanden';
      const maximum=R.mastery(state,1)?2:1,selected=R.selectedIndices(state);
      if(state.base.loadedDiceUses>=maximum) return 'Loaded Dice ist bereits verbraucht';
      if(selected.length!==1 || state.dice[selected[0]].value===5) return 'Genau ein geeigneter Wuerfel muss ausgewaehlt sein';
      const cost=R.mastery(state,2)&&state.base.loadedDiceUses===1?1:2;
      if(R.player(state).hp<=cost) return 'Nicht genug HP fuer Loaded Dice';
    }
    if(action.type===A.USE_SNAKE_EYES){
      const attackUse=phase==='attack_after_roll'&&R.mastery(state,1);
      if(phase!=='base_select'&&!attackUse) return 'Snake Eyes ist in dieser Phase nicht erlaubt';
      if(!R.hasAbility(state,20)) return 'Snake Eyes ist nicht vorhanden';
      if(!(attackUse?attackSnakeEyesGroup(state):R.snakeEyesGroup(state))) return 'Kein Snake-Eyes-Drilling im letzten Wurf';
    }
    if(action.type===A.ROLL_INSURANCE){
      if(phase!=='insurance' || !state.special.insurance) return 'Insurance ist in dieser Phase nicht erlaubt';
      if(!R.hasAbility(state,19)) return 'Insurance ist nicht vorhanden';
    }
    if(action.type===A.USE_BLOOD_PRICE){
      const post=phase==='attack_after_roll'&&R.mastery(state,2)&&!state.attack.bloodPriceWasPreActivatedThisRoll;
      if(!['attack_ready','attack_continue'].includes(phase)&&!post) return 'Blutpreis ist in dieser Phase nicht erlaubt';
      if(!R.hasAbility(state,11)) return 'Blutpreis ist nicht vorhanden';
      if(state.attack.bloodPriceNeighbors.length) return 'Blutpreis ist fuer diesen Wurf bereits aktiv';
      if(R.player(state).hp<=(post?5:3)) return 'Nicht genug HP fuer Blutpreis';
    }
    if(action.type===A.CHOOSE_ATTACK_TARGET){
      if(phase!=='attack_target') return 'Zielwahl ist in dieser Phase nicht erlaubt';
      if(!Number.isInteger(action.targetSeat) || action.targetSeat===state.turn.currentSeat ||
        !R.player(state,action.targetSeat) || R.player(state,action.targetSeat).hp<=0) return 'Ungueltiges Angriffsziel';
    }
    if(action.type===A.ROLL_ATTACK){
      if(!['attack_ready','attack_continue'].includes(phase)) return 'Angriffswurf ist in dieser Phase nicht erlaubt';
      if(!R.unlockedIndices(state).length) return 'Keine Angriffswuerfel verfuegbar';
    }
    if(action.type===A.RESOLVE_ATTACK && phase!=='attack_after_roll') return 'Angriff kann in dieser Phase nicht ausgewertet werden';
    if(action.type===A.USE_ATTACK_POWER){
      const maximum=R.mastery(state,1)?2:1;
      if(phase!=='attack_after_roll' || !R.hasAbility(state,4)) return 'Zweite Chance ist in dieser Phase nicht erlaubt';
      if(state.attack.powerUses>=maximum || !R.unlockedIndices(state).length) return 'Zweite Chance ist nicht verfuegbar';
    }
    if(action.type===A.CONTINUE_DOUBLE_TAP){
      if(phase!=='attack_after_roll' || !R.hasAbility(state,24) || state.attack.hits!==2 ||
        state.attack.currentRollNewHits<=0 || !R.unlockedIndices(state).length) return 'Double Tap kann nicht fortgesetzt werden';
    }
    if(action.type===A.USE_BLOOD_RUSH_SELF_HARM){
      if(phase!=='attack_after_roll' || !R.hasAbility(state,23) || !R.mastery(state,2) || state.attack.bloodRushActive)
        return 'Self Harm ist nicht verfuegbar';
      if(R.player(state).hp<=1) return 'Nicht genug HP fuer Self Harm';
    }
    if(action.type===A.ROLL_COUNTERATTACK){
      if(phase!=='counterattack' || !state.counter.context) return 'Counterattack ist in dieser Phase nicht erlaubt';
      if(!state.counter.dice.some(die=>!die.locked)) return 'Keine Konterwuerfel verfuegbar';
    }
    if(action.type===A.ROLL_GAMBLING && !['gamble_attack','gamble_retry'].includes(phase))
      return 'Gambling Man ist in dieser Phase nicht erlaubt';
    if(action.type===A.ACCEPT_GAMBLING_RETRY && phase!=='gamble_retry_offer')
      return 'Gambling-Retry ist in dieser Phase nicht erlaubt';
    if(action.type===A.DECLINE_GAMBLING_RETRY && phase!=='gamble_retry_offer')
      return 'Gambling-Retry ist in dieser Phase nicht erlaubt';
    if(action.type===A.ROLL_PERFECT25 && phase!=='perfect25')
      return 'Perfect 25 ist in dieser Phase nicht erlaubt';
    if(action.type===A.ROLL_PERFECT25_D4 && phase!=='perfect25_d4')
      return 'Perfect-25-D4 ist in dieser Phase nicht erlaubt';
    if(action.type===A.ROLL_HIGH_STAKES && phase!=='high_stakes')
      return 'High Stakes ist in dieser Phase nicht erlaubt';
    if(action.type===A.SKIP_HIGH_STAKES && phase!=='high_stakes')
      return 'High Stakes kann in dieser Phase nicht uebersprungen werden';
    if(action.type===A.CHOOSE_ABILITY){
      if(phase!=='draft_pending' || !state.draft.active) return 'Faehigkeitsdraft ist in dieser Phase nicht erlaubt';
      if(!Number.isInteger(action.abilityId) || !state.draft.active.choices.includes(action.abilityId))
        return 'Faehigkeit gehoert nicht zum aktuellen Auswahlpaar';
    }
    if(action.type===A.END_TURN && phase!=='turn_done') return 'Zugende ist in dieser Phase nicht erlaubt';
    if(action.type===A.PREPARE_ROUND &&
      (phase!=='round_preparation' || state.turn.decision?.kind!=='prepare_round'))
      return 'Rundenvorbereitung ist in dieser Phase nicht erlaubt';
    if(action.type===A.CHOOSE_START_ABILITIES){
      if(phase!=='round_preparation' || state.turn.decision?.kind!=='choose_start_abilities')
        return 'Startfaehigkeiten koennen in dieser Phase nicht gewaehlt werden';
      const entry=state.round.preparation.find(item=>item.seat===action.seat);
      if(!entry || entry.ready || !Array.isArray(action.abilities) || action.abilities.length!==entry.freeChoices ||
        new Set(action.abilities).size!==action.abilities.length ||
        action.abilities.some(id=>!D.CHOOSABLE_ABILITY_IDS.includes(id) || entry.abilities.includes(id)))
        return 'Ungueltige freie Startfaehigkeiten';
    }
    if(action.type===A.START_ROUND &&
      (phase!=='round_preparation' || state.turn.decision?.kind!=='start_round' ||
        state.round.preparation.length!==state.players.length || state.round.preparation.some(entry=>!entry.ready)))
      return 'Rundenstart ist noch nicht bereit';
    return null;
  }

  function reduce(state,action,rng){
    const validation=engine.validateState(state);
    if(!validation.valid) return reject(state,'Ungueltiger Eingangszustand');
    const reason=actionReason(state,action);
    if(reason) return reject(state,reason);

    const next=R.clone(state),events=[];
    next.sequence.action++;
    const emit=(type,data={})=>{
      const id='event-'+(++next.sequence.event);
      events.push({id,type,...data});
    };
    const requireRandom=()=>R.makeRandom(next,rng);
    const shuffledAbilityPool=(excluded=[],random=requireRandom())=>{
      const blocked=new Set(excluded),pool=D.CHOOSABLE_ABILITY_IDS.filter(id=>!blocked.has(id));
      for(let i=pool.length-1;i>0;i--){
        const j=Math.floor(random()*(i+1));
        [pool[i],pool[j]]=[pool[j],pool[i]];
      }
      return pool;
    };
    const randomAbilities=(count,excluded=[],random=requireRandom())=>shuffledAbilityPool(excluded,random).slice(0,count);
    const decision=(kind,phase=next.turn.phase,seat=next.turn.currentSeat)=>{
      next.turn.phase=phase;next.turn.decision={kind,seat};
      emit('DecisionRequired',{seat,kind});
    };
    const freshDice=()=>Array.from({length:D.DICE_COUNT},()=>({value:null,locked:false,selected:false}));
    const markSelfDamage=(seat,amount,voluntary=false)=>{
      if(amount<=0) return;
      const active=R.player(next,seat);
      if(R.mastery(next,1) && R.hasAbility(next,23,seat)) active.effects.selfDamageSinceLastOwnTurn=true;
      if(voluntary) active.effects.voluntaryHpPaidThisTurn=true;
    };
    const enqueueDraft=(seat,trigger)=>{
      const rules=D.LOCAL_MODES[next.modeId],active=R.player(next,seat),slot=rules.bonusSlot;
      if(!active || active.hp<=0 || !slot || active.bonusAbilityUnlocked || active.abilities.length!==slot-1) return false;
      if(trigger==='kill' && !rules.bonusOnKill) return false;
      active.bonusAbilityUnlocked=true;
      if(!next.draft.queue.some(entry=>entry.seat===seat)) next.draft.queue.push({seat,slot,trigger});
      return true;
    };
    const applyDamageToSeat=(targetSeat,amount,sourceSeat,source,opponent=false)=>{
      const target=R.player(next,targetSeat);
      if(!target || amount<=0) return {before:target?.hp||0,after:target?.hp||0,lost:0,lastStand:false};
      const before=target.hp;
      let after=Math.max(0,before-amount),lastStand=false;
      if(after<=0 && R.hasAbility(next,14,targetSeat) && !target.effects.lastStandUsed){
        after=R.mastery(next,1)?6:1;
        target.effects.lastStandUsed=true;lastStand=true;
        if(R.mastery(next,2)) target.effects.lastStandCooldown=3;
      }
      target.hp=after;
      const lost=Math.max(0,before-after);
      if(opponent && lost>0) target.effects.damageSinceLastOwnTurn=true;
      if(lost>0) emit('DamageApplied',{sourceSeat,targetSeat,amount:lost,source});
      if(lastStand) emit('LastStandTriggered',{seat:targetSeat,hp:target.hp});
      const threshold=D.LOCAL_MODES[next.modeId].bonusThreshold;
      if(target.hp>0 && threshold!==null && target.hp<=threshold) enqueueDraft(targetSeat,'hp');
      return {before,after:target.hp,lost,lastStand};
    };
    const applyHeal=(seat,amount,source)=>{
      const active=R.player(next,seat);
      let wanted=Math.max(0,Number(amount)||0);
      if(!active || wanted<=0) return 0;
      if(R.hasAbility(next,22,seat)&&R.mastery(next,2)){
        active.effects.healEffectCount++;
        if(active.effects.healEffectCount%2===0) wanted++;
      }
      const healed=Math.max(0,Math.min(active.maxHp,active.hp+wanted)-active.hp);
      active.hp+=healed;
      if(healed>0) emit('Healed',{seat,amount:healed,source});
      return healed;
    };
    const healTwelveBase=(indices,source)=>{
      if(!R.hasAbility(next,22)) return;
      const sixes=indices.filter(index=>next.dice[index].value===6).length;
      if(sixes<2) return;
      const wanted=R.mastery(next,1)&&sixes>=3?2:1;
      applyHeal(next.turn.currentSeat,wanted,source);
    };
    const healTwelveCounter=(seat,values)=>{
      if(!R.hasAbility(next,22,seat)) return;
      const sixes=values.filter(value=>value===6).length;
      if(sixes<2) return;
      applyHeal(seat,R.mastery(next,1)&&sixes>=3?2:1,'twelve_counter');
    };
    const setTurnDone=reasonValue=>{
      next.turn.phase='turn_done';next.turn.decision={kind:'end_turn',seat:next.turn.currentSeat};
      next.dice.forEach(die=>{die.selected=false;});
      emit('TurnEnded',{seat:next.turn.currentSeat,reason:reasonValue});
      emit('DecisionRequired',{seat:next.turn.currentSeat,kind:'end_turn'});
    };
    const openQueuedDraft=()=>{
      if(!next.draft.queue.length) return false;
      const queued=next.draft.queue.shift(),active=R.player(next,queued.seat);
      const choices=shuffledAbilityPool(active.abilities).slice(0,2);
      next.draft.active={...queued,choices};
      emit('AbilityDraftOpened',{seat:queued.seat,slot:queued.slot,trigger:queued.trigger,choices:choices.slice()});
      decision('choose_ability','draft_pending',queued.seat);
      return true;
    };
    const blockDraft=continuation=>{
      if(!next.draft.queue.length) return false;
      next.draft.continuation=continuation;
      return openQueuedDraft();
    };
    const markEliminated=seat=>{
      if(next.round.eliminationOrder.includes(seat)) return;
      next.round.eliminationOrder.push(seat);
      if(next.round.lastPlaceSeat===null) next.round.lastPlaceSeat=seat;
      next.draft.queue=next.draft.queue.filter(entry=>entry.seat!==seat);
      emit('PlayerEliminated',{seat,placeFromLast:next.round.eliminationOrder.length});
    };
    const stackingDamageBonus=(seat=next.turn.currentSeat,bloodRush=next.attack.bloodRushActive)=>{
      const active=R.player(next,seat);
      let bonus=0;
      if(R.hasAbility(next,9,seat)&&active.hp<=(R.mastery(next,1)?15:10)) bonus+=2;
      if(R.hasAbility(next,10,seat)) bonus+=Math.min(Math.max(active.effects.momentumStreak-1,0),R.mastery(next,2)?3:2);
      if(R.hasAbility(next,23,seat)&&bloodRush) bonus++;
      if(R.hasAbility(next,25,seat)&&R.uniqueUnderdog(next,seat)) bonus++;
      return bonus;
    };
    const normalAttackHit=value=>value===next.attack.face ||
      (next.attack.face===1&&R.hasAbility(next,1)&&value===2);
    const damagePerAttackHit=()=>((next.attack.face===1&&R.hasAbility(next,1))?3:next.attack.face)+stackingDamageBonus();
    const precisionDamage=()=>Math.max(1,next.attack.face-1)+stackingDamageBonus();
    const activateBloodRushMid=()=>{
      const active=R.player(next);
      if(next.attack.bloodRushActive || !R.hasAbility(next,23) ||
        !(active.effects.bloodRushPrimed||active.effects.voluntaryHpPaidThisTurn)) return false;
      next.attack.bloodRushActive=true;
      active.effects.bloodRushPrimed=false;active.effects.voluntaryHpPaidThisTurn=false;
      if(next.attack.hits>0) next.attack.damage+=next.attack.hits;
      emit('AbilityActivated',{seat:active.seat,abilityId:23});
      return true;
    };
    const retireWildcard=()=>{
      if(!(R.mastery(next,1)&&next.attack.rollCount<2)) next.attack.wildcardFace=null;
    };
    const startAttackAfterTarget=()=>{
      const active=R.player(next);
      next.attack.hits=0;next.attack.damage=0;next.attack.firstRoll=true;next.attack.currentRollNewHits=0;
      next.attack.rollCount=0;next.attack.masteryRollCount=0;next.attack.normalHits=0;next.attack.exactFaceHits=0;
      next.attack.wildcardHits=0;next.attack.lastRollIndices=[];next.attack.powerUsed=false;next.attack.powerUses=0;
      next.attack.precisionUses=0;next.attack.bloodPriceNeighbors=[];next.attack.bloodPricePaidThisRoll=0;
      next.attack.bloodPriceWasPreActivatedThisRoll=false;next.attack.doubleTapApplied=false;
      next.attack.wildcardFace=null;next.attack.wildcardSecondRollArmed=false;next.attack.wildcardTriggered=false;
      next.attack.masteryL2BonusesApplied=false;next.dice=freshDice();next.attack.bloodRushActive=false;
      if(R.hasAbility(next,23)&&(active.effects.bloodRushPrimed||active.effects.voluntaryHpPaidThisTurn)){
        next.attack.bloodRushActive=true;active.effects.bloodRushPrimed=false;active.effects.voluntaryHpPaidThisTurn=false;
      }
      if(R.hasAbility(next,17)) next.attack.wildcardFace=R.rollDie(next,requireRandom());
      next.attack.momentumBonus=0;
      if(R.hasAbility(next,10)){
        active.effects.momentumStreak++;
        next.attack.momentumBonus=Math.min(Math.max(active.effects.momentumStreak-1,0),R.mastery(next,2)?3:2);
      }
      emit('AttackReadied',{seat:next.turn.currentSeat,targetSeat:next.attack.targetSeat,face:next.attack.face,
        total:next.attack.baseTotal,source:next.attack.source,wildcardFace:next.attack.wildcardFace});
      decision('roll_attack','attack_ready');
    };
    const prepareAttack=(face,total,source)=>{
      const targets=next.players.filter(entry=>entry.hp>0&&entry.seat!==next.turn.currentSeat).map(entry=>entry.seat);
      next.attack.face=face;next.attack.targetSeat=null;next.attack.baseTotal=total;next.attack.source=source;
      if(!targets.length){setTurnDone('no_target');return;}
      if(targets.length>1){
        emit('AttackTargetRequired',{seat:next.turn.currentSeat,targetSeats:targets});
        decision('choose_attack_target','attack_target');return;
      }
      next.attack.targetSeat=targets[0];startAttackAfterTarget();
    };
    const afterSelfDamage=(total,afterMode)=>{
      if(R.player(next).hp<=0){markEliminated(next.turn.currentSeat);setTurnDone('eliminated');return;}
      if(afterMode==='advance24') prepareAttack(1,total,'advance');
      else setTurnDone('base_self_damage');
    };
    const damageOrInsurance=(total,rawDamage,afterMode)=>{
      next.attack.baseTotal=total;
      next.attack.source=afterMode==='advance24'?'advance':'normal';
      if(R.hasAbility(next,19)){
        next.special.insurance={total,rawDamage,afterMode};decision('insurance','insurance');
      }else{
        const active=R.player(next),result=applyDamageToSeat(active.seat,rawDamage,active.seat,'base');
        markSelfDamage(active.seat,result.lost,false);
        if(!blockDraft('finish_base')) afterSelfDamage(total,afterMode);
      }
    };
    const resolveBase=()=>{
      const total=R.baseTotal(next),advance=R.hasAbility(next,5);
      emit('BaseResolved',{seat:next.turn.currentSeat,total});
      if(total===24 && advance && R.mastery(next,1)){damageOrInsurance(total,1,'advance24');return;}
      if(total<25){
        const active=R.player(next);
        if(R.hasAbility(next,10)) active.effects.momentumStreak=R.mastery(next,1)?Math.max(0,active.effects.momentumStreak-1):0;
        next.attack.momentumBonus=0;damageOrInsurance(total,25-total,'finish');return;
      }
      if(total===25 && !advance && R.hasAbility(next,15)){
        next.special.perfect25.baseTotal=total;decision('perfect25','perfect25');return;
      }
      const threshold=advance?25:26;
      if(total<threshold){setTurnDone('exact_25');return;}
      if(R.hasAbility(next,12) && total>25){next.special.gambling.baseTotal=total;decision('gambling','gamble_attack');return;}
      prepareAttack(advance?total-24:total-25,total,advance?'advance':'normal');
    };
    const recordAttackHits=(indices,bloodNeighbors)=>{
      let bloodHits=0;
      for(const index of indices){
        const die=next.dice[index],isNormal=normalAttackHit(die.value),isBlood=bloodNeighbors.includes(die.value);
        const isWildcard=next.attack.wildcardFace!==null &&
          (next.attack.rollCount===1||(next.attack.rollCount===2&&R.mastery(next,1))) && die.value===next.attack.wildcardFace;
        if(!isNormal&&!isBlood&&!isWildcard) continue;
        die.locked=true;next.attack.hits++;next.attack.currentRollNewHits++;next.attack.damage+=damagePerAttackHit();
        if(isNormal){next.attack.normalHits++;if(die.value===next.attack.face) next.attack.exactFaceHits++;}
        if(isWildcard){next.attack.wildcardTriggered=true;if(!isNormal) next.attack.wildcardHits++;}
        if(isBlood&&!isNormal&&!isWildcard) bloodHits++;
      }
      return bloodHits;
    };
    const rollAttack=()=>{
      const random=requireRandom(),indices=R.unlockedIndices(next),bloodNeighbors=next.attack.bloodPriceNeighbors.slice();
      next.attack.bloodPriceWasPreActivatedThisRoll=bloodNeighbors.length>0;
      next.attack.rollCount++;next.attack.masteryRollCount++;next.attack.lastRollIndices=indices.slice();
      for(const index of indices){const value=R.rollDie(next,random);next.dice[index]={value,locked:false,selected:false};}
      if(next.attack.firstRoll&&next.attack.source==='advance'&&R.mastery(next,2)&&
        !indices.some(index=>normalAttackHit(next.dice[index].value)||bloodNeighbors.includes(next.dice[index].value)||
          (next.attack.wildcardFace!==null&&next.dice[index].value===next.attack.wildcardFace))&&indices.length)
        next.dice[indices[0]].value=next.attack.face;
      next.attack.currentRollNewHits=0;
      const bloodHits=recordAttackHits(indices,bloodNeighbors);
      if(bloodNeighbors.length&&next.attack.currentRollNewHits===0&&next.attack.bloodPricePaidThisRoll>0&&R.mastery(next,1)){
        const refund=Math.min(2,next.attack.bloodPricePaidThisRoll),active=R.player(next);
        active.hp+=refund;
        emit('Healed',{seat:active.seat,amount:refund,source:'blood_pact'});
      }
      next.attack.bloodPricePaidThisRoll=0;next.attack.bloodPriceNeighbors=[];
      emit('AttackRolled',{seat:next.turn.currentSeat,kind:'main',indices,values:indices.map(index=>next.dice[index].value),
        rollCount:next.attack.rollCount});
      emit('HitsResolved',{seat:next.turn.currentSeat,kind:'main',newHits:next.attack.currentRollNewHits,
        totalHits:next.attack.hits,damage:next.attack.damage,bloodHits});
      decision('resolve_attack','attack_after_roll');
    };
    const useAttackPower=()=>{
      const random=requireRandom(),indices=R.unlockedIndices(next),values=[];
      next.attack.powerUses++;next.attack.masteryRollCount++;
      next.attack.powerUsed=next.attack.powerUses>=(R.mastery(next,1)?2:1);
      for(const index of indices){const value=R.rollDie(next,random);next.dice[index]={value,locked:false,selected:false};values.push(value);}
      const before=next.attack.currentRollNewHits;recordAttackHits(indices,[]);
      emit('AttackRolled',{seat:next.turn.currentSeat,kind:'second_chance',indices,values});
      emit('HitsResolved',{seat:next.turn.currentSeat,kind:'second_chance',newHits:next.attack.currentRollNewHits-before,
        totalHits:next.attack.hits,damage:next.attack.damage});
      decision('resolve_attack','attack_after_roll');
    };
    const useAttackSnakeEyes=()=>{
      const random=requireRandom(),group=attackSnakeEyesGroup(next),values=[];
      for(const index of group.indices){const value=R.rollDie(next,random);next.dice[index]={value,locked:false,selected:false};values.push(value);}
      let bonusHits=0;
      for(const index of group.indices){
        const die=next.dice[index],isNormal=normalAttackHit(die.value);
        const isWildcard=next.attack.wildcardFace!==null&&
          (next.attack.rollCount===1||(next.attack.rollCount===2&&R.mastery(next,1)))&&die.value===next.attack.wildcardFace;
        if(isNormal||isWildcard){die.locked=true;next.attack.hits++;bonusHits++;next.attack.damage+=damagePerAttackHit();}
      }
      next.attack.currentRollNewHits+=bonusHits;R.player(next).effects.snakeEyesUsesThisTurn++;
      emit('AttackRolled',{seat:next.turn.currentSeat,kind:'snake_bite',indices:group.indices.slice(),values});
      emit('HitsResolved',{seat:next.turn.currentSeat,kind:'snake_bite',newHits:bonusHits,totalHits:next.attack.hits,
        damage:next.attack.damage});decision('resolve_attack','attack_after_roll');
    };
    const applyAttackBonuses=()=>{
      if(R.hasAbility(next,24)&&!next.attack.doubleTapApplied){
        if(next.attack.hits===2){next.attack.doubleTapApplied=true;next.attack.damage+=4;}
        else if(next.attack.hits===1&&R.mastery(next,1)){
          next.attack.doubleTapApplied=true;next.attack.damage+=R.mastery(next,2)?3:2;
        }
      }
      if(next.attack.masteryL2BonusesApplied) return;
      next.attack.masteryL2BonusesApplied=true;
      const active=R.player(next);
      if(R.hasAbility(next,4)&&R.mastery(next,2)&&next.attack.hits>0) next.attack.damage+=Math.min(5,next.attack.masteryRollCount);
      if(R.hasAbility(next,8)&&R.mastery(next,2)&&next.attack.exactFaceHits>0) next.attack.damage++;
      if(R.hasAbility(next,9)&&R.mastery(next,2)&&active.hp<=5&&active.hp>0) next.attack.damage+=6-active.hp;
      if(R.hasAbility(next,20)&&R.mastery(next,2)) next.attack.damage+=active.effects.snakeEyesUsesThisTurn;
      if(R.hasAbility(next,25)&&R.mastery(next,2)&&R.uniqueUnderdog(next)&&next.attack.hits>0)
        next.attack.damage+=Math.max(0,Math.floor(next.attack.hits*1.5)-next.attack.hits);
      if(R.hasAbility(next,17)&&R.mastery(next,2)&&!next.attack.wildcardTriggered&&next.attack.hits>0)
        next.attack.damage+=next.attack.hits*2;
    };
    const ricochetTarget=(fromSeat,snapshot,excluded=[])=>{
      const allowed=new Set(snapshot),blocked=new Set(excluded),start=next.players.findIndex(entry=>entry.seat===fromSeat);
      for(let offset=1;offset<=next.players.length;offset++){
        const candidate=next.players[(start+offset)%next.players.length].seat;
        if(candidate!==next.turn.currentSeat&&candidate!==fromSeat&&!blocked.has(candidate)&&allowed.has(candidate)) return candidate;
      }
      return null;
    };
    const triggerToxicBomb=deadSeat=>{
      const dead=R.player(next,deadSeat),sourceSeat=dead?.effects.poisonSourceSeat;
      if(!dead || dead.effects.poisonTurns<=0 || sourceSeat===null || !R.player(next,sourceSeat) ||
        !R.hasAbility(next,1,sourceSeat) || !R.mastery(next,2)) return 0;
      dead.effects.poisonTurns=0;dead.effects.poisonSourceSeat=null;
      const deadIndex=next.players.findIndex(entry=>entry.seat===deadSeat);
      const adjacent=[next.players[(deadIndex-1+next.players.length)%next.players.length].seat,
        next.players[(deadIndex+1)%next.players.length].seat];
      let total=0;
      for(const seat of new Set(adjacent)){
        const target=R.player(next,seat);
        if(!target || target.hp<=0 || seat===sourceSeat) continue;
        const result=applyDamageToSeat(seat,3,sourceSeat,'toxic_bomb',true);total+=result.lost;
        if(result.lost>0) emit('ToxicBombApplied',{sourceSeat,targetSeat:seat,amount:result.lost,deadSeat});
        if(result.before>0&&target.hp<=0){markEliminated(seat);enqueueDraft(sourceSeat,'kill');}
      }
      return total;
    };
    const consumeCounterBloodRush=seat=>{
      const active=R.player(next,seat);
      if(!active || !R.hasAbility(next,23,seat)) return false;
      const enabled=!!(active.effects.damageSinceLastOwnTurn||active.effects.bloodRushPrimed||active.effects.voluntaryHpPaidThisTurn);
      if(enabled){active.effects.damageSinceLastOwnTurn=false;active.effects.bloodRushPrimed=false;active.effects.voluntaryHpPaidThisTurn=false;}
      return enabled;
    };
    const startCounter=context=>{
      const defender=R.player(next,context.defenderSeat),attacker=R.player(next,context.attackerSeat);
      if(!defender||!attacker||defender.hp<=0||attacker.hp<=0||!R.hasAbility(next,21,context.defenderSeat)){
        setTurnDone('attack_complete');return;
      }
      context.bloodRushActive=consumeCounterBloodRush(context.defenderSeat);
      next.counter.context=context;next.counter.pending=null;next.counter.dice=freshDice();next.counter.hits=0;next.counter.firstRoll=true;
      emit('CounterattackStarted',{defenderSeat:context.defenderSeat,attackerSeat:context.attackerSeat});
      decision('counterattack','counterattack',context.defenderSeat);
    };
    const finalizeAttackDamage=()=>{
      const attackerSeat=next.turn.currentSeat,targetSeat=next.attack.targetSeat,target=R.player(next,targetSeat);
      const rawDamage=next.attack.damage,aliveSnapshot=R.aliveSeats(next),targetBefore=target.hp;
      const mainResult=applyDamageToSeat(targetSeat,rawDamage,attackerSeat,'attack',true);
      let totalActual=mainResult.lost;
      const mainKilled=target.hp<=0;
      if(!mainKilled&&next.attack.face===1&&next.attack.hits>0&&R.hasAbility(next,1)&&R.mastery(next,1)){
        target.effects.poisonTurns=2;target.effects.poisonSourceSeat=attackerSeat;
        emit('PoisonApplied',{sourceSeat:attackerSeat,targetSeat,turns:2});
      }
      if(mainKilled){triggerToxicBomb(targetSeat);markEliminated(targetSeat);enqueueDraft(attackerSeat,'kill');}
      let firstRicochet=null;
      if(R.hasAbility(next,16)&&next.attack.hits>0&&aliveSnapshot.length>=3){
        firstRicochet=ricochetTarget(targetSeat,aliveSnapshot);
        if(firstRicochet!==null&&R.player(next,firstRicochet).hp>0){
          const amount=next.attack.hits*(R.mastery(next,1)?2:1);
          const result=applyDamageToSeat(firstRicochet,amount,attackerSeat,'ricochet',true);totalActual+=result.lost;
          emit('RicochetApplied',{sourceSeat:attackerSeat,targetSeat:firstRicochet,amount:result.lost,chain:1});
          if(R.player(next,firstRicochet).hp<=0){triggerToxicBomb(firstRicochet);markEliminated(firstRicochet);enqueueDraft(attackerSeat,'kill');}
        }
      }
      if(R.hasAbility(next,16)&&R.mastery(next,2)&&next.attack.hits>0&&aliveSnapshot.length>=4&&firstRicochet!==null){
        const second=ricochetTarget(firstRicochet,aliveSnapshot,[targetSeat,firstRicochet]);
        if(second!==null&&R.player(next,second).hp>0){
          const result=applyDamageToSeat(second,next.attack.hits,attackerSeat,'ricochet_chain',true);totalActual+=result.lost;
          emit('RicochetApplied',{sourceSeat:attackerSeat,targetSeat:second,amount:result.lost,chain:2});
          if(R.player(next,second).hp<=0){triggerToxicBomb(second);markEliminated(second);enqueueDraft(attackerSeat,'kill');}
        }
      }
      if(R.hasAbility(next,2)&&totalActual>0) applyHeal(attackerSeat,Math.floor(totalActual/2)+(R.mastery(next,2)?3:0),'lifesteal');
      const threshold=R.hasAbility(next,21,targetSeat)&&R.mastery(next,1)?4:5;
      const counterEligible=rawDamage>=threshold&&target.hp>0&&R.player(next,attackerSeat).hp>0&&R.hasAbility(next,21,targetSeat);
      if(counterEligible){
        const context={defenderSeat:targetSeat,attackerSeat,restoreHp:targetBefore,incomingDamage:mainResult.lost,
          lastStandTriggered:mainResult.lastStand,bloodRushActive:false};
        if(next.draft.queue.length){next.counter.pending=context;blockDraft('start_counter');}else startCounter(context);
        return;
      }
      if(blockDraft('finish_attack')) return;
      setTurnDone('attack_complete');
    };
    const dealAttackDamage=()=>{
      applyAttackBonuses();
      if(R.hasAbility(next,13)&&!next.special.highStakes.decisionMade&&next.attack.damage>0){
        next.special.highStakes.rawDamage=next.attack.damage;decision('high_stakes','high_stakes');return;
      }
      finalizeAttackDamage();
    };
    const resolveAttackRoll=()=>{
      if(R.hasAbility(next,24)&&next.attack.hits===2&&next.attack.currentRollNewHits>0){
        next.attack.firstRoll=false;retireWildcard();dealAttackDamage();return;
      }
      if(next.attack.currentRollNewHits===0){
        const maximum=R.mastery(next,1)?3:2;
        if(R.hasAbility(next,8)&&next.attack.precisionUses<maximum){
          const index=next.dice.findIndex(die=>!die.locked&&die.value!==null&&Math.abs(die.value-next.attack.face)===1);
          if(index!==-1){
            const amount=precisionDamage();next.dice[index].locked=true;next.attack.hits++;
            next.attack.currentRollNewHits=1;next.attack.damage+=amount;next.attack.precisionUses++;
            next.attack.firstRoll=false;retireWildcard();
            emit('HitsResolved',{seat:next.turn.currentSeat,kind:'precision',newHits:1,totalHits:next.attack.hits,
              damage:next.attack.damage});
            if(next.dice.every(die=>die.locked)) dealAttackDamage();else decision('roll_attack','attack_continue');
            return;
          }
        }
        retireWildcard();
        if(next.attack.hits>0){dealAttackDamage();return;}
        if(R.hasAbility(next,2)&&R.mastery(next,1)) applyHeal(next.turn.currentSeat,2,'borrowing_life');
        if(next.attack.source==='gambling'&&R.hasAbility(next,12)&&!next.special.gambling.retryUsed){
          next.special.gambling.retryPending=true;decision('gambling_retry_offer','gamble_retry_offer');return;
        }
        setTurnDone('attack_missed');return;
      }
      next.attack.firstRoll=false;retireWildcard();
      if(next.dice.every(die=>die.locked)) dealAttackDamage();else decision('roll_attack','attack_continue');
    };
    const counterDamagePerHit=seat=>{
      let damage=R.hasAbility(next,1,seat)?3:1;
      damage+=stackingDamageBonus(seat,next.counter.context?.bloodRushActive===true);
      return damage;
    };
    const finalizeCounter=()=>{
      const context=next.counter.context,defenderSeat=context.defenderSeat,attackerSeat=context.attackerSeat;
      const defender=R.player(next,defenderSeat),attacker=R.player(next,attackerSeat);
      const perfectParry=R.mastery(next,2)&&R.hasAbility(next,21,defenderSeat)&&next.counter.dice.every(die=>die.value===1);
      if(perfectParry){
        const restoreTo=Math.max(defender.hp,context.restoreHp||defender.hp),restored=restoreTo-defender.hp;
        defender.hp=restoreTo;if(restored>0) emit('Healed',{seat:defenderSeat,amount:restored,source:'perfect_parry'});
        if(context.lastStandTriggered){defender.effects.lastStandUsed=false;defender.effects.lastStandCooldown=0;}
      }
      let raw=next.counter.hits*counterDamagePerHit(defenderSeat);
      if(R.hasAbility(next,24,defenderSeat)){
        if(next.counter.hits===2) raw+=4;
        else if(next.counter.hits===1&&R.mastery(next,1)) raw+=R.mastery(next,2)?3:2;
      }
      if(R.hasAbility(next,9,defenderSeat)&&R.mastery(next,2)&&defender.hp<=5&&defender.hp>0) raw+=6-defender.hp;
      if(R.hasAbility(next,25,defenderSeat)&&R.mastery(next,2)&&R.uniqueUnderdog(next,defenderSeat)&&next.counter.hits>0)
        raw+=Math.max(0,Math.floor(next.counter.hits*1.5)-next.counter.hits);
      let actual=0;
      if(raw>0&&attacker.hp>0){
        const result=applyDamageToSeat(attackerSeat,raw,defenderSeat,'counterattack',true);actual=result.lost;
        if(R.hasAbility(next,2,defenderSeat)&&actual>0)
          applyHeal(defenderSeat,Math.floor(actual/2)+(R.mastery(next,2)?3:0),'counter_lifesteal');
        if(attacker.hp<=0) markEliminated(attackerSeat);
      }
      emit('CounterattackResolved',{defenderSeat,attackerSeat,hits:next.counter.hits,damage:actual});
      next.counter.context=null;next.counter.dice=freshDice();next.counter.hits=0;next.counter.firstRoll=true;
      if(blockDraft('finish_attack')) return;
      setTurnDone('counterattack_complete');
    };
    const rollCounter=()=>{
      const context=next.counter.context,seat=context.defenderSeat,random=requireRandom(),indices=[],values=[];
      next.counter.dice.forEach((die,index)=>{if(!die.locked) indices.push(index);});
      let newHits=0;
      for(const index of indices){
        const value=R.rollDie(next,random,seat);values.push(value);next.counter.dice[index]={value,locked:false,selected:false};
        if(value===1||(value===2&&R.hasAbility(next,1,seat))){next.counter.dice[index].locked=true;next.counter.hits++;newHits++;}
      }
      healTwelveCounter(seat,values);
      emit('AttackRolled',{seat,kind:'counterattack',indices,values});
      emit('HitsResolved',{seat,kind:'counterattack',newHits,totalHits:next.counter.hits,
        damage:next.counter.hits*counterDamagePerHit(seat)});
      if(newHits===0||next.counter.dice.every(die=>die.locked)){finalizeCounter();return;}
      next.counter.firstRoll=false;decision('counterattack','counterattack',seat);
    };
    const clearCombatState=()=>{
      next.dice=freshDice();
      next.base={rerollUsed:false,luckRerollIndex:null,luckRerollSecondUsed:false,luckRerollUses:0,
        loadedDiceUsed:false,loadedDiceUses:0,lastRollIndices:[]};
      next.attack={face:null,targetSeat:null,hits:0,damage:0,firstRoll:true,currentRollNewHits:0,rollCount:0,
        masteryRollCount:0,normalHits:0,exactFaceHits:0,wildcardHits:0,lastRollIndices:[],powerUsed:false,
        powerUses:0,precisionUses:0,momentumBonus:0,bloodPriceNeighbors:[],bloodPricePaidThisRoll:0,
        bloodPriceWasPreActivatedThisRoll:false,bloodRushActive:false,doubleTapApplied:false,wildcardFace:null,
        wildcardSecondRollArmed:false,wildcardTriggered:false,masteryL2BonusesApplied:false,source:'normal',baseTotal:null};
      next.counter={context:null,pending:null,dice:freshDice(),hits:0,firstRoll:true};
      next.special={gambling:{baseTotal:null,retryUsed:false,retryPending:false},
        perfect25:{baseTotal:null,pendingTotal:null},highStakes:{decisionMade:false,rawDamage:null},insurance:null};
    };
    const prepareTurnEffects=seat=>{
      const active=R.player(next,seat);
      if(R.hasAbility(next,14,seat)&&R.mastery(next,2)&&active.effects.lastStandCooldown>0){
        active.effects.lastStandCooldown=Math.max(0,active.effects.lastStandCooldown-1);
        if(active.effects.lastStandCooldown===0) active.effects.lastStandUsed=false;
      }
      active.effects.bloodRushPrimed=!!active.effects.damageSinceLastOwnTurn ||
        (R.hasAbility(next,23,seat)&&R.mastery(next,1)&&!!active.effects.selfDamageSinceLastOwnTurn);
      active.effects.damageSinceLastOwnTurn=false;active.effects.selfDamageSinceLastOwnTurn=false;
      active.effects.voluntaryHpPaidThisTurn=false;active.effects.snakeEyesUsesThisTurn=0;
      active.effects.underdogTurnActive=false;
      if(R.hasAbility(next,25,seat)&&R.mastery(next,1)){
        const alive=next.players.filter(entry=>entry.hp>0);
        active.effects.underdogTurnActive=alive.length>=2&&alive.every(entry=>entry.seat===seat||active.hp<=entry.hp);
      }
    };
    const finishRoundIfNeeded=()=>{
      const alive=next.players.filter(entry=>entry.hp>0);
      if(alive.length>1) return false;
      const winner=alive[0]||null;
      if(winner) winner.roundsWon++;
      next.round.winnerSeat=winner?.seat??null;
      next.round.result={winnerSeat:winner?.seat??null,reason:winner?'last_alive':'draw'};
      next.draft.active=null;next.draft.queue=[];next.draft.continuation=null;
      emit('RoundEnded',{roundNumber:next.round.number,winnerSeat:next.round.winnerSeat,reason:next.round.result.reason});
      decision('prepare_round','round_preparation',winner?.seat??next.turn.currentSeat);
      return true;
    };
    const applyPoisonTurnStart=seat=>{
      const active=R.player(next,seat);
      if(!active||active.hp<=0||active.effects.poisonTurns<=0) return true;
      const sourceSeat=active.effects.poisonSourceSeat;
      const result=applyDamageToSeat(seat,3,sourceSeat,'poison',true);
      active.effects.poisonTurns=Math.max(0,active.effects.poisonTurns-1);
      if(active.effects.poisonTurns===0) active.effects.poisonSourceSeat=null;
      emit('PoisonTicked',{sourceSeat,targetSeat:seat,amount:result.lost,turnsLeft:active.effects.poisonTurns});
      if(active.hp>0) return true;
      triggerToxicBomb(seat);markEliminated(seat);
      if(sourceSeat!==null) enqueueDraft(sourceSeat,'kill');
      return false;
    };
    const advanceTurn=()=>{
      let fromSeat=next.turn.currentSeat;
      for(let skipped=0;skipped<next.players.length;skipped++){
        const seat=R.nextAliveSeat(next,fromSeat);
        if(seat===null){finishRoundIfNeeded();return;}
        next.turn.currentSeat=seat;
        if(!applyPoisonTurnStart(seat)){
          if(finishRoundIfNeeded()) return;
          fromSeat=seat;continue;
        }
        next.turn.number++;clearCombatState();prepareTurnEffects(seat);
        next.turn.phase='idle';next.turn.decision={kind:'roll_base',seat};
        emit('TurnStarted',{seat,turnNumber:next.turn.number});
        if(next.draft.queue.length) blockDraft(null);
        else emit('DecisionRequired',{seat,kind:'roll_base'});
        return;
      }
      finishRoundIfNeeded();
    };
    const continueRoundPreparation=()=>{
      const pending=next.round.preparation.find(entry=>!entry.ready&&entry.freeChoices>0);
      if(pending){decision('choose_start_abilities','round_preparation',pending.seat);return;}
      decision('start_round','round_preparation',next.round.lastPlaceSeat??next.turn.currentSeat);
    };
    const prepareRound=()=>{
      const rules=D.LOCAL_MODES[next.modeId],random=requireRandom();
      next.round.preparation=next.players.map(active=>{
        const isLast=active.seat===next.round.lastPlaceSeat&&active.seat!==next.round.winnerSeat;
        if(next.modeId==='classic'){
          if(isLast) return {seat:active.seat,roll:null,abilities:[],freeChoices:1,ready:false};
          const roll=Math.floor(random()*25)+1;
          return roll===6?{seat:active.seat,roll,abilities:[],freeChoices:1,ready:false}:
            {seat:active.seat,roll,abilities:[roll],freeChoices:0,ready:true};
        }
        const freeChoices=isLast?Math.min(rules.lastPlaceFreeChoices,rules.startAbilityCount):0;
        if(freeChoices>0) return {seat:active.seat,roll:null,abilities:[],freeChoices,ready:false};
        return {seat:active.seat,roll:null,abilities:randomAbilities(rules.startAbilityCount,[],random),freeChoices:0,ready:true};
      });
      emit('RoundPreparationStarted',{roundNumber:next.round.number+1,
        entries:next.round.preparation.map(entry=>({seat:entry.seat,roll:entry.roll,freeChoices:entry.freeChoices}))});
      continueRoundPreparation();
    };
    const chooseStartAbilities=()=>{
      const rules=D.LOCAL_MODES[next.modeId],entry=next.round.preparation.find(item=>item.seat===action.seat);
      entry.abilities=action.abilities.slice();
      const missing=rules.startAbilityCount-entry.abilities.length;
      if(missing>0) entry.abilities.push(...randomAbilities(missing,entry.abilities));
      entry.ready=true;
      emit('StartAbilitiesChosen',{seat:entry.seat,abilities:entry.abilities.slice(),freeChoices:entry.freeChoices});
      continueRoundPreparation();
    };
    const startRound=()=>{
      const random=requireRandom(),starter=next.round.lastPlaceSeat??next.players[0].seat;
      for(let i=next.players.length-1;i>0;i--){
        const j=Math.floor(random()*(i+1));
        [next.players[i],next.players[j]]=[next.players[j],next.players[i]];
      }
      for(const active of next.players){
        const entry=next.round.preparation.find(item=>item.seat===active.seat);
        active.hp=D.LOCAL_MODES[next.modeId].startHp;active.maxHp=active.hp;active.abilities=entry.abilities.slice();
        active.bonusAbilityUnlocked=D.LOCAL_MODES[next.modeId].bonusSlot!==null&&
          active.abilities.length>=D.LOCAL_MODES[next.modeId].bonusSlot;
        active.effects={momentumStreak:0,lastStandUsed:false,lastStandCooldown:0,damageSinceLastOwnTurn:false,
          bloodRushPrimed:false,voluntaryHpPaidThisTurn:false,selfDamageSinceLastOwnTurn:false,
          underdogTurnActive:false,poisonTurns:0,poisonSourceSeat:null,healEffectCount:0,snakeEyesUsesThisTurn:0};
      }
      next.round.number++;next.round.eliminationOrder=[];next.round.lastPlaceSeat=null;next.round.winnerSeat=null;
      next.round.result=null;next.round.preparation=[];next.draft={active:null,queue:[],continuation:null};
      next.turn.number=1;next.turn.currentSeat=starter;clearCombatState();prepareTurnEffects(starter);
      next.turn.phase='idle';next.turn.decision={kind:'roll_base',seat:starter};
      emit('RoundStarted',{roundNumber:next.round.number,startingSeat:starter,seatOrder:next.players.map(entry=>entry.seat)});
      emit('DecisionRequired',{seat:starter,kind:'roll_base'});
    };
    const resolveDraft=()=>{
      const activeDraft=next.draft.active,active=R.player(next,activeDraft.seat);
      active.abilities.push(action.abilityId);next.draft.active=null;
      emit('AbilityChosen',{seat:active.seat,slot:activeDraft.slot,abilityId:action.abilityId,trigger:activeDraft.trigger});
      if(next.draft.queue.length){openQueuedDraft();return;}
      const continuation=next.draft.continuation;next.draft.continuation=null;
      if(continuation==='finish_base'){
        afterSelfDamage(next.attack.baseTotal,next.attack.source==='advance'?'advance24':'finish');return;
      }
      if(continuation==='start_counter'){
        const context=next.counter.pending;next.counter.pending=null;startCounter(context);return;
      }
      if(continuation==='finish_attack'){setTurnDone('attack_complete');return;}
      decision('roll_base','idle',next.turn.currentSeat);
    };

    if(action.type===A.ROLL_BASE){
      const random=requireRandom(),indices=R.unlockedIndices(next),values=[];
      if(state.turn.phase==='idle') emit('TurnStarted',{seat:next.turn.currentSeat,turnNumber:next.turn.number});
      for(const index of indices){const value=R.rollDie(next,random);next.dice[index]={value,locked:false,selected:false};values.push(value);}
      next.base.lastRollIndices=indices;emit('DiceRolled',{seat:next.turn.currentSeat,kind:'base',indices,values});
      healTwelveBase(indices,'twelve_base');decision('select_base','base_select');
    }else if(action.type===A.TOGGLE_BASE_DIE){
      next.dice[action.index].selected=!next.dice[action.index].selected;
    }else if(action.type===A.LOCK_SELECTED){
      const indices=R.selectedIndices(next);
      for(const index of indices){next.dice[index].locked=true;next.dice[index].selected=false;}
      emit('DiceLocked',{seat:next.turn.currentSeat,indices});
      if(next.dice.every(die=>die.locked)) resolveBase();else decision('roll_base','base_ready');
    }else if(action.type===A.USE_LUCK_REROLL){
      const candidate=R.luckCandidate(next),random=requireRandom();
      if(candidate.repeated) next.base.luckRerollSecondUsed=true;
      else{next.base.luckRerollUses++;next.base.rerollUsed=true;next.base.luckRerollIndex=candidate.index;next.base.luckRerollSecondUsed=false;}
      let value=1;while(value===1) value=R.rollDie(next,random);
      next.dice[candidate.index].value=value;next.base.lastRollIndices=[candidate.index];
      emit('DiceRolled',{seat:next.turn.currentSeat,kind:'luck',indices:[candidate.index],values:[value]});
      decision('select_base','base_select');
    }else if(action.type===A.USE_LOADED_DICE){
      const index=R.selectedIndices(next)[0],active=R.player(next),before=next.dice[index].value;
      const cost=R.mastery(next,2)&&next.base.loadedDiceUses===1?1:2;
      next.base.loadedDiceUses++;next.base.loadedDiceUsed=next.base.loadedDiceUses>=(R.mastery(next,1)?2:1);next.dice[index].value=5;
      const result=applyDamageToSeat(active.seat,cost,active.seat,'loaded_dice');markSelfDamage(active.seat,result.lost,true);
      emit('DieChanged',{seat:active.seat,index,from:before,to:5,source:'loaded_dice'});
    }else if(action.type===A.USE_SNAKE_EYES){
      if(next.turn.phase==='attack_after_roll') useAttackSnakeEyes();
      else{
        const group=R.snakeEyesGroup(next),random=requireRandom(),values=[];
        for(const index of group.indices){const value=R.rollDie(next,random);next.dice[index]={value,locked:false,selected:false};values.push(value);}
        next.base.lastRollIndices=group.indices.slice();R.player(next).effects.snakeEyesUsesThisTurn++;
        emit('DiceRolled',{seat:next.turn.currentSeat,kind:'snake_eyes',indices:group.indices.slice(),values});
        healTwelveBase(group.indices,'twelve_snake_eyes');decision('select_base','base_select');
      }
    }else if(action.type===A.ROLL_INSURANCE){
      const random=requireRandom(),roll=R.rollDie(next,random),context=next.special.insurance;
      const reduced=roll>=(R.mastery(next,1)?4:5),full=roll===6&&R.mastery(next,2);
      const damage=full?0:(reduced?Math.floor(context.rawDamage/2):context.rawDamage);
      emit('DiceRolled',{seat:next.turn.currentSeat,kind:'insurance',indices:[],values:[roll]});
      emit('InsuranceResolved',{seat:next.turn.currentSeat,roll,rawDamage:context.rawDamage,damage});next.special.insurance=null;
      const active=R.player(next),result=applyDamageToSeat(active.seat,damage,active.seat,'base_insurance');
      markSelfDamage(active.seat,result.lost,false);if(!blockDraft('finish_base')) afterSelfDamage(context.total,context.afterMode);
    }else if(action.type===A.USE_BLOOD_PRICE){
      const active=R.player(next),post=next.turn.phase==='attack_after_roll',cost=post?5:3,neighbors=[];
      if(next.attack.face>1) neighbors.push(next.attack.face-1);if(next.attack.face<6) neighbors.push(next.attack.face+1);
      const result=applyDamageToSeat(active.seat,cost,active.seat,post?'blood_credit':'blood_price');
      markSelfDamage(active.seat,result.lost,true);emit('AbilityActivated',{seat:active.seat,abilityId:11});
      if(post){
        let added=0;
        for(const index of next.attack.lastRollIndices){
          const die=next.dice[index];if(!die||die.locked||!neighbors.includes(die.value)) continue;
          die.locked=true;next.attack.hits++;next.attack.currentRollNewHits++;next.attack.damage+=damagePerAttackHit();added++;
        }
        activateBloodRushMid();emit('HitsResolved',{seat:active.seat,kind:'blood_credit',newHits:added,
          totalHits:next.attack.hits,damage:next.attack.damage});decision('resolve_attack','attack_after_roll');
      }else{
        next.attack.bloodPriceNeighbors=neighbors;next.attack.bloodPricePaidThisRoll=result.lost;activateBloodRushMid();
      }
    }else if(action.type===A.CHOOSE_ATTACK_TARGET){
      next.attack.targetSeat=action.targetSeat;emit('AttackTargetSelected',{seat:next.turn.currentSeat,targetSeat:action.targetSeat});
      startAttackAfterTarget();
    }else if(action.type===A.ROLL_ATTACK){
      rollAttack();
    }else if(action.type===A.USE_ATTACK_POWER){
      useAttackPower();
    }else if(action.type===A.CONTINUE_DOUBLE_TAP){
      next.attack.firstRoll=false;retireWildcard();rollAttack();
    }else if(action.type===A.RESOLVE_ATTACK){
      resolveAttackRoll();
    }else if(action.type===A.USE_BLOOD_RUSH_SELF_HARM){
      const active=R.player(next),result=applyDamageToSeat(active.seat,1,active.seat,'blood_rush_self_harm');
      markSelfDamage(active.seat,result.lost,true);activateBloodRushMid();
    }else if(action.type===A.ROLL_COUNTERATTACK){
      rollCounter();
    }else if(action.type===A.ROLL_GAMBLING){
      const random=requireRandom(),retry=next.turn.phase==='gamble_retry';
      let roll=R.rollDie(next,random);
      if(R.mastery(next,2)) while(roll===1) roll=R.rollDie(next,random);
      const total=next.special.gambling.baseTotal;
      next.special.gambling.retryPending=false;
      if(retry) next.special.gambling.retryUsed=true;
      emit('SpecialDieRolled',{seat:next.turn.currentSeat,kind:retry?'gambling_retry':'gambling',sides:6,value:roll});
      prepareAttack(roll,total,'gambling');
    }else if(action.type===A.ACCEPT_GAMBLING_RETRY){
      next.special.gambling.retryPending=true;decision('gambling_retry','gamble_retry');
    }else if(action.type===A.DECLINE_GAMBLING_RETRY){
      next.special.gambling.retryPending=false;next.special.gambling.retryUsed=true;
      setTurnDone('gambling_retry_declined');
    }else if(action.type===A.ROLL_PERFECT25){
      const roll=R.rollDie(next,requireRandom()),threshold=R.mastery(next,2)?2:(R.mastery(next,1)?3:4);
      emit('SpecialDieRolled',{seat:next.turn.currentSeat,kind:'perfect25_permit',sides:6,value:roll});
      if(roll<threshold){
        next.special.perfect25.baseTotal=null;setTurnDone('perfect25_denied');
      }else decision('perfect25_d4','perfect25_d4');
    }else if(action.type===A.ROLL_PERFECT25_D4){
      const roll=Math.floor(requireRandom()()*4)+1,total=next.special.perfect25.baseTotal;
      next.special.perfect25.baseTotal=null;
      emit('SpecialDieRolled',{seat:next.turn.currentSeat,kind:'perfect25_attack',sides:4,value:roll});
      prepareAttack(roll,total,'perfect25');
    }else if(action.type===A.SKIP_HIGH_STAKES){
      next.special.highStakes.decisionMade=true;next.special.highStakes.rawDamage=null;
      emit('HighStakesResolved',{seat:next.turn.currentSeat,skipped:true,damage:next.attack.damage});
      finalizeAttackDamage();
    }else if(action.type===A.ROLL_HIGH_STAKES){
      const roll=R.rollDie(next,requireRandom()),before=next.special.highStakes.rawDamage;
      if(roll<=2 || (roll===3&&!R.mastery(next,1))) next.attack.damage=Math.floor(before*.5);
      else if(roll===3) next.attack.damage=before;
      else next.attack.damage=Math.floor(before*((roll===6&&R.mastery(next,2))?1.75:1.5));
      next.special.highStakes.decisionMade=true;next.special.highStakes.rawDamage=null;
      emit('SpecialDieRolled',{seat:next.turn.currentSeat,kind:'high_stakes',sides:6,value:roll});
      emit('HighStakesResolved',{seat:next.turn.currentSeat,skipped:false,roll,before,damage:next.attack.damage});
      finalizeAttackDamage();
    }else if(action.type===A.CHOOSE_ABILITY){
      resolveDraft();
    }else if(action.type===A.END_TURN){
      if(!finishRoundIfNeeded()) advanceTurn();
    }else if(action.type===A.PREPARE_ROUND){
      prepareRound();
    }else if(action.type===A.CHOOSE_START_ABILITIES){
      chooseStartAbilities();
    }else if(action.type===A.START_ROUND){
      startRound();
    }

    const outputValidation=engine.validateState(next);
    if(!outputValidation.valid) throw new Error('Reducer erzeugte ungueltigen Zustand: '+outputValidation.errors.map(e=>e.path).join(', '));
    return {state:next,events};
  }

  engine.reduce=reduce;
})(globalThis);
