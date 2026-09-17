// DOM-freier Reducer fuer die Basisphase. Automatische Folgen enden an der
// naechsten echten Spielerentscheidung.
(function(root){
  'use strict';
  const engine=root.WDEngine;
  if(!engine?.actions || !engine?.baseRules)
    throw new Error('Basisregeln muessen vor dem Reducer geladen werden');
  const A=engine.actions,R=engine.baseRules;

  function reject(state,reason){return {state,events:[],rejected:true,reason};}
  function actionReason(state,action){
    if(!action || typeof action!=='object' || Array.isArray(action)) return 'Aktion muss ein Objekt sein';
    if(typeof action.type!=='string') return 'Aktionstyp fehlt';
    if(!Number.isInteger(action.seat) || action.seat!==state.turn.currentSeat) return 'Falscher Aktionsinhaber';
    if(!Object.values(A).includes(action.type)) return 'Unbekannter Aktionstyp';
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
      if(phase!=='base_select') return 'Snake Eyes ist in dieser Phase nicht erlaubt';
      if(!R.hasAbility(state,20)) return 'Snake Eyes ist nicht vorhanden';
      if(!R.snakeEyesGroup(state)) return 'Kein Snake-Eyes-Drilling im letzten Wurf';
    }
    if(action.type===A.ROLL_INSURANCE){
      if(phase!=='insurance' || !state.special.insurance) return 'Insurance ist in dieser Phase nicht erlaubt';
      if(!R.hasAbility(state,19)) return 'Insurance ist nicht vorhanden';
    }
    if(action.type===A.USE_BLOOD_PRICE){
      if(!['attack_ready','attack_continue'].includes(phase)) return 'Blutpreis ist in dieser Phase nicht erlaubt';
      if(!R.hasAbility(state,11)) return 'Blutpreis ist nicht vorhanden';
      if(state.attack.bloodPriceNeighbors.length) return 'Blutpreis ist fuer diesen Wurf bereits aktiv';
      if(R.player(state).hp<=3) return 'Nicht genug HP fuer Blutpreis';
    }
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
    const decision=(kind,phase=next.turn.phase,seat=next.turn.currentSeat)=>{
      next.turn.phase=phase;next.turn.decision={kind,seat};
      emit('DecisionRequired',{seat,kind});
    };
    const markSelfDamage=(amount,voluntary=false)=>{
      if(amount<=0) return;
      const active=R.player(next);
      if(R.mastery(next,1) && R.hasAbility(next,23)) active.effects.selfDamageSinceLastOwnTurn=true;
      if(voluntary) active.effects.voluntaryHpPaidThisTurn=true;
    };
    const applyDamage=(amount,source)=>{
      const active=R.player(next),before=active.hp;
      let lastStand=false;
      if(amount>=before && R.hasAbility(next,14) && !active.effects.lastStandUsed){
        active.hp=1;active.effects.lastStandUsed=true;lastStand=true;
        if(R.mastery(next,2)) active.effects.lastStandCooldown=3;
      }else active.hp=Math.max(0,before-amount);
      const lost=before-active.hp;
      markSelfDamage(lost,false);
      if(lost>0) emit('DamageApplied',{sourceSeat:active.seat,targetSeat:active.seat,amount:lost,source});
      if(lastStand) emit('LastStandTriggered',{seat:active.seat,hp:active.hp});
      return lost;
    };
    const healTwelve=(indices,source)=>{
      const active=R.player(next);
      if(!R.hasAbility(next,22)) return;
      const sixes=indices.filter(index=>next.dice[index].value===6).length;
      if(sixes<2) return;
      const wanted=R.mastery(next,1)&&sixes>=3?2:1;
      const amount=Math.min(wanted,active.maxHp-active.hp);
      if(R.mastery(next,1)) active.effects.healEffectCount++;
      if(amount>0){active.hp+=amount;emit('Healed',{seat:active.seat,amount,source});}
    };
    const readyAttack=(face,total,source)=>{
      const targetSeat=R.nextAliveSeat(next);
      if(targetSeat===null){
        next.turn.phase='turn_done';next.turn.decision={kind:'end_turn',seat:next.turn.currentSeat};
        emit('TurnEnded',{seat:next.turn.currentSeat,reason:'no_target'});
        emit('DecisionRequired',{seat:next.turn.currentSeat,kind:'end_turn'});
        return;
      }
      next.attack.face=face;next.attack.targetSeat=targetSeat;next.attack.baseTotal=total;next.attack.source=source;
      const active=R.player(next);
      if(R.hasAbility(next,23) && (active.effects.bloodRushPrimed || active.effects.voluntaryHpPaidThisTurn)){
        next.attack.bloodRushActive=true;
        active.effects.bloodRushPrimed=false;active.effects.voluntaryHpPaidThisTurn=false;
      }
      next.turn.phase='attack_ready';next.turn.decision={kind:'roll_attack',seat:next.turn.currentSeat};
      emit('AttackReadied',{seat:next.turn.currentSeat,targetSeat,face,total,source});
      emit('DecisionRequired',{seat:next.turn.currentSeat,kind:'roll_attack'});
    };
    const endBase=reasonValue=>{
      next.turn.phase='turn_done';next.turn.decision={kind:'end_turn',seat:next.turn.currentSeat};
      next.dice.forEach(die=>{die.selected=false;});
      emit('TurnEnded',{seat:next.turn.currentSeat,reason:reasonValue});
      emit('DecisionRequired',{seat:next.turn.currentSeat,kind:'end_turn'});
    };
    const afterSelfDamage=(total,afterMode)=>{
      if(R.player(next).hp<=0){endBase('eliminated');return;}
      if(afterMode==='advance24') readyAttack(1,total,'advance');
      else endBase('base_self_damage');
    };
    const damageOrInsurance=(total,rawDamage,afterMode)=>{
      if(R.hasAbility(next,19)){
        next.special.insurance={total,rawDamage,afterMode};
        decision('insurance','insurance');
      }else{
        applyDamage(rawDamage,'base');
        afterSelfDamage(total,afterMode);
      }
    };
    const resolveBase=()=>{
      const total=R.baseTotal(next),advance=R.hasAbility(next,5);
      emit('BaseResolved',{seat:next.turn.currentSeat,total});
      if(total===24 && advance && R.mastery(next,1)){
        damageOrInsurance(total,1,'advance24');return;
      }
      if(total<25){
        const active=R.player(next);
        if(R.hasAbility(next,10)) active.effects.momentumStreak=R.mastery(next,1)?Math.max(0,active.effects.momentumStreak-1):0;
        next.attack.momentumBonus=0;
        damageOrInsurance(total,25-total,'finish');return;
      }
      if(total===25 && !advance && R.hasAbility(next,15)){
        next.special.perfect25.baseTotal=total;decision('perfect25','perfect25');return;
      }
      const threshold=advance?25:26;
      if(total<threshold){endBase('exact_25');return;}
      if(R.hasAbility(next,12) && total>25){
        next.special.gambling.baseTotal=total;decision('gambling','gamble_attack');return;
      }
      readyAttack(advance?total-24:total-25,total,advance?'advance':'normal');
    };

    if(action.type===A.ROLL_BASE){
      const random=requireRandom(),indices=R.unlockedIndices(next),values=[];
      if(state.turn.phase==='idle') emit('TurnStarted',{seat:next.turn.currentSeat,turnNumber:next.turn.number});
      for(const index of indices){
        const value=R.rollDie(next,random);next.dice[index]={value,locked:false,selected:false};values.push(value);
      }
      next.base.lastRollIndices=indices;
      emit('DiceRolled',{seat:next.turn.currentSeat,kind:'base',indices,values});
      healTwelve(indices,'twelve_base');
      decision('select_base','base_select');
    }else if(action.type===A.TOGGLE_BASE_DIE){
      next.dice[action.index].selected=!next.dice[action.index].selected;
    }else if(action.type===A.LOCK_SELECTED){
      const indices=R.selectedIndices(next);
      for(const index of indices){next.dice[index].locked=true;next.dice[index].selected=false;}
      emit('DiceLocked',{seat:next.turn.currentSeat,indices});
      if(next.dice.every(die=>die.locked)) resolveBase();
      else decision('roll_base','base_ready');
    }else if(action.type===A.USE_LUCK_REROLL){
      const candidate=R.luckCandidate(next),random=requireRandom();
      if(candidate.repeated) next.base.luckRerollSecondUsed=true;
      else{
        next.base.luckRerollUses++;next.base.rerollUsed=true;next.base.luckRerollIndex=candidate.index;
        next.base.luckRerollSecondUsed=false;
      }
      let value=1;
      while(value===1) value=R.rollDie(next,random);
      next.dice[candidate.index].value=value;
      next.base.lastRollIndices=[candidate.index];
      emit('DiceRolled',{seat:next.turn.currentSeat,kind:'luck',indices:[candidate.index],values:[value]});
      decision('select_base','base_select');
    }else if(action.type===A.USE_LOADED_DICE){
      const index=R.selectedIndices(next)[0],active=R.player(next);
      const before=next.dice[index].value,cost=R.mastery(next,2)&&next.base.loadedDiceUses===1?1:2;
      next.base.loadedDiceUses++;next.base.loadedDiceUsed=next.base.loadedDiceUses>=(R.mastery(next,1)?2:1);
      next.dice[index].value=5;
      active.hp-=cost;markSelfDamage(cost,true);
      emit('DamageApplied',{sourceSeat:active.seat,targetSeat:active.seat,amount:cost,source:'loaded_dice'});
      emit('DieChanged',{seat:active.seat,index,from:before,to:5,source:'loaded_dice'});
    }else if(action.type===A.USE_SNAKE_EYES){
      const group=R.snakeEyesGroup(next),random=requireRandom(),values=[];
      for(const index of group.indices){
        const value=R.rollDie(next,random);next.dice[index]={value,locked:false,selected:false};values.push(value);
      }
      next.base.lastRollIndices=group.indices.slice();R.player(next).effects.snakeEyesUsesThisTurn++;
      emit('DiceRolled',{seat:next.turn.currentSeat,kind:'snake_eyes',indices:group.indices.slice(),values});
      healTwelve(group.indices,'twelve_snake_eyes');
      decision('select_base','base_select');
    }else if(action.type===A.ROLL_INSURANCE){
      const random=requireRandom(),roll=R.rollDie(next,random),context=next.special.insurance;
      const reduced=roll>=(R.mastery(next,1)?4:5),full=roll===6&&R.mastery(next,2);
      const damage=full?0:(reduced?Math.floor(context.rawDamage/2):context.rawDamage);
      emit('DiceRolled',{seat:next.turn.currentSeat,kind:'insurance',indices:[],values:[roll]});
      emit('InsuranceResolved',{seat:next.turn.currentSeat,roll,rawDamage:context.rawDamage,damage});
      next.special.insurance=null;
      applyDamage(damage,'base_insurance');
      afterSelfDamage(context.total,context.afterMode);
    }else if(action.type===A.USE_BLOOD_PRICE){
      const active=R.player(next),neighbors=[];
      if(next.attack.face>1) neighbors.push(next.attack.face-1);
      if(next.attack.face<6) neighbors.push(next.attack.face+1);
      active.hp-=3;markSelfDamage(3,true);
      next.attack.bloodPriceNeighbors=neighbors;next.attack.bloodPricePaidThisRoll=3;
      emit('DamageApplied',{sourceSeat:active.seat,targetSeat:active.seat,amount:3,source:'blood_price'});
      emit('AbilityActivated',{seat:active.seat,abilityId:11});
      if(R.hasAbility(next,23) && !next.attack.bloodRushActive){
        next.attack.bloodRushActive=true;active.effects.bloodRushPrimed=false;active.effects.voluntaryHpPaidThisTurn=false;
      }
    }

    const outputValidation=engine.validateState(next);
    if(!outputValidation.valid) throw new Error('Reducer erzeugte ungueltigen Zustand: '+outputValidation.errors.map(e=>e.path).join(', '));
    return {state:next,events};
  }

  engine.reduce=reduce;
})(globalThis);
